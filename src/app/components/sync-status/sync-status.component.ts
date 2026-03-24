import {
  Component,
  inject,
  computed,
  signal,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SyncManagerService } from '../../services/sync-manager.service';
import { SyncQueueService } from '../../services/sync-queue.service';
import { ConnectivityService } from '../../services/connectivity.service';
import { SyncDiagnosticsService } from '../../services/sync-diagnostics.service';
import { DatabaseService } from '../../services/database.service';

@Component({
  selector: 'app-sync-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sync-status.component.html',
})
export class SyncStatusComponent implements AfterViewChecked {
  private syncManager = inject(SyncManagerService);
  private syncQueue = inject(SyncQueueService);
  private connectivity = inject(ConnectivityService);
  private diagnostics = inject(SyncDiagnosticsService);
  private db = inject(DatabaseService);

  @ViewChild('logPane') logPane!: ElementRef<HTMLDivElement>;

  // Expose signals to template
  isOnline = this.connectivity.isOnline;
  effectiveType = this.connectivity.effectiveType;
  isSyncing = this.syncManager.isSyncing;
  syncProgress = this.syncManager.syncProgress;
  lastSyncTime = this.syncManager.lastSyncTime;
  pendingCount = this.syncQueue.pendingCount;

  logLines = computed(() => {
    const ops = this.diagnostics.operations();
    return ops.slice(-50).map(op => {
      const d = new Date(op.timestamp);
      const t = `${d.getHours().toString().padStart(2, '0')}:${d
        .getMinutes()
        .toString()
        .padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
      return `[${t}] ${op.type} ${op.status} — ${op.itemsProcessed ?? 0} items`;
    });
  });

  importError = signal<string | null>(null);

  private lastOpTimestamp = 0;

  ngAfterViewChecked(): void {
    const ops = this.diagnostics.operations();
    const latestTs = ops.length > 0 ? ops[ops.length - 1].timestamp : 0;
    if (latestTs !== this.lastOpTimestamp) {
      this.lastOpTimestamp = latestTs;
      this.scrollLogToBottom();
    }
  }

  private scrollLogToBottom(): void {
    if (this.logPane?.nativeElement) {
      const el = this.logPane.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  asciiBar(value: number, max: number, width = 16): string {
    const filled = max > 0 ? Math.round((value / max) * width) : 0;
    return '[' + '|'.repeat(filled) + '.'.repeat(width - filled) + ']';
  }

  triggerSync(): void {
    this.syncManager.syncNow();
  }

  async onExport(): Promise<void> {
    try {
      const data = await this.db.exportData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fitness-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[SyncStatus] Export failed:', err);
    }
  }

  onImport(): void {
    this.importError.set(null);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await this.db.importData(data);
      } catch (err) {
        this.importError.set('IMPORT_FAILED: ' + (err instanceof Error ? err.message : 'unknown error'));
      }
    };
    input.click();
  }
}
