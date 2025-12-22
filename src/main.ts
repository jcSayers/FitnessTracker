import {bootstrapApplication} from '@angular/platform-browser';
import {AppComponent} from './app/app.component';
import {provideAnimations} from '@angular/platform-browser/animations';
import {provideRouter} from '@angular/router';
import {provideHttpClient} from '@angular/common/http';
import {routes} from './app/app.routes';
import {DatabaseService} from './app/services/database.service';
import {SyncDiagnosticsService} from './app/services/sync-diagnostics.service';
import {SyncManagerService} from './app/services/sync-manager.service';

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    provideRouter(routes),
    provideHttpClient()
  ]
}).then((appRef) => {
  // Expose database clearing utility to browser console for debugging
  const db = appRef.injector.get(DatabaseService);
  const diagnostics = appRef.injector.get(SyncDiagnosticsService);
  const syncManager = appRef.injector.get(SyncManagerService);

  (window as any).clearLocalData = async () => {
    console.warn('Clearing all local data and sync queue...');
    await db.clearAllData();
    console.log('✅ Data cleared. Please refresh the page.');
  };

  // Expose comprehensive sync diagnostics
  (window as any).syncDiagnostics = {
    /**
     * Get full diagnostics report with recommendations
     */
    report: () => diagnostics.getDiagnosticsSummary(),

    /**
     * Get recent operations (last 20)
     */
    recentOps: () => {
      const ops = (diagnostics as any).operations();
      return ops.slice(-20);
    },

    /**
     * Get all anomalies
     */
    anomalies: () => (diagnostics as any).anomalies(),

    /**
     * Get current metrics
     */
    metrics: () => (diagnostics as any).metrics(),

    /**
     * Get last queue snapshot
     */
    lastSnapshot: () => (diagnostics as any).lastQueueSnapshot,

    /**
     * Trigger sync now
     */
    syncNow: () => syncManager.syncNow(),

    /**
     * Get sync status
     */
    status: () => syncManager.getStatus(),

    /**
     * Reset diagnostics
     */
    reset: () => diagnostics.reset(),

    /**
     * Print formatted report to console
     */
    print: () => {
      const report = diagnostics.getDiagnosticsSummary();
      console.group('📊 Sync Diagnostics Report');
      console.table(report.summary);
      console.group('Recent Operations');
      console.table(report.recentOperations);
      console.groupEnd();
      console.group('Anomalies');
      console.table(report.anomalies);
      console.groupEnd();
      console.group('Recommendations');
      report.recommendations.forEach(rec => console.log(rec));
      console.groupEnd();
      console.groupEnd();
    }
  };

  console.log('💡 Available console utilities:');
  console.log('  - window.clearLocalData() - Clear all offline data');
  console.log('  - window.syncDiagnostics.report() - Get full diagnostics');
  console.log('  - window.syncDiagnostics.recentOps() - View recent sync operations');
  console.log('  - window.syncDiagnostics.anomalies() - View detected anomalies');
  console.log('  - window.syncDiagnostics.metrics() - View sync metrics');
  console.log('  - window.syncDiagnostics.status() - Get current sync status');
  console.log('  - window.syncDiagnostics.syncNow() - Trigger sync immediately');
  console.log('  - window.syncDiagnostics.print() - Print formatted report');
  console.log('  - window.syncDiagnostics.reset() - Reset diagnostics data');
}).catch((err) => console.error(err));
