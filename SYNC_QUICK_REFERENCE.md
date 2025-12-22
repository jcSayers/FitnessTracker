# Sync Debugging - Quick Reference

## Console Commands

```javascript
// ========================================
// DIAGNOSTICS & REPORTING
// ========================================

// Get full report with recommendations
window.syncDiagnostics.report()

// Print formatted report to console
window.syncDiagnostics.print()

// Get metrics (total syncs, success rate, duration)
window.syncDiagnostics.metrics()

// View last 20 operations with duration/items/queue changes
window.syncDiagnostics.recentOps()

// View all detected anomalies
window.syncDiagnostics.anomalies()

// View current queue state
window.syncDiagnostics.lastSnapshot()

// ========================================
// SYNC CONTROL
// ========================================

// Check current sync status
window.syncDiagnostics.status()

// Trigger sync immediately
window.syncDiagnostics.syncNow()

// Reset diagnostics (keep data)
window.syncDiagnostics.reset()

// Clear all offline data (complete reset)
window.clearLocalData()

// ========================================
// QUICK CHECKS
// ========================================

// Check if online
window.syncDiagnostics.status().isOnline

// Check queue size
window.syncDiagnostics.status().queueCount

// Check sync success rate
const m = window.syncDiagnostics.metrics();
const rate = (m.successfulSyncs / m.totalSyncs * 100).toFixed(0);

// Check for problems
const report = window.syncDiagnostics.report();
report.summary.anomaliesCount === 0 ? "✅ OK" : "❌ Issues: " + report.summary.anomaliesCount

// ========================================
// DEBUGGING SPECIFIC ISSUES
// ========================================

// Queue growing?
const snapshot = window.syncDiagnostics.lastSnapshot();
snapshot.totalItems > 100 ? console.warn("Queue size:", snapshot.totalItems) : console.log("Queue OK");

// Duplicates in queue?
const snapshot = window.syncDiagnostics.lastSnapshot();
snapshot.duplicateRecordIds.length > 0 ? console.warn("Duplicates:", snapshot.duplicateRecordIds) : console.log("No duplicates");

// Repeated failures?
const report = window.syncDiagnostics.report();
report.summary.consecutiveFailures > 0 ? console.error("Failures:", report.summary.consecutiveFailures) : console.log("No failures");

// Recent operation status
const ops = window.syncDiagnostics.recentOps();
ops[ops.length - 1];  // Latest operation

// Average sync duration
const m = window.syncDiagnostics.metrics();
console.log("Avg sync:", m.averageSyncDuration + "ms");

// Items synced vs failed
const report = window.syncDiagnostics.report();
const recent = report.recentOperations[report.recentOperations.length - 1];
console.log(`Last sync: ${recent.itemsProcessed} items`);
```

## Common Issues

### Issue: Sync API called repeatedly
**Check:**
```javascript
const ops = window.syncDiagnostics.recentOps();
ops.filter(o => o.type === 'full_sync').length > 5 // Many syncs?
```
**Look for:** Rapid retries, queue growing, safeguard messages

---

### Issue: Queue not clearing
**Check:**
```javascript
const snapshot = window.syncDiagnostics.lastSnapshot();
snapshot.totalItems; // Should be 0 after sync
```
**Look for:** Items with `synced: false` after successful sync

---

### Issue: Sync is slow
**Check:**
```javascript
const m = window.syncDiagnostics.metrics();
m.averageSyncDuration; // In milliseconds
```
**Look for:** > 5000ms indicates slow network or large payloads

---

### Issue: Sync failing repeatedly
**Check:**
```javascript
const report = window.syncDiagnostics.report();
report.summary.failedSyncs; // Number of failed syncs
report.anomalies.filter(a => a.type === 'high_failure_rate'); // Failure alerts
```
**Look for:** Connection issues, server down, validation errors

---

### Issue: Safeguard is blocking sync
**Check Console for:**
```
[SyncManager] SAFEGUARD BLOCKED:
- Queue size exceeded (check for duplicates)
- Too many failures (wait for cooldown or restart)
- Attempted too frequently (wait 1 second)
```
**Look for:** Messages explain which safeguard was triggered

---

## Recommended Monitoring Setup

