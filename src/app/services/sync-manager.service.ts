import { Injectable, signal, computed, effect } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, firstValueFrom, timeout } from 'rxjs';
import { of } from 'rxjs';
import { DatabaseService } from './database.service';
import { SyncQueueService, SyncQueueItem } from './sync-queue.service';
import { ConnectivityService } from './connectivity.service';
import { SyncDiagnosticsService } from './sync-diagnostics.service';
import { WorkoutTemplate, WorkoutInstance, ExerciseLog } from '../models/workout.models';

/**
 * Sync request payload matching server expectations
 */
export interface SyncPayload {
  userId: string;
  workoutTemplates?: WorkoutTemplate[];
  workoutInstances?: WorkoutInstance[];
  exerciseLogs?: ExerciseLog[];
}

/**
 * Sync response from server
 */
export interface SyncResponse {
  success: boolean;
  message: string;
  data?: {
    workoutTemplates: WorkoutTemplate[];
    workoutInstances: WorkoutInstance[];
    exerciseLogs: ExerciseLog[];
  };
  error?: string;
}

/**
 * Configuration for sync manager
 */
export interface SyncConfig {
  serverUrl: string;
  userId: string;
  batchSize?: number; // Items per sync request
  maxRetries?: number;
  retryDelay?: number; // ms
  syncTimeout?: number; // ms
}

/**
 * Orchestrates automatic synchronization between local and remote databases
 * Handles:
 * - Batching local changes for efficient sync
 * - Automatic sync on app load
 * - Sync on connectivity change
 * - Retry logic with exponential backoff
 * - Conflict resolution and error handling
 */
@Injectable({
  providedIn: 'root'
})
export class SyncManagerService {
  private config: SyncConfig = {
    serverUrl: 'http://localhost:3000',
    userId: 'jc.sayers10@gmail.com',
    batchSize: 100,
    maxRetries: 3,
    retryDelay: 1000,
    syncTimeout: 30000
  };

  // Safeguards configuration
  private safeguards = {
    maxQueueSize: 1000, // Alert if queue grows beyond this
    maxConsecutiveFailures: 3, // Stop retrying after this many failures
    minTimeBetweenSyncs: 1000, // Minimum ms between sync attempts (prevents API spam)
    maxSyncDuration: 120000, // Max 2 minutes for a sync (detect stuck syncs)
    detectedDuplicatePrevention: true // Track and prevent duplicate queue items
  };

  // Signals for reactive UI
  readonly isSyncing = signal<boolean>(false);
  readonly syncMessage = signal<string>('');
  readonly syncError = signal<string | null>(null);
  readonly pendingCount = signal<number>(0);

  lastSyncTime = signal<Date | null>(null);
  syncProgress = signal<number>(0); // 0-100
  lastSyncResult = signal<SyncResponse | null>(null);

  // Track consecutive failed syncs to avoid infinite retry loops
  private consecutiveFailures = 0;
  private maxConsecutiveFailures = 3;

  // Rate limiting
  private lastSyncAttemptTime = 0;

  // Track items seen in queue to detect duplicates
  private queueItemTracker = new Map<string, { count: number; firstSeen: number }>();

  // Computed signals
  shouldAutoSync = computed(() => {
    return this.connectivity.isOnline() &&
      this.syncQueue.hasPendingChanges() &&
      !this.isSyncing() &&
      this.consecutiveFailures < this.maxConsecutiveFailures;
  });

  canSync = computed(() => {
    return this.connectivity.isOnline() && !this.isSyncing();
  });

  constructor(
    private db: DatabaseService,
    private syncQueue: SyncQueueService,
    private connectivity: ConnectivityService,
    private http: HttpClient,
    private diagnostics: SyncDiagnosticsService
  ) {
    this.initializeAutoSync();
  }

