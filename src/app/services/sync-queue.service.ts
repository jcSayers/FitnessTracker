import { Injectable, signal } from '@angular/core';
import { Dexie, Table } from 'dexie';

/**
 * Tracks local changes that need to be synced to the server
 * Used for offline-first architecture and automatic sync management
 */
export interface SyncQueueItem {
  id?: number;
  dataType: 'template' | 'instance' | 'log'; // Type of data changed
  operation: 'create' | 'update' | 'delete'; // Operation performed
  recordId: string; // ID of the changed record
  timestamp: number; // When the change occurred
  synced: boolean; // Whether this change has been synced
  syncAttempts: number; // Number of sync attempts
  lastSyncAttempt?: number; // Timestamp of last sync attempt
  error?: string; // Last error message if sync failed
}

/**
 * Manages a queue of pending sync operations
 * Stores changes locally and tracks sync status
 */
@Injectable({
  providedIn: 'root'
})
export class SyncQueueService {
  private db!: Dexie;
  private syncQueueTable!: Table<SyncQueueItem>;

  // Signals for reactive state management
  queueCount = signal<number>(0);
  hasPendingChanges = signal<boolean>(false);
  lastSyncTime = signal<Date | null>(null);
  isSyncing = signal<boolean>(false);
  syncError = signal<string | null>(null);

  constructor() {
    this.initializeQueue();
  }

  /**
   * Initialize the sync queue table in IndexedDB
   */
  private initializeQueue(): void {
    this.db = new Dexie('FitnessTrackerSyncQueue');
    this.db.version(1).stores({
      syncQueue: '++id, recordId, timestamp, synced'
    });
    this.syncQueueTable = this.db.table('syncQueue');
  }

  /**
   * Add a change to the sync queue
   * Call this whenever local data is created, updated, or deleted
   */
  async addToQueue(
    dataType: 'template' | 'instance' | 'log',
    operation: 'create' | 'update' | 'delete',
    recordId: string
  ): Promise<void> {
    const item: SyncQueueItem = {
      dataType,
      operation,
      recordId,
      timestamp: Date.now(),
      synced: false,
      syncAttempts: 0
    };

    await this.syncQueueTable.add(item);
    await this.updateQueueStatus();
  }

  /**
   * Get all pending items that need to be synced
   */
  async getPendingItems(): Promise<SyncQueueItem[]> {
    const allItems = await this.syncQueueTable.toArray();
    return allItems.filter(item => !item.synced);
  }

  /**
   * Get pending items grouped by data type
   * Useful for batching sync operations
   */
  async getPendingItemsByType(): Promise<{
    templates: SyncQueueItem[];
    instances: SyncQueueItem[];
    logs: SyncQueueItem[];
  }> {
    const pending = await this.getPendingItems();
    return {
      templates: pending.filter(item => item.dataType === 'template'),
      instances: pending.filter(item => item.dataType === 'instance'),
      logs: pending.filter(item => item.dataType === 'log')
    };
  }

  /**
   * Mark an item as synced
   */
  async markAsSynced(id: number): Promise<void> {
    await this.syncQueueTable.update(id, {
      synced: true,
      syncAttempts: 0,
      error: undefined
    });
    await this.updateQueueStatus();
  }

  /**
   * Mark multiple items as synced
   */
  async markMultipleAsSynced(ids: number[]): Promise<void> {
    const updates = ids.map(id => ({
      key: id,
      changes: {
        synced: true,
        syncAttempts: 0,
        error: undefined
      }
    }));

    for (const update of updates) {
      await this.syncQueueTable.update(update.key, update.changes);
    }
    await this.updateQueueStatus();
  }

  /**
   * Update sync attempt count and error message
   */
  async recordSyncAttempt(id: number, error?: string): Promise<void> {
    const item = await this.syncQueueTable.get(id);
    if (item) {
      await this.syncQueueTable.update(id, {
        syncAttempts: (item.syncAttempts || 0) + 1,
        lastSyncAttempt: Date.now(),
        error: error || undefined
      });
    }
  }

  /**
   * Clear all synced items from the queue
   * Safe cleanup after successful sync
   */
  async clearSyncedItems(): Promise<void> {
    const allItems = await this.syncQueueTable.toArray();
    const syncedIds = allItems.filter(item => item.synced).map(item => item.id!);
    if (syncedIds.length > 0) {
      await this.syncQueueTable.bulkDelete(syncedIds);
    }
    await this.updateQueueStatus();
  }

  /**
   * Clear the entire queue (use with caution!)
   */
  async clearQueue(): Promise<void> {
    await this.syncQueueTable.clear();
    await this.updateQueueStatus();
  }

  /**
   * Clear all queue data including the database
   * Used when completely resetting sync state
   */
  async clearAll(): Promise<void> {
    try {
      await this.syncQueueTable.clear();
      await this.db.delete();
      this.db = new Dexie('FitnessTrackerSyncQueue');
      this.db.version(1).stores({
        syncQueue: '++id, recordId, timestamp, synced'
      });
      this.syncQueueTable = this.db.table('syncQueue');
      await this.db.open();
      await this.updateQueueStatus();
    } catch (error) {
      console.error('[SyncQueue] Error clearing all:', error);
      throw error;
    }
  }

  /**
   * Get all items in queue (useful for debugging)
   */
  async getAllQueueItems(): Promise<SyncQueueItem[]> {
    return this.syncQueueTable.toArray();
  }

  /**
   * Update queue status signals
   * Called after any queue operation
   */
  private async updateQueueStatus(): Promise<void> {
    const allItems = await this.syncQueueTable.toArray();
    const pendingItems = allItems.filter(item => !item.synced);

    this.queueCount.set(allItems.length);
    this.hasPendingChanges.set(pendingItems.length > 0);
  }

  /**
   * Update sync status after successful sync
   */
  updateSyncStatus(success: boolean, error?: string): void {
    if (success) {
      this.lastSyncTime.set(new Date());
      this.syncError.set(null);
    } else {
      this.syncError.set(error || 'Unknown sync error');
    }
  }

  /**
   * Set the syncing state
   */
  setSyncing(value: boolean): void {
    this.isSyncing.set(value);
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): {
    hasPendingChanges: boolean;
    lastSyncTime: Date | null;
    isSyncing: boolean;
    queueCount: number;
    syncError: string | null;
  } {
    return {
      hasPendingChanges: this.hasPendingChanges(),
      lastSyncTime: this.lastSyncTime(),
      isSyncing: this.isSyncing(),
      queueCount: this.queueCount(),
      syncError: this.syncError()
    };
  }
}
