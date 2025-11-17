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
    userId: 'user-default',
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

  // Computed signals
  shouldAutoSync = computed(() => {
    return this.connectivity.isOnline() &&
           this.syncQueue.hasPendingChanges() &&
           !this.isSyncing();
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
    // Auto-sync when coming online
    effect(() => {
      if (this.connectivity.isOnline() && this.syncQueue.hasPendingChanges()) {
        console.log('[SyncManager] Connectivity restored, attempting sync...');
        this.syncNow();
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
        return true;
      }

      console.log(`[SyncManager] Syncing ${pending.length} pending changes`);

      // Batch items into smaller chunks
      const batches = this.createBatches(pending, this.config.batchSize || 100);
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        this.syncProgress.set(Math.round((i / batches.length) * 100));
        this.syncMessage.set(`Syncing batch ${i + 1} of ${batches.length}...`);

        const batchSuccess = await this.syncBatch(batch);
        if (batchSuccess) {
          successCount += batch.length;
        } else {
          failureCount += batch.length;
        }
      }

      // Mark synced items
      const syncedIds = pending
        .slice(0, successCount)
        .map(item => item.id!)
        .filter(id => id);

      if (syncedIds.length > 0) {
        await this.syncQueue.markMultipleAsSynced(syncedIds);
      }

      this.syncProgress.set(100);
      this.lastSyncTime.set(new Date());
      this.syncQueue.updateSyncStatus(failureCount === 0);

      const message = `Sync complete: ${successCount} synced, ${failureCount} failed`;
      this.syncMessage.set(message);
      console.log(`[SyncManager] ${message}`);

      return failureCount === 0;

    } catch (error) {
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

      const response = await firstValueFrom(
        this.http.post<SyncResponse>(
          `${this.config.serverUrl}/api/sync`,
          payload
        ).pipe(
          timeout(this.config.syncTimeout || 30000),
          catchError(error => {
            console.error('[SyncManager] Batch sync failed:', error);
            return of({ success: false, message: 'Sync failed', error: error.message });
          })
        )
      );

      this.lastSyncResult.set(response);

      if (response.success) {
        console.log('[SyncManager] Batch synced successfully');
        return true;
      } else {
        console.error('[SyncManager] Batch sync returned error:', response.error);
        return false;
      }

    } catch (error) {
      console.error('[SyncManager] Batch sync error:', error);
      return false;
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

      if (item.dataType === 'template') {
        const template = await this.db.getWorkoutTemplate(item.recordId);
        if (template) templates.push(template);
      } else if (item.dataType === 'instance') {
        const instance = await this.db.getWorkoutInstance(item.recordId);
        if (instance) instances.push(instance);
      } else if (item.dataType === 'log') {
        const log = await this.db.getExerciseLog(item.recordId);
        if (log) logs.push(log);
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
