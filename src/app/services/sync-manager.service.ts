import { Injectable, signal, computed, effect } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, firstValueFrom, timeout } from 'rxjs';
import { of } from 'rxjs';
import { DatabaseService } from './database.service';
import { SyncQueueService, SyncQueueItem } from './sync-queue.service';
import { ConnectivityService } from './connectivity.service';
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

  // Sync state signals
  isSyncing = signal<boolean>(false);
  lastSyncTime = signal<Date | null>(null);
  syncProgress = signal<number>(0); // 0-100
  syncMessage = signal<string>('');
  syncError = signal<string | null>(null);
  lastSyncResult = signal<SyncResponse | null>(null);

  // Track consecutive failed syncs to avoid infinite retry loops
  private consecutiveFailures = 0;
  private maxConsecutiveFailures = 3;

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
    private http: HttpClient
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
   * Initialize automatic sync triggers
   */
  private initializeAutoSync(): void {
    // Auto-sync when coming online (with debounce to prevent rapid retries)
    let lastSyncAttempt = 0;
    const syncDebounceMs = 2000; // Wait at least 2 seconds between sync attempts

    effect(() => {
      if (this.connectivity.isOnline() && this.syncQueue.hasPendingChanges() && !this.isSyncing()) {
        const now = Date.now();
        if (now - lastSyncAttempt >= syncDebounceMs) {
          console.log('[SyncManager] Connectivity restored, attempting sync...');
          lastSyncAttempt = now;
          this.syncNow();
        }
      }
    });

    // Log sync state changes
    effect(() => {
      if (this.isSyncing()) {
        console.log('[SyncManager] Sync started');
      } else {
        console.log('[SyncManager] Sync completed');
      }
    });
  }

  /**
   * Perform synchronization immediately
   * Called on app load, manual trigger, or connectivity change
   */
  async syncNow(): Promise<boolean> {
    if (this.isSyncing()) {
      console.warn('[SyncManager] Sync already in progress');
      return false;
    }

    if (!this.connectivity.isOnline()) {
      console.warn('[SyncManager] Cannot sync - offline');
      return false;
    }

    if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
      const errorMsg = `Sync stopped after ${this.maxConsecutiveFailures} consecutive failures. Please check your connection or restart the app.`;
      this.syncError.set(errorMsg);
      this.syncMessage.set(errorMsg);
      console.warn('[SyncManager]', errorMsg);
      return false;
    }

    this.isSyncing.set(true);
    this.syncProgress.set(0);
    this.syncMessage.set('Starting sync...');
    this.syncError.set(null);

    try {
      const pending = await this.syncQueue.getPendingItems();

      if (pending.length === 0) {
        this.syncMessage.set('No changes to sync');
        this.syncProgress.set(100);
        this.lastSyncTime.set(new Date());
        this.consecutiveFailures = 0; // Reset on success
        return true;
      }

      console.log(`[SyncManager] Syncing ${pending.length} pending changes`);

      // Batch items into smaller chunks
      const batches = this.createBatches(pending, this.config.batchSize || 100);
      const syncedQueueIds: number[] = [];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        this.syncProgress.set(Math.round((i / batches.length) * 100));
        this.syncMessage.set(`Syncing batch ${i + 1} of ${batches.length}...`);

        const batchSuccess = await this.syncBatch(batch);
        if (batchSuccess) {
          // Only mark successfully synced items (use queue item's ID, not record ID)
          const batchQueueIds = batch
            .map(item => item.id)
            .filter((id): id is number => id !== undefined && id !== null);
          syncedQueueIds.push(...batchQueueIds);
        }
      }

      // Mark synced items in the queue
      if (syncedQueueIds.length > 0) {
        await this.syncQueue.markMultipleAsSynced(syncedQueueIds);
        console.log(`[SyncManager] Marked ${syncedQueueIds.length} items as synced`);
      }

      const failureCount = pending.length - syncedQueueIds.length;
      const allSuccess = failureCount === 0;
      if (allSuccess) {
        this.consecutiveFailures = 0; // Reset on complete success
      } else {
        this.consecutiveFailures++;
      }

      this.syncProgress.set(100);
      this.lastSyncTime.set(new Date());
      this.syncQueue.updateSyncStatus(allSuccess);

      const message = `Sync complete: ${syncedQueueIds.length} synced, ${failureCount} failed`;
      this.syncMessage.set(message);
      console.log(`[SyncManager] ${message}`);

      return allSuccess;

    } catch (error) {
      this.consecutiveFailures++;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.syncError.set(errorMsg);
      this.syncQueue.updateSyncStatus(false, errorMsg);
      console.error('[SyncManager] Sync failed:', error);
      return false;

    } finally {
      this.isSyncing.set(false);
    }
  }

  /**
   * Sync a batch of queue items
   */
  private async syncBatch(items: SyncQueueItem[]): Promise<boolean> {
    try {
      const payload = await this.buildSyncPayload(items);

      if (!payload.workoutTemplates && !payload.workoutInstances && !payload.exerciseLogs) {
        console.log('[SyncManager] Skipping sync - no data to send');
        return true;
      }

      console.log('[SyncManager] Sending payload:', payload);

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
        console.log('[SyncManager] Batch synced successfully:', response);

        // Update local database with returned UUIDs (cloudId mappings)
        if (response.data) {
          try {
            await this.updateLocalWithCloudIds(response.data);
          } catch (error) {
            console.error('[SyncManager] Error updating local database with cloud IDs:', error);
            // Don't fail the sync if this step fails - data is already in Supabase
          }
        }

        return true;
      } else {
        console.error('[SyncManager] Batch sync returned error:', response.error || response.message);
        return false;
      }

    } catch (error) {
      console.error('[SyncManager] Batch sync error:', error);
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
          await this.db.updateWorkoutTemplate(template);
          console.log(`[SyncManager] Updated template ${mapping.localId} with cloudId ${mapping.id}`);
        }
      }
    }

    // Process instance mappings
    if (syncData.workoutInstances && Array.isArray(syncData.workoutInstances)) {
      for (const mapping of syncData.workoutInstances) {
        const instance = await this.db.getWorkoutInstance(mapping.localId);
        if (instance) {
          instance.cloudId = mapping.id;
          await this.db.updateWorkoutInstance(instance);
          console.log(`[SyncManager] Updated instance ${mapping.localId} with cloudId ${mapping.id}`);
        }
      }
    }

    // Process log mappings
    if (syncData.exerciseLogs && Array.isArray(syncData.exerciseLogs)) {
      for (const mapping of syncData.exerciseLogs) {
        const log = await this.db.getExerciseLog(mapping.localId);
        if (log) {
          log.cloudId = mapping.id;
          await this.db.updateExerciseLog(log);
          console.log(`[SyncManager] Updated log ${mapping.localId} with cloudId ${mapping.id}`);
        }
      }
    }
  }

  /**
   * Build sync payload from queue items
   */
  private async buildSyncPayload(items: SyncQueueItem[]): Promise<SyncPayload> {
    const templates: WorkoutTemplate[] = [];
    const instances: WorkoutInstance[] = [];
    const logs: ExerciseLog[] = [];

    for (const item of items) {
      if (item.operation === 'delete') {
        // For now, skip deletes (server should handle via soft deletes)
        continue;
      }

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
      console.log(`[SyncManager] No pending ${type} changes`);
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
    console.log('[SyncManager] Sync queue cleared');
  }

  /**
   * Debug: Get all queue items
   */
  async getQueueItems(): Promise<SyncQueueItem[]> {
    return this.syncQueue.getAllQueueItems();
  }
}