### Health Check (run every 10 seconds)
```javascript
setInterval(() => {
  const report = window.syncDiagnostics.report();

  if (report.summary.anomaliesCount > 0) {
    console.warn('⚠️ Anomalies detected:', report.anomalies);
  }

  const status = window.syncDiagnostics.status();
  if (status.queueCount > 100) {
    console.warn('⚠️ Large queue:', status.queueCount);
  }

  if (report.summary.consecutiveFailures > 0) {
    console.error('❌ Sync failures:', report.summary.consecutiveFailures);
  }
}, 10000);
```

### Performance Monitor
```javascript
setInterval(() => {
  const m = window.syncDiagnostics.metrics();
  console.log(`Syncs: ${m.totalSyncs}, Success: ${m.successfulSyncs}/${m.totalSyncs}, ` +
    `Avg: ${m.averageSyncDuration}ms, Synced: ${m.totalItemsSynced} items`);
}, 60000);
```

### Anomaly Watcher
```javascript
let lastAnomalyCount = 0;
setInterval(() => {
  const anomalies = window.syncDiagnostics.anomalies();
  if (anomalies.length > lastAnomalyCount) {
    const newAnomalies = anomalies.slice(lastAnomalyCount);
    console.warn('🚨 New anomalies:', newAnomalies);
    lastAnomalyCount = anomalies.length;
  }
}, 5000);
```

## Queue State Breakdown

```javascript
const snapshot = window.syncDiagnostics.lastSnapshot();

// By type
console.log('Templates:', snapshot.byType.template);
console.log('Instances:', snapshot.byType.instance);
console.log('Logs:', snapshot.byType.log);

// By operation
console.log('Creates:', snapshot.byOperation.create);
console.log('Updates:', snapshot.byOperation.update);
console.log('Deletes:', snapshot.byOperation.delete);

// Total
console.log('Total items:', snapshot.totalItems);

// Duplicates
if (snapshot.duplicateRecordIds.length > 0) {
  console.warn('Duplicate items:', snapshot.duplicateRecordIds);
}
```

## Sync Metrics Explained

```javascript
const m = window.syncDiagnostics.metrics();

m.totalSyncs              // Total number of sync operations
m.successfulSyncs         // How many completed successfully
m.failedSyncs             // How many failed
m.averageSyncDuration     // Average time in milliseconds
m.totalItemsSynced        // Total items successfully synced
```

## Anomaly Types Quick Reference

| Type | Means | Action |
|------|-------|--------|
| **queue_growth** | Items accumulating | Check for duplicates or validation errors |
| **duplicate_items** | Same item twice | Check sync logic for duplicate adds |
| **high_failure_rate** | Sync failing | Check network and server |
| **rapid_retries** | Sync too frequent | Wait or check effect debounce |
| **stuck_items** | Item in queue 5+ min | Check item for validation errors |

## Emergency Commands

```javascript
// If sync is stuck, reset diagnostics
window.syncDiagnostics.reset()

// If everything is broken, clear all data
window.clearLocalData()
// Then refresh the page
```

## Status Check (All-In-One)

```javascript
(function healthCheck() {
  const report = window.syncDiagnostics.report();
  const status = window.syncDiagnostics.status();

  console.group('📊 SYNC HEALTH CHECK');

  // Status
  console.log('Online:', status.isOnline ? '✅' : '❌');
  console.log('Syncing:', status.isSyncing ? '⏳' : '✅');
  console.log('Queue:', `${status.queueCount} items`);

  // Metrics
  const m = report.summary.metrics;
  console.log(`Syncs: ${m.totalSyncs} (${m.successfulSyncs}✅ ${m.failedSyncs}❌)`);
  console.log(`Avg Duration: ${m.averageSyncDuration}ms`);

  // Issues
  if (report.summary.anomaliesCount > 0) {
    console.warn(`⚠️ ${report.summary.anomaliesCount} anomalies detected:`);
    report.anomalies.forEach(a => console.log(`  - ${a.type}: ${a.message}`));
  } else {
    console.log('✅ No anomalies');
  }

  // Recommendations
  console.group('Recommendations');
  report.recommendations.forEach(r => console.log(r));
  console.groupEnd();

  console.groupEnd();
})();
```

## For Detailed Debugging

See [SYNC_DEBUGGING_GUIDE.md](SYNC_DEBUGGING_GUIDE.md) for:
- Complete API documentation
- Detailed workflows
- Configuration options
- Prevention rules
- Integration examples
