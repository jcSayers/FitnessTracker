import { Injectable, signal } from '@angular/core';

/**
 * Interface for tracking individual sync operations
 */
export interface SyncOperation {
  id: string;
  timestamp: number;
  type: 'batch' | 'full_sync' | 'item_sync';
  status: 'started' | 'completed' | 'failed';
  queueSizeBefore: number;
  queueSizeAfter?: number;
  itemsProcessed?: number;
  duration?: number;
  error?: string;
}

/**
 * Interface for queue state snapshots
 */
export interface QueueSnapshot {
  timestamp: number;
  totalItems: number;
  byType: {
    template: number;
    instance: number;
    log: number;
  };
  byOperation: {
    create: number;
    update: number;
    delete: number;
  };
  duplicateRecordIds: string[]; // Records appearing multiple times in queue
}

/**
 * Interface for anomaly alerts
 */
export interface AnomalyAlert {
  id: string;
  timestamp: number;
  severity: 'warning' | 'critical';
  type: 'queue_growth' | 'duplicate_items' | 'rapid_retries' | 'high_failure_rate' | 'stuck_items';
  message: string;
  data: any;
}

/**
 * Comprehensive diagnostics service for sync operations
 * Provides logging, monitoring, and anomaly detection
 */
@Injectable({
  providedIn: 'root'
})
export class SyncDiagnosticsService {
  // Configuration
  private maxQueueSize = 1000;
  private alertThresholds = {
    queueGrowthPercentage: 30, // Alert if queue grows > 30% in one sync
    maxConsecutiveFailures: 3,
    rapidRetryWindow: 5000, // ms - warn if retry happens within this window
    stuckItemDuration: 300000 // ms - 5 minutes, item stuck if not synced
  };

  // Tracking signals
  operations = signal<SyncOperation[]>([]);
  queueSnapshots = signal<QueueSnapshot[]>([]);
  anomalies = signal<AnomalyAlert[]>([]);
  metrics = signal({
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    averageSyncDuration: 0,
    totalItemsSynced: 0
  });

  // Internal tracking
  private lastQueueSnapshot: QueueSnapshot | null = null;
  private lastSyncAttempt = 0;
  private consecutiveFailures = 0;
  private itemLastSeenTime = new Map<string, number>(); // Track when items were last seen in queue

  constructor() {
    this.logInitialization();
  }

  /**
   * Log sync operation start
   */
  logSyncStart(type: 'batch' | 'full_sync' | 'item_sync', queueSize: number): string {
    const operationId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const operation: SyncOperation = {
      id: operationId,
      timestamp: Date.now(),
      type,
      status: 'started',
      queueSizeBefore: queueSize
    };

    const ops = this.operations();
    ops.push(operation);
    this.operations.set([...ops]);

    console.log(`[SyncDiagnostics] ${type} started | Queue size: ${queueSize}`, operation);
    return operationId;
  }

  /**
   * Log sync operation completion
   */
  logSyncComplete(
    operationId: string,
    itemsProcessed: number,
    queueSizeAfter: number,
    success: boolean
  ): void {
    const ops = this.operations();
    const operation = ops.find(op => op.id === operationId);

    if (operation) {
      const now = Date.now();
      operation.status = success ? 'completed' : 'failed';
      operation.itemsProcessed = itemsProcessed;
      operation.queueSizeAfter = queueSizeAfter;
      operation.duration = now - operation.timestamp;

      this.operations.set([...ops]);

      if (success) {
        this.consecutiveFailures = 0;
        this.updateMetrics(true, operation.duration, itemsProcessed);
      } else {
        this.consecutiveFailures++;
        this.updateMetrics(false, operation.duration, itemsProcessed);
      }

      console.log(
        `[SyncDiagnostics] ${operation.type} ${operation.status} | ` +
        `Duration: ${operation.duration}ms | Items: ${itemsProcessed} | ` +
        `Queue before: ${operation.queueSizeBefore} → after: ${queueSizeAfter}`,
        operation
      );

      // Check for anomalies after operation completes
      this.detectAnomalies(operation, queueSizeAfter);
    }
  }

  /**
   * Log sync error
   */
  logSyncError(operationId: string, error: Error | string): void {
    const ops = this.operations();
    const operation = ops.find(op => op.id === operationId);

    if (operation) {
      operation.status = 'failed';
      operation.error = error instanceof Error ? error.message : error;
      operation.duration = Date.now() - operation.timestamp;
      this.operations.set([...ops]);

      this.consecutiveFailures++;
      console.error(`[SyncDiagnostics] ${operation.type} failed:`, error, operation);

      // Log as anomaly
      this.addAnomaly('critical', 'high_failure_rate', `Sync failed: ${error}`, { operationId, error });
    }
  }

