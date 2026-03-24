import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SyncStatusComponent } from './sync-status.component';
import { SyncManagerService } from '../../services/sync-manager.service';
import { SyncQueueService } from '../../services/sync-queue.service';
import { ConnectivityService } from '../../services/connectivity.service';
import { SyncDiagnosticsService } from '../../services/sync-diagnostics.service';
import { DatabaseService } from '../../services/database.service';
import { signal } from '@angular/core';

describe('SyncStatusComponent', () => {
  let fixture: ComponentFixture<SyncStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SyncStatusComponent],
      providers: [
        {
          provide: SyncManagerService,
          useValue: {
            isSyncing: signal(false),
            syncProgress: signal(0),
            lastSyncTime: signal<Date | null>(null),
            syncNow: () => Promise.resolve(true),
          },
        },
        {
          provide: SyncQueueService,
          useValue: {
            pendingCount: signal(0),
          },
        },
        {
          provide: ConnectivityService,
          useValue: {
            isOnline: signal(true),
            effectiveType: signal('4g'),
          },
        },
        {
          provide: SyncDiagnosticsService,
          useValue: {
            operations: signal([]),
          },
        },
        {
          provide: DatabaseService,
          useValue: {
            exportData: async () => ({ workoutTemplates: [], workoutInstances: [], exerciseLogs: [] }),
            importData: async (_data: any) => {},
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SyncStatusComponent);
    fixture.detectChanges();
  });

  it('should render the sync log heading', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('SYNC_DAEMON');
  });

  it('should show IDLE daemon status when not syncing', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('IDLE');
  });

  it('should show network online status', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('PING');
  });

  it('should show execute sync button', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('EXECUTE_SYNC');
  });

  it('should show export and import buttons', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('EXPORT_DATA');
    expect(text).toContain('IMPORT_DATA');
  });

  it('should show no log entries placeholder when operations list is empty', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('NO_LOG_ENTRIES');
  });
});
