import {
  Component,
  inject,
  computed,
  signal,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { SyncManagerService } from '../../services/sync-manager.service';
import { SyncQueueService } from '../../services/sync-queue.service';
import { ConnectivityService } from '../../services/connectivity.service';
import { SyncDiagnosticsService } from '../../services/sync-diagnostics.service';
import { DatabaseService } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-sync-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sync-status.component.html',
})
export class SyncStatusComponent implements AfterViewChecked, OnInit {
  private syncManager = inject(SyncManagerService);
  private syncQueue = inject(SyncQueueService);
  private connectivity = inject(ConnectivityService);
  private diagnostics = inject(SyncDiagnosticsService);
  private db = inject(DatabaseService);
  private auth = inject(AuthService);
  private http = inject(HttpClient);

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

  // Garmin connection state
  garminConnected = signal(false);
  garminConnectedAt = signal<string | null>(null);
  garminLoading = signal(false);
  garminError = signal<string | null>(null);

  private lastOpTimestamp = 0;

  ngOnInit(): void {
    const userId = this.auth.userId();
    if (userId) {
      this.loadGarminStatus(userId);
    }

    // Handle redirect back from Garmin OAuth
    const params = new URLSearchParams(window.location.search);
    const garminParam = params.get('garmin');
    if (garminParam === 'connected') {
      this.garminConnected.set(true);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (garminParam === 'error') {
      this.garminError.set('GARMIN_OAUTH_FAILED — check credentials or try again');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  private loadGarminStatus(userId: string): void {
    this.http.get<any>(`${environment.serverUrl}/api/garmin/status/${userId}`).subscribe({
      next: (res) => {
        this.garminConnected.set(res.connected ?? false);
        this.garminConnectedAt.set(res.connectedAt ?? null);
      },
      error: () => {
        this.garminConnected.set(false);
      },
    });
  }

  connectGarmin(): void {
    const userId = this.auth.userId();
    if (!userId) {
      this.garminError.set('NOT_AUTHENTICATED — please log in first');
      return;
    }
    this.garminLoading.set(true);
    this.garminError.set(null);

    this.http.get<any>(`${environment.serverUrl}/api/garmin/auth?userId=${userId}`).subscribe({
      next: (res) => {
        this.garminLoading.set(false);
        if (res.authUrl) {
          window.location.href = res.authUrl;
        } else {
          this.garminError.set('CONNECT_FAILED — no auth URL returned');
        }
      },
      error: (err) => {
        this.garminLoading.set(false);
        this.garminError.set('CONNECT_FAILED — ' + (err.error?.error ?? 'server error'));
      },
    });
  }

  disconnectGarmin(): void {
    const userId = this.auth.userId();
    if (!userId) return;
    this.garminLoading.set(true);
    this.garminError.set(null);

    this.http.delete<any>(`${environment.serverUrl}/api/garmin/disconnect/${userId}`).subscribe({
      next: () => {
        this.garminLoading.set(false);
        this.garminConnected.set(false);
        this.garminConnectedAt.set(null);
      },
      error: (err) => {
        this.garminLoading.set(false);
        this.garminError.set('DISCONNECT_FAILED — ' + (err.error?.error ?? 'server error'));
      },
    });
  }

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