  /**
   * Configure the sync manager
   */
  configure(config: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Start a full sync session (Push -> Pull)
   * Called on app load
   */
  async startSyncSession(): Promise<void> {
    if (!this.connectivity.isOnline()) {
      return;
    }

    // 1. Push local changes
    await this.syncNow();

    // 2. Pull remote changes
    await this.pullFromCloud();
  }

  /**
   * Initialize automatic sync triggers
   */
  private initializeAutoSync(): void {
    // Auto-sync when coming online (with debounce to prevent rapid retries)
    let lastSyncAttempt = 0;
    const syncDebounceMs = 3000; // Increased debounce: sync takes 800-1000ms, plus time for queue updates

    effect(() => {
      // Update pending count whenever queue changes
      this.pendingCount.set(this.syncQueue.pendingCount());

      if (this.connectivity.isOnline() && this.syncQueue.hasPendingChanges() && !this.isSyncing()) {
        const now = Date.now();
        if (now - lastSyncAttempt >= syncDebounceMs) {
          lastSyncAttempt = now;
          this.syncNow();
        }
      }
    });
  }

  /**
   * Check if safeguards allow sync to proceed
   * Returns null if allowed, or error message if blocked
   */
  private checkSafeguards(queueSize: number): string | null {
    // Check queue size
    if (queueSize > this.safeguards.maxQueueSize) {
      const msg = `Queue size exceeded safeguard limit (${queueSize} > ${this.safeguards.maxQueueSize}). This suggests items are being added faster than they can be synced. Please check for data entry loops or app issues.`;
      console.error('[SyncManager] SAFEGUARD BLOCKED:', msg);
      this.diagnostics.addAnomaly('critical', 'queue_growth', msg, { queueSize });
      return msg;
    }

    // Check rate limiting
    const timeSinceLastSync = Date.now() - this.lastSyncAttemptTime;
    if (timeSinceLastSync < this.safeguards.minTimeBetweenSyncs && this.lastSyncAttemptTime > 0) {
      return null;
    }

    // Check consecutive failures
    if (this.consecutiveFailures >= this.safeguards.maxConsecutiveFailures) {
      const msg = `Sync stopped after ${this.consecutiveFailures} consecutive failures. Server may be down or there may be a persistent error. Please check your connection or restart the app.`;
      console.error('[SyncManager] SAFEGUARD BLOCKED:', msg);
      this.diagnostics.addAnomaly('critical', 'high_failure_rate', msg, { consecutiveFailures: this.consecutiveFailures });
      return msg;
    }

    return null; // All checks passed
  }

  /**
   * Perform synchronization immediately
   * Called on app load, manual trigger, or connectivity change
   * Only syncs pending local changes (push only, no pull)
   */
  async syncNow(): Promise<boolean> {
    if (this.isSyncing()) {
      return false;
    }

    if (!this.connectivity.isOnline()) {
      return false;
    }

    const queueSize = this.syncQueue.queueCount();
    const safeguardError = this.checkSafeguards(queueSize);
    if (safeguardError) {
      this.syncError.set(safeguardError);
      this.syncMessage.set(safeguardError);
      return false;
    }

    this.isSyncing.set(true);
    this.syncProgress.set(0);
    this.syncMessage.set('Starting sync...');
    this.syncError.set(null);
    this.lastSyncAttemptTime = Date.now();

    // Start diagnostics tracking
    const operationId = this.diagnostics.logSyncStart('full_sync', queueSize);

    try {
      const pending = await this.syncQueue.getPendingItems();

      if (pending.length === 0) {
        this.syncMessage.set('No changes to sync');
        this.syncProgress.set(100);
        this.lastSyncTime.set(new Date());
        this.consecutiveFailures = 0; // Reset on success
        this.diagnostics.logSyncComplete(operationId, 0, 0, true);
        return true;
      }

      // Capture initial queue snapshot
      const queueSnapshot = await this.syncQueue.getQueueSnapshot();
      this.diagnostics.captureQueueSnapshot(
        pending.length,
        queueSnapshot.byType,
        queueSnapshot.byOperation,
        pending
      );

      // Track queue items to detect stuck items
      this.diagnostics.trackQueueItems(pending);

      // Batch items into smaller chunks
      const batches = this.createBatches(pending, this.config.batchSize || 100);
      const syncedQueueIds: number[] = [];
      const syncedRecordIds: { type: 'template' | 'instance' | 'log'; id: string }[] = [];
      let totalItemsProcessed = 0;

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        this.syncProgress.set(Math.round((i / batches.length) * 100));
        this.syncMessage.set(`Syncing batch ${i + 1} of ${batches.length}...`);

        const batchSuccess = await this.syncBatch(batch, operationId);
        if (batchSuccess) {
          // Only mark successfully synced items (use queue item's ID, not record ID)
          const batchQueueIds = batch
            .map(item => item.id)
            .filter((id): id is number => id !== undefined && id !== null);
          syncedQueueIds.push(...batchQueueIds);
          totalItemsProcessed += batch.length;

          // Track which records were synced for updating the main database
          for (const item of batch) {
            syncedRecordIds.push({ type: item.dataType, id: item.recordId });
          }
        }
      }

      // Mark synced items in the queue
      if (syncedQueueIds.length > 0) {
        await this.syncQueue.markMultipleAsSynced(syncedQueueIds);
      }

      // Mark synced items in the main database
      if (syncedRecordIds.length > 0) {
        await this.markRecordsAsSynced(syncedRecordIds);
      }

      const failureCount = pending.length - syncedQueueIds.length;
      const allSuccess = failureCount === 0;

      // Always clear successfully synced items from queue, even if some items failed
      // This prevents exponential growth of synced items that are never removed
      if (syncedQueueIds.length > 0) {
        await this.syncQueue.clearSyncedItems();
      }

      if (allSuccess) {
        this.consecutiveFailures = 0; // Reset on complete success
        // Update last sync time to trigger cooldown in auto-sync
        this.lastSyncAttemptTime = Date.now();
      } else {
        this.consecutiveFailures++;
      }

      // Get final queue count for diagnostics
      const finalQueueCount = this.syncQueue.queueCount();

      this.syncProgress.set(100);
      this.lastSyncTime.set(new Date());
      this.syncQueue.updateSyncStatus(allSuccess);

      const message = `Sync complete: ${syncedQueueIds.length} synced, ${failureCount} failed`;
      this.syncMessage.set(message);

      // Log completion with diagnostics
      this.diagnostics.logSyncComplete(operationId, totalItemsProcessed, finalQueueCount, allSuccess);

      return allSuccess;

    } catch (error) {
      this.consecutiveFailures++;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.syncError.set(errorMsg);
      this.syncQueue.updateSyncStatus(false, errorMsg);
      console.error('[SyncManager] Sync failed:', error);
      this.diagnostics.logSyncError(operationId, error instanceof Error ? error : new Error(String(error)));
      return false;

    } finally {
      this.isSyncing.set(false);
    }
  }