  /**
   * Capture queue state snapshot
   */
  captureQueueSnapshot(
    totalItems: number,
    byType: { template: number; instance: number; log: number },
    byOperation: { create: number; update: number; delete: number },
    allQueueItems: Array<{ recordId: string; [key: string]: any }>
  ): void {
    // Find duplicate record IDs
    const recordCounts = new Map<string, number>();
    for (const item of allQueueItems) {
      const count = recordCounts.get(item.recordId) || 0;
      recordCounts.set(item.recordId, count + 1);
    }
    const duplicateRecordIds = Array.from(recordCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([recordId, _]) => recordId);

    const snapshot: QueueSnapshot = {
      timestamp: Date.now(),
      totalItems,
      byType,
      byOperation,
      duplicateRecordIds
    };

    const snapshots = this.queueSnapshots();
    snapshots.push(snapshot);
    this.queueSnapshots.set(snapshots);

    this.lastQueueSnapshot = snapshot;

    // Log suspicious patterns
    if (duplicateRecordIds.length > 0) {
      console.warn(
        `[SyncDiagnostics] Found ${duplicateRecordIds.length} duplicate items in queue:`,
        duplicateRecordIds
      );
      this.addAnomaly('warning', 'duplicate_items', `Found duplicate items in queue`, {
        duplicateRecordIds,
        queueSize: totalItems
      });
    }

    console.log('[SyncDiagnostics] Queue snapshot:', snapshot);
  }

  /**
   * Track items in queue to detect stuck items
   */
  trackQueueItems(items: Array<{ recordId: string; dataType: string; [key: string]: any }>): void {
    const now = Date.now();

    // Update last seen time for current items
    for (const item of items) {
      const key = `${item.dataType}-${item.recordId}`;
      this.itemLastSeenTime.set(key, now);
    }

    // Check for stuck items (not synced after 5 minutes)
    const stuckItems: string[] = [];
    for (const [key, lastSeen] of this.itemLastSeenTime.entries()) {
      if (now - lastSeen > this.alertThresholds.stuckItemDuration) {
        stuckItems.push(key);
      }
    }

    if (stuckItems.length > 0) {
      console.warn('[SyncDiagnostics] Found stuck items in queue (not synced for 5+ minutes):', stuckItems);
      this.addAnomaly('warning', 'stuck_items', `Items stuck in queue for 5+ minutes`, {
        count: stuckItems.length,
        items: stuckItems
      });
    }
  }

  /**
   * Detect anomalies based on sync patterns
   */
  private detectAnomalies(operation: SyncOperation, queueSizeAfter: number): void {
    // Check for queue growth
    if (this.lastQueueSnapshot) {
      const sizeChange = queueSizeAfter - this.lastQueueSnapshot.totalItems;
      const percentChange = (sizeChange / this.lastQueueSnapshot.totalItems) * 100;

      if (sizeChange > 0) {
        console.warn(
          `[SyncDiagnostics] Queue grew during sync! ` +
          `Before: ${this.lastQueueSnapshot.totalItems} → After: ${queueSizeAfter} (+${sizeChange}, +${percentChange.toFixed(1)}%)`
        );

        if (percentChange > this.alertThresholds.queueGrowthPercentage) {
          this.addAnomaly(
            'critical',
            'queue_growth',
            `Queue grew unexpectedly by ${percentChange.toFixed(1)}%`,
            { before: this.lastQueueSnapshot.totalItems, after: queueSizeAfter, percentChange }
          );
        }
      }
    }

    // Check for excessive queue size
    if (queueSizeAfter > this.maxQueueSize) {
      this.addAnomaly(
        'critical',
        'queue_growth',
        `Queue size exceeded maximum (${queueSizeAfter} > ${this.maxQueueSize})`,
        { queueSize: queueSizeAfter, maxSize: this.maxQueueSize }
      );
    }

    // Check for rapid retries
    if (operation.status === 'failed') {
      const timeSinceLastAttempt = Date.now() - this.lastSyncAttempt;
      if (timeSinceLastAttempt < this.alertThresholds.rapidRetryWindow && this.lastSyncAttempt > 0) {
        console.warn(
          `[SyncDiagnostics] Rapid retry detected! ` +
          `${timeSinceLastAttempt}ms since last attempt (threshold: ${this.alertThresholds.rapidRetryWindow}ms)`
        );
      }

      if (this.consecutiveFailures >= this.alertThresholds.maxConsecutiveFailures) {
        this.addAnomaly(
          'critical',
          'high_failure_rate',
          `Sync failed ${this.consecutiveFailures} times consecutively`,
          { consecutiveFailures: this.consecutiveFailures }
        );
      }
    }

    this.lastSyncAttempt = Date.now();
  }

