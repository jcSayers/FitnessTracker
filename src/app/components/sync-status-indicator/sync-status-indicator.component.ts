import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConnectivityService } from '../../services/connectivity.service';
import { SyncManagerService } from '../../services/sync-manager.service';
import { SyncQueueService } from '../../services/sync-queue.service';

/**
 * Component to display sync status in the UI
 * Shows:
 * - Online/offline status
 * - Sync progress
 * - Pending changes count
 * - Last sync time
 * - Sync errors
 */
@Component({
  selector: 'app-sync-status-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sync-status-container" [class.syncing]="syncManager.isSyncing()">
      <!-- Online Status Indicator -->
      <div class="status-badge" [class.online]="connectivity.isOnline()" [class.offline]="!connectivity.isOnline()">
        <span class="status-dot"></span>
        <span class="status-text">{{ connectivity.isOnline() ? 'Online' : 'Offline' }}</span>
      </div>

      <!-- Sync Progress -->
      <div *ngIf="syncManager.isSyncing()" class="sync-progress">
        <div class="progress-bar">
          <div class="progress-fill" [style.width.%]="syncManager.syncProgress()"></div>
        </div>
        <small class="progress-text">{{ syncManager.syncMessage() }}</small>
      </div>

      <!-- Pending Changes Badge -->
      <div *ngIf="syncQueue.hasPendingChanges() && !syncManager.isSyncing()" class="pending-badge">
        <span class="badge-icon">⚙️</span>
        <span class="badge-text">{{ syncQueue.queueCount() }} pending</span>
      </div>

      <!-- Last Sync Time -->
      <div *ngIf="syncManager.lastSyncTime() && !syncManager.isSyncing()" class="last-sync">
        <small>Last sync: {{ formatLastSync(syncManager.lastSyncTime()) }}</small>
      </div>

      <!-- Sync Error -->
      <div *ngIf="syncManager.syncError()" class="sync-error">
        <span class="error-icon">⚠️</span>
        <span class="error-text">{{ syncManager.syncError() }}</span>
      </div>

      <!-- Manual Sync Button -->
      <button
        *ngIf="connectivity.isOnline() && !syncManager.isSyncing()"
        (click)="onManualSync()"
        class="sync-button"
        [disabled]="syncManager.isSyncing()"
        title="Sync now"
      >
        🔄
      </button>
    </div>
  `,
  styles: [`
    .sync-status-container {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      background: #f5f5f5;
      border-radius: 8px;
      font-size: 12px;
    }

    .sync-status-container.syncing {
      background: #e3f2fd;
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 12px;
      font-weight: 500;
      font-size: 11px;
    }

    .status-badge.online {
      background: #c8e6c9;
      color: #2e7d32;
    }

    .status-badge.offline {
      background: #ffcdd2;
      color: #c62828;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.6;
      }
    }

    .sync-progress {
      flex: 1;
      min-width: 150px;
    }

    .progress-bar {
      height: 4px;
      background: #ddd;
      border-radius: 2px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #2196f3, #21cbf3);
      transition: width 0.3s ease;
    }

    .progress-text {
      display: block;
      margin-top: 2px;
      color: #666;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .pending-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: #fff3e0;
      border-radius: 12px;
      color: #e65100;
      font-weight: 500;
    }

    .badge-icon {
      font-size: 12px;
      animation: spin 2s linear infinite;
    }

    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    .last-sync {
      color: #666;
      white-space: nowrap;
    }

    .sync-error {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: #ffebee;
      border-radius: 12px;
      color: #c62828;
      font-weight: 500;
    }

    .error-text {
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .sync-button {
      padding: 4px 8px;
      background: #2196f3;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }

    .sync-button:hover:not(:disabled) {
      background: #1976d2;
    }

    .sync-button:disabled {
      background: #ccc;
      cursor: not-allowed;
      opacity: 0.6;
    }
  `]
})
export class SyncStatusIndicatorComponent {
  syncManager = inject(SyncManagerService);
  connectivity = inject(ConnectivityService);
  syncQueue = inject(SyncQueueService);

  showCompact = input(false);

  async onManualSync(): Promise<void> {
    await this.syncManager.syncNow();
  }

  formatLastSync(date: Date | null): string {
    if (!date) return 'Never';

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;

    return date.toLocaleDateString();
  }
}