  /**
   * Sync a batch of queue items
   */
  private async syncBatch(items: SyncQueueItem[], parentOperationId?: string): Promise<boolean> {
    const batchOperationId = this.diagnostics.logSyncStart('batch', items.length);

    try {
      // Deduplicate items: keep only the latest queue entry for each record
      const dedupedItems = this.deduplicateQueueItems(items);

      // Separate delete operations from upsert operations
      const deleteItems = dedupedItems.filter(item => item.operation === 'delete');
      const upsertItems = dedupedItems.filter(item => item.operation !== 'delete');

      let upsertSuccess = true;
      let deleteSuccess = true;

      // Process upserts (create/update)
      if (upsertItems.length > 0) {
        const payload = await this.buildSyncPayload(upsertItems);

        if (payload.workoutTemplates || payload.workoutInstances || payload.exerciseLogs) {
          const response = await firstValueFrom(
            this.http.post<SyncResponse>(
              `${this.config.serverUrl}/api/sync`,
              payload
            ).pipe(
              timeout(this.config.syncTimeout || 30000),
              catchError(error => {
                const errorMsg = error instanceof HttpErrorResponse
                  ? `HTTP ${error.status}: ${error.error?.error || error.message}`
                  : error.message;
                console.error('[SyncManager] HTTP error:', errorMsg, error);
                return of<SyncResponse>({ success: false, message: 'Sync failed', error: errorMsg });
              })
            )
          );

          this.lastSyncResult.set(response);

          if (response.success) {
            if (response.data) {
              try {
                await this.updateLocalWithCloudIds(response.data);
              } catch (error) {
                console.error('[SyncManager] Error updating local database with cloud IDs:', error);
              }
            }
          } else {
            console.error('[SyncManager] Batch sync returned error:', response.error || response.message);
            this.diagnostics.logSyncError(batchOperationId, response.error || response.message || 'Unknown error');
            upsertSuccess = false;
          }
        }
      }

      // Process deletes
      if (deleteItems.length > 0) {
        deleteSuccess = await this.sendDeletes(deleteItems);
        if (!deleteSuccess) {
          console.error('[SyncManager] Delete sync failed for', deleteItems.length, 'items');
        }
      }

      const allSuccess = upsertSuccess && deleteSuccess;
      if (allSuccess) {
        this.diagnostics.logSyncComplete(batchOperationId, items.length, this.syncQueue.queueCount(), true);
      } else {
        this.diagnostics.logSyncError(batchOperationId, 'One or more sync operations failed');
      }
      return allSuccess;

    } catch (error) {
      console.error('[SyncManager] Batch sync error:', error);
      this.diagnostics.logSyncError(batchOperationId, error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Send delete operations to the server
   */
  private async sendDeletes(items: SyncQueueItem[]): Promise<boolean> {
    try {
      const deletePayload = {
        userId: this.config.userId,
        deletes: items.map(item => ({
          dataType: item.dataType,
          recordId: item.recordId
        }))
      };

      const response = await firstValueFrom(
        this.http.post<{ success: boolean; error?: string }>(
          `${this.config.serverUrl}/api/sync/delete-records`,
          deletePayload
        ).pipe(
          timeout(this.config.syncTimeout || 30000),
          catchError(error => {
            const errorMsg = error instanceof HttpErrorResponse
              ? `HTTP ${error.status}: ${error.error?.error || error.message}`
              : error.message;
            console.error('[SyncManager] Delete HTTP error:', errorMsg, error);
            return of({ success: false, error: errorMsg });
          })
        )
      );

      if (!response.success) {
        console.error('[SyncManager] Delete records failed:', response.error);
      }
      return response.success;
    } catch (error) {
      console.error('[SyncManager] sendDeletes error:', error);
      return false;
    }
  }

  /**
   * Update local database with cloud IDs returned from server
   * Maps local IDs to the server-generated UUIDs (cloudId)
   */
  private async updateLocalWithCloudIds(syncData: any): Promise<void> {
    // Process template mappings
    if (syncData.workoutTemplates && Array.isArray(syncData.workoutTemplates)) {
      for (const mapping of syncData.workoutTemplates) {
        const template = await this.db.getWorkoutTemplate(mapping.localId);
        if (template) {
          template.cloudId = mapping.id;
          await this.db.updateWorkoutTemplate(template, true); // skipSync = true
        }
      }
    }

    // Process instance mappings
    if (syncData.workoutInstances && Array.isArray(syncData.workoutInstances)) {
      for (const mapping of syncData.workoutInstances) {
        const instance = await this.db.getWorkoutInstance(mapping.localId);
        if (instance) {
          instance.cloudId = mapping.id;
          await this.db.updateWorkoutInstance(instance, true); // skipSync = true
        }
      }
    }

    // Process log mappings
    if (syncData.exerciseLogs && Array.isArray(syncData.exerciseLogs)) {
      for (const mapping of syncData.exerciseLogs) {
        const log = await this.db.getExerciseLog(mapping.localId);
        if (log) {
          log.cloudId = mapping.id;
          await this.db.updateExerciseLog(log, true); // skipSync = true
        }
      }
    }
  }

  /**
   * Mark records as synced in the main database
   * Prevents them from being re-queued on page reload
   */
  private async markRecordsAsSynced(records: { type: 'template' | 'instance' | 'log'; id: string }[]): Promise<void> {
    for (const record of records) {
      try {
        if (record.type === 'template') {
          const template = await this.db.getWorkoutTemplate(record.id);
          if (template) {
            template.synced = true;
            await this.db.updateWorkoutTemplate(template, true); // skipSync = true
          }
        } else if (record.type === 'instance') {
          const instance = await this.db.getWorkoutInstance(record.id);
          if (instance) {
            instance.synced = true;
            await this.db.updateWorkoutInstance(instance, true); // skipSync = true
          }
        } else if (record.type === 'log') {
          const log = await this.db.getExerciseLog(record.id);
          if (log) {
            log.synced = true;
            await this.db.updateExerciseLog(log, true); // skipSync = true
          }
        }
      } catch (error) {
        console.error(`[SyncManager] Error marking ${record.type} ${record.id} as synced:`, error);
      }
    }
  }

  /**
   * Deduplicate queue items - keep only the latest entry for each recordId
   * This prevents sending duplicate records in the same batch
   */
  private deduplicateQueueItems(items: SyncQueueItem[]): SyncQueueItem[] {
    const latestByRecord = new Map<string, SyncQueueItem>();

    for (const item of items) {
      const key = `${item.dataType}:${item.recordId}`;
      const existing = latestByRecord.get(key);

      // Keep the item with the highest ID (most recent entry)
      if (!existing || (item.id && existing.id && item.id > existing.id)) {
        latestByRecord.set(key, item);
      }
    }

    return Array.from(latestByRecord.values());
  }

  /**
   * Build sync payload from queue items
   */
  private async buildSyncPayload(items: SyncQueueItem[]): Promise<SyncPayload> {
    const templates: WorkoutTemplate[] = [];
    const instances: WorkoutInstance[] = [];
    const logs: ExerciseLog[] = [];

    for (const item of items) {
      try {
        if (item.dataType === 'template') {
          const template = await this.db.getWorkoutTemplate(item.recordId);
          if (template) templates.push(this.sanitizeTemplate(template));
        } else if (item.dataType === 'instance') {
          const instance = await this.db.getWorkoutInstance(item.recordId);
          if (instance) instances.push(this.sanitizeInstance(instance));
        } else if (item.dataType === 'log') {
          const log = await this.db.getExerciseLog(item.recordId);
          if (log) logs.push(this.sanitizeLog(log));
        }
      } catch (error) {
        console.error('[SyncManager] Error processing item:', item, error);
      }
    }

    return {
      userId: this.config.userId,
      workoutTemplates: templates.length > 0 ? templates : undefined,
      workoutInstances: instances.length > 0 ? instances : undefined,
      exerciseLogs: logs.length > 0 ? logs : undefined
    };
  }

  /**
   * Sanitize template for JSON serialization
   */
  private sanitizeTemplate(template: WorkoutTemplate): WorkoutTemplate {
    return {
      ...template,
      createdAt: template.createdAt instanceof Date ? template.createdAt : new Date(template.createdAt),
      updatedAt: template.updatedAt instanceof Date ? template.updatedAt : new Date(template.updatedAt)
    };
  }

  /**
   * Sanitize instance for JSON serialization
   */
  private sanitizeInstance(instance: WorkoutInstance): WorkoutInstance {
    return {
      ...instance,
      startTime: instance.startTime instanceof Date ? instance.startTime : new Date(instance.startTime),
      endTime: instance.endTime
        ? (instance.endTime instanceof Date ? instance.endTime : new Date(instance.endTime))
        : undefined
    };
  }

  /**
   * Sanitize log for JSON serialization
   */
  private sanitizeLog(log: ExerciseLog): ExerciseLog {
    return {
      ...log,
      date: log.date instanceof Date ? log.date : new Date(log.date)
    };
  }

  /**
   * Batch items into chunks
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Sync specific data type only
   */
  async syncType(type: 'template' | 'instance' | 'log'): Promise<boolean> {
    const pending = await this.syncQueue.getPendingItemsByType();
    let items: SyncQueueItem[] = [];

    if (type === 'template') items = pending.templates;
    else if (type === 'instance') items = pending.instances;
    else if (type === 'log') items = pending.logs;

    if (items.length === 0) {
      return true;
    }

    return this.syncBatch(items);
  }

  /**
   * Get current sync status
   */
  getStatus() {
    return {
      isSyncing: this.isSyncing(),
      lastSyncTime: this.lastSyncTime(),
      syncProgress: this.syncProgress(),
      syncMessage: this.syncMessage(),
      syncError: this.syncError(),
      canSync: this.canSync(),
      shouldAutoSync: this.shouldAutoSync(),
      queueCount: this.syncQueue.queueCount(),
      isOnline: this.connectivity.isOnline()
    };
  }

  /**
   * Clear sync queue (use with caution)
   */
  async clearQueue(): Promise<void> {
    await this.syncQueue.clearQueue();
  }

  /**
   * Debug: Get all queue items
   */
  async getQueueItems(): Promise<SyncQueueItem[]> {
    return this.syncQueue.getAllQueueItems();
  }
  /**
   * Pull latest data from cloud
   */
  async pullFromCloud(): Promise<boolean> {
    if (!this.connectivity.isOnline()) return false;

    this.isSyncing.set(true);
    this.syncMessage.set('Pulling data from cloud...');

    try {
      const response = await firstValueFrom(
        this.http.get<SyncResponse>(`${this.config.serverUrl}/api/sync/${this.config.userId}`)
      );

      if (response.success && response.data) {
        this.syncMessage.set('Applying cloud updates...');
        await this.applyCloudData(response.data);
        this.syncMessage.set('Sync complete');
        return true;
      }
      return false;
    } catch (error) {
      console.error('[SyncManager] Pull failed:', error);
      this.syncError.set('Pull failed');
      return false;
    } finally {
      this.isSyncing.set(false);
    }
  }

  /**
   * Apply cloud data to local database
   */
  private async applyCloudData(data: any): Promise<void> {
    // Apply templates
    if (data.workoutTemplates) {
      for (const remote of data.workoutTemplates) {
        // Try to find by cloudId first, then by ID (if it matches)
        const existing = await this.db.getWorkoutTemplateByCloudId(remote.id) ||
          await this.db.getWorkoutTemplate(remote.id);

        if (existing) {
          // Update existing
          const updated = { ...existing, ...remote, id: existing.id, cloudId: remote.id, synced: true };
          await this.db.upsertWorkoutTemplate(updated, true); // skipSync = true
        } else {
          // Create new
          const newTemplate = { ...remote, cloudId: remote.id, synced: true };
          await this.db.upsertWorkoutTemplate(newTemplate, true); // skipSync = true
        }
      }
    }

    // Apply instances
    if (data.workoutInstances) {
      for (const remote of data.workoutInstances) {
        const existing = await this.db.getWorkoutInstanceByCloudId(remote.id) ||
          await this.db.getWorkoutInstance(remote.id);

        if (existing) {
          const updated = { ...existing, ...remote, id: existing.id, cloudId: remote.id, synced: true };
          await this.db.upsertWorkoutInstance(updated, true); // skipSync = true
        } else {
          const newInstance = { ...remote, cloudId: remote.id, synced: true };
          await this.db.upsertWorkoutInstance(newInstance, true); // skipSync = true
        }
      }
    }

    // Apply logs
    if (data.exerciseLogs) {
      for (const remote of data.exerciseLogs) {
        const existing = await this.db.getExerciseLogByCloudId(remote.id) ||
          await this.db.getExerciseLog(remote.id);

        if (existing) {
          const updated = { ...existing, ...remote, id: existing.id, cloudId: remote.id, synced: true };
          await this.db.upsertExerciseLog(updated, true); // skipSync = true
        } else {
          const newLog = { ...remote, cloudId: remote.id, synced: true };
          await this.db.upsertExerciseLog(newLog, true); // skipSync = true
        }
      }
    }
  }
}