  /**
   * Add anomaly alert (public so other services can report anomalies)
   */
  addAnomaly(
    severity: 'warning' | 'critical',
    type: AnomalyAlert['type'],
    message: string,
    data: any
  ): void {
    const alert: AnomalyAlert = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      severity,
      type,
      message,
      data
    };

    const anomalies = this.anomalies();
    anomalies.push(alert);
    this.anomalies.set([...anomalies]);

    console.warn(`[SyncDiagnostics] ANOMALY [${severity.toUpperCase()}] ${type}: ${message}`, data);
  }

  /**
   * Update metrics
   */
  private updateMetrics(success: boolean, duration: number, itemsProcessed: number): void {
    const current = this.metrics();
    const totalSyncs = current.totalSyncs + 1;
    const successfulSyncs = success ? current.successfulSyncs + 1 : current.successfulSyncs;
    const failedSyncs = success ? current.failedSyncs : current.failedSyncs + 1;
    const totalItemsSynced = current.totalItemsSynced + (success ? itemsProcessed : 0);

    // Calculate running average
    const totalDuration = (current.averageSyncDuration * current.totalSyncs) + duration;
    const averageSyncDuration = totalDuration / totalSyncs;

    this.metrics.set({
      totalSyncs,
      successfulSyncs,
      failedSyncs,
      averageSyncDuration: Math.round(averageSyncDuration),
      totalItemsSynced
    });
  }

  /**
   * Get comprehensive diagnostics summary for console
   */
  getDiagnosticsSummary() {
    const ops = this.operations();
    const lastOps = ops.slice(-10); // Last 10 operations
    const anomalyList = this.anomalies();

    return {
      summary: {
        totalOperations: ops.length,
        metrics: this.metrics(),
        consecutiveFailures: this.consecutiveFailures,
        anomaliesCount: anomalyList.length,
        criticalAnomalies: anomalyList.filter(a => a.severity === 'critical').length
      },
      recentOperations: lastOps.map(op => ({
        type: op.type,
        status: op.status,
        duration: op.duration,
        itemsProcessed: op.itemsProcessed,
        queueChange: op.queueSizeAfter ? op.queueSizeAfter - op.queueSizeBefore : 0
      })),
      anomalies: anomalyList.map(a => ({
        type: a.type,
        severity: a.severity,
        message: a.message,
        timestamp: new Date(a.timestamp).toISOString()
      })),
      lastQueueSnapshot: this.lastQueueSnapshot,
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Generate recommendations based on diagnostics
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const anomalyList = this.anomalies();

    if (this.consecutiveFailures >= this.alertThresholds.maxConsecutiveFailures) {
      recommendations.push('❌ Multiple consecutive sync failures - check network connectivity and server status');
    }

    if (anomalyList.some(a => a.type === 'queue_growth')) {
      recommendations.push('⚠️  Queue growth detected - items may be re-queued without being cleared');
    }

    if (anomalyList.some(a => a.type === 'duplicate_items')) {
      recommendations.push('⚠️  Duplicate items in queue - may indicate sync issue or app crash during sync');
    }

    if (anomalyList.some(a => a.type === 'stuck_items')) {
      recommendations.push('⚠️  Items stuck in queue for 5+ minutes - may need manual intervention or check for data validation errors');
    }

    if (anomalyList.length === 0 && this.consecutiveFailures === 0) {
      recommendations.push('✅ No anomalies detected - sync is operating normally');
    }

    return recommendations;
  }

  /**
   * Clear old diagnostics data (keep last 1000 operations, last 100 snapshots, last 100 anomalies)
   */
  pruneOldData(): void {
    const ops = this.operations();
    if (ops.length > 1000) {
      this.operations.set(ops.slice(-1000));
    }

    const snapshots = this.queueSnapshots();
    if (snapshots.length > 100) {
      this.queueSnapshots.set(snapshots.slice(-100));
    }

    const anomalies = this.anomalies();
    if (anomalies.length > 100) {
      this.anomalies.set(anomalies.slice(-100));
    }
  }

  /**
   * Reset all diagnostics (for debugging)
   */
  reset(): void {
    this.operations.set([]);
    this.queueSnapshots.set([]);
    this.anomalies.set([]);
    this.metrics.set({
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      averageSyncDuration: 0,
      totalItemsSynced: 0
    });
    this.lastQueueSnapshot = null;
    this.lastSyncAttempt = 0;
    this.consecutiveFailures = 0;
    this.itemLastSeenTime.clear();
    console.log('[SyncDiagnostics] Diagnostics reset');
  }

  /**
   * Private initialization logging
   */
  private logInitialization(): void {
    console.log('[SyncDiagnostics] Service initialized with thresholds:', this.alertThresholds);
  }
}
