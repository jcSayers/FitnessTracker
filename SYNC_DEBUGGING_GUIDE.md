# Sync Debugging and Monitoring Guide

This guide explains the comprehensive sync diagnostics, logging, safeguards, and monitoring system that prevents the exponential queue growth issue from happening again.

## Overview

The sync system now includes four layers of protection:

1. **Detailed Logging** - Comprehensive logging at every sync step
2. **Anomaly Detection** - Real-time detection of unusual sync patterns
3. **Safeguards** - Rate limiting, queue size checks, and failure thresholds
4. **Monitoring Dashboard** - Browser console utilities for inspecting sync state

## Layer 1: Detailed Logging

Every sync operation is tracked with detailed information:

### What Gets Logged

```
[SyncManager] Syncing 5 pending changes
[SyncManager] Sending batch payload (5 items):
  - templates: 1
  - instances: 2
  - logs: 2
[SyncManager] Batch synced successfully
[SyncManager] Marked 5 items as synced in queue
[SyncManager] Cleared synced items from queue
[SyncManager] Sync complete: 5 synced, 0 failed
```

### Diagnostics Operations

Each sync operation is tracked with:
- **Operation ID** - Unique identifier for tracing
- **Timestamp** - When the operation started
- **Duration** - How long the sync took
- **Items Processed** - Number of items synced
- **Queue Before/After** - Queue size changes
- **Status** - completed, failed, or started
- **Error Messages** - If sync failed

Example in console:
```javascript
window.syncDiagnostics.recentOps()
// Returns:
[
  {
    id: "full_sync-1700000000000-abc123",
    timestamp: 1700000000000,
    type: "full_sync",
    status: "completed",
    duration: 2450,
    itemsProcessed: 5,
    queueSizeBefore: 5,
    queueSizeAfter: 0
  }
]
```

## Layer 2: Anomaly Detection

Real-time detection and alerting for unusual patterns:

### Detected Anomalies

1. **queue_growth** - Items being added faster than synced
   - Triggered if queue grows > 30% in one sync
   - Triggered if queue exceeds 1000 items
   - Indicates: Data entry loops, validation errors, or duplicate syncing

2. **duplicate_items** - Same recordId appearing multiple times in queue
   - Indicates: Items being queued without checking if already pending
   - Solution: Check if items exist in queue before adding

3. **high_failure_rate** - Multiple consecutive sync failures
   - Triggered after 3 consecutive failures
   - Indicates: Network issues, server problems, or data validation errors
   - Solution: Check network, server logs, or data for validation issues

4. **rapid_retries** - Sync attempts happening too quickly
   - Triggered if retry happens within 1 second of last attempt
   - Indicates: Infinite retry loop or effect triggering too frequently
   - Solution: Debounce, check effect dependencies

5. **stuck_items** - Items in queue for 5+ minutes
   - Indicates: Items failing to sync or ignored errors
   - Solution: Check error logs, data validation

### Viewing Anomalies

```javascript
// Get all detected anomalies
window.syncDiagnostics.anomalies()

// Example output:
[
  {
    id: "queue_growth-1700000000000-abc123",
    timestamp: 1700000000000,
    severity: "critical",
    type: "queue_growth",
    message: "Queue grew unexpectedly by 50%",
    data: { before: 100, after: 150, percentChange: 50 }
  }
]
```

## Layer 3: Safeguards

Automatic blocking of sync operations that would cause problems:

### Safeguard Checks

| Safeguard | Limit | Action |
|-----------|-------|--------|
| Max Queue Size | 1000 items | Block sync, alert user |
| Min Time Between Syncs | 1000ms (1 sec) | Throttle rapid syncs, prevent API spam |
| Consecutive Failures | 3 failures | Block sync, suggest restart |
| Sync Duration | 120 seconds | Detect if sync is stuck |

### Safeguard Behavior

When a safeguard is triggered:

1. Sync is blocked with clear error message
2. Error is logged to browser console
3. Anomaly alert is recorded
4. User sees message in sync status UI
5. Diagnostics dashboard shows reason for block

Example:
```javascript
// Try to sync but safeguard blocks it
await window.syncDiagnostics.syncNow()
// Returns: false
// Console shows: "[SyncManager] SAFEGUARD BLOCKED: Queue size exceeded safeguard limit (1050 > 1000)..."
```

## Layer 4: Monitoring Dashboard

Browser console utilities for inspecting and controlling sync:

### Available Commands

```javascript
// Get comprehensive diagnostics report
window.syncDiagnostics.report()

// Get recent operations (last 20)
window.syncDiagnostics.recentOps()

// Get all detected anomalies
window.syncDiagnostics.anomalies()

// Get sync metrics
window.syncDiagnostics.metrics()

// Get last queue snapshot
window.syncDiagnostics.lastSnapshot()

// Get current sync status
window.syncDiagnostics.status()

// Trigger sync immediately
window.syncDiagnostics.syncNow()

// Print formatted report to console
window.syncDiagnostics.print()

// Reset all diagnostics data
window.syncDiagnostics.reset()

// Clear all offline data (complete reset)
window.clearLocalData()
```

### Dashboard Examples

#### Full Report
```javascript
window.syncDiagnostics.report()

{
  summary: {
    totalOperations: 15,
    metrics: {
      totalSyncs: 5,
      successfulSyncs: 4,
      failedSyncs: 1,
      averageSyncDuration: 2100,
      totalItemsSynced: 25
    },
    consecutiveFailures: 0,
    anomaliesCount: 1,
    criticalAnomalies: 0
  },
  recentOperations: [
    {
      type: "full_sync",
      status: "completed",
      duration: 2450,
      itemsProcessed: 5,
      queueChange: -5
    }
  ],
  anomalies: [...],
  recommendations: [
    "✅ No anomalies detected - sync is operating normally"
  ]
}
```

#### Metrics
```javascript
window.syncDiagnostics.metrics()

{
  totalSyncs: 5,
  successfulSyncs: 4,
  failedSyncs: 1,
  averageSyncDuration: 2100,  // milliseconds
  totalItemsSynced: 25
}
```

#### Queue Snapshot
```javascript
window.syncDiagnostics.lastSnapshot()

{
  timestamp: 1700000000000,
  totalItems: 0,
  byType: {
    template: 0,
    instance: 0,
    log: 0
  },
  byOperation: {
    create: 0,
    update: 0,
    delete: 0
  },
  duplicateRecordIds: []
}
```

## Debugging Workflow

### Symptom: Sync API called repeatedly

1. Open browser DevTools console
2. Run `window.syncDiagnostics.print()` to see formatted report
3. Check console logs for `[SyncManager]` and `[SyncDiagnostics]` messages
4. Look for anomalies in the report
5. Check if any safeguards are blocking sync

### Symptom: Queue growing exponentially

1. Run `window.syncDiagnostics.lastSnapshot()` to see queue composition
2. Look for `duplicateRecordIds` - indicates items being queued multiple times
3. Check `recentOperations` - see if items are not being cleared after sync
4. Run `window.syncDiagnostics.anomalies()` to see detected issues
5. Check if "queue_growth" anomalies are being reported

**Common Causes:**
- Items not being cleared after successful sync (missing `clearSyncedItems()` call)
- Items being re-queued on page reload (missing `synced` flag check in database)
- Duplicate items in queue (items being added without checking if already pending)

### Symptom: Sync fails repeatedly

1. Run `window.syncDiagnostics.status()` to see sync status and error
2. Check `recentOps()` for failed operations
3. Look at the error message in the UI or console
4. Run `window.syncDiagnostics.anomalies()` to see failure anomalies
5. Check safeguards with `window.syncDiagnostics.report().summary.consecutiveFailures`

**Common Causes:**
- Network connectivity issues (check `status().isOnline`)
- Server down or not responding (check server logs)
- Data validation errors on server (check server response errors)
- RLS permissions preventing write (check Supabase RLS policies)

### Symptom: Sync is slow

1. Run `window.syncDiagnostics.metrics()` to see average sync duration
2. Check `recentOps()` to see duration of recent syncs
3. Run `window.syncDiagnostics.lastSnapshot()` to see queue size
4. If queue is large, consider:
   - Increasing `batchSize` in SyncConfig
   - Checking for very large objects (images, long texts)
   - Looking for validation that's taking time

### Symptom: App keeps retrying sync

1. Check if safeguard is throttling: `window.syncDiagnostics.report()`
2. Look for "rapid_retries" in anomalies
3. Check console for "SAFEGUARD THROTTLED" messages
4. Verify effect dependencies in `initializeAutoSync()`
5. Check debounce timing (should be 2000ms)

## Safeguard Configuration

Edit `safeguards` object in [src/app/services/sync-manager.service.ts](src/app/services/sync-manager.service.ts):

```typescript
private safeguards = {
  maxQueueSize: 1000,              // Max items in queue before blocking
  maxConsecutiveFailures: 3,       // Max retry attempts before stopping
  minTimeBetweenSyncs: 1000,       // Min milliseconds between syncs (prevents spam)
  maxSyncDuration: 120000,         // Max 2 minutes for a sync operation
  detectedDuplicatePrevention: true // Track duplicates in queue
};
```

**Recommendations:**
- Keep `maxQueueSize` at 1000 (prevents memory issues)
- Keep `maxConsecutiveFailures` at 3 (allows a few retries)
- Keep `minTimeBetweenSyncs` at 1000 (prevents API spam)
- Keep `maxSyncDuration` at 120000 (detects stuck syncs)

## Anomaly Detection Configuration

Edit thresholds in [src/app/services/sync-diagnostics.service.ts](src/app/services/sync-diagnostics.service.ts):

```typescript
private alertThresholds = {
  queueGrowthPercentage: 30,       // Alert if queue grows > 30% in one sync
  maxConsecutiveFailures: 3,       // Alert after this many failures
  rapidRetryWindow: 5000,          // Warn if retry within 5 sec
  stuckItemDuration: 300000        // Alert if item in queue 5+ minutes
};
```

## Integration Points

### Key Files Modified

1. **sync-manager.service.ts** - Core sync orchestration
   - Added safeguard checks
   - Added diagnostics logging at each step
   - Added queue tracking and monitoring
   - Added rate limiting

2. **sync-diagnostics.service.ts** - New diagnostics service
   - Tracks all sync operations
   - Detects anomalies
   - Stores metrics and snapshots
   - Generates reports

3. **sync-queue.service.ts** - Queue management
   - Added `getQueueSnapshot()` method for diagnostics
   - Works with diagnostics service for monitoring

4. **main.ts** - App bootstrap
   - Exposes diagnostics dashboard to `window.syncDiagnostics`
   - Exposes data clearing utility to `window.clearLocalData`

## Prevention Rules

To prevent queue growth in the future:

### Rule 1: Always Check Synced Flag
Before re-queuing items on startup:
```typescript
if (!pendingIds.has(template.id) && !template.synced) {
  // Only re-queue if NOT in queue AND NOT already synced
}
```

### Rule 2: Clear Synced Items After Sync
After successful sync:
```typescript
if (allSuccess) {
  await this.syncQueue.clearSyncedItems();
}
```

### Rule 3: Debounce Auto-Sync Effect
Prevent rapid retries:
```typescript
const syncDebounceMs = 2000;
if (now - lastSyncAttempt >= syncDebounceMs) {
  this.syncNow();
}
```

### Rule 4: Check for Duplicates
Before adding to queue:
```typescript
const existing = await this.syncQueue.getPendingItems();
if (!existing.some(item => item.recordId === recordId && item.dataType === dataType)) {
  await this.syncQueue.addToQueue(dataType, 'create', recordId);
}
```

### Rule 5: Monitor Queue Size
Regular health checks:
```javascript
// In your components or services periodically:
const status = window.syncDiagnostics.status();
if (status.queueCount > 100) {
  console.warn('Queue size unusually high:', status.queueCount);
}
```

## Testing the System

### Test Infinite Loop Prevention
1. Open DevTools Network tab
2. Create a new workout item
3. Watch network tab - should see only one POST to /api/sync
4. Check `window.syncDiagnostics.recentOps()` - should show one completed operation

### Test Queue Clearing
1. Create 5 items
2. Wait for sync to complete
3. Refresh page
4. Should NOT sync again (items already synced)
5. Run `window.syncDiagnostics.lastSnapshot()` - should show 0 items in queue

### Test Rate Limiting
1. Try to force sync: `await window.syncDiagnostics.syncNow()`
2. Immediately try again (within 1 second)
3. Second attempt should return false and show "SAFEGUARD THROTTLED"

### Test Anomaly Detection
1. Create 100+ items quickly
2. Watch console for "queue_growth" anomaly
3. Run `window.syncDiagnostics.anomalies()` to verify detection

## Performance Impact

The diagnostics system is designed to have minimal performance impact:

- **Memory**: Stores last 1000 operations, 100 snapshots, 100 anomalies (~500KB)
- **CPU**: Logging and anomaly detection happen after sync completes
- **Network**: No additional network requests

Data is automatically pruned to prevent memory growth.

## Emergency Reset

If sync gets stuck and safeguards are blocking:

```javascript
// Option 1: Clear diagnostics but keep data
window.syncDiagnostics.reset()

// Option 2: Clear all offline data (complete reset)
window.clearLocalData()
// Then refresh the page
```

## Support and Debugging

For sync issues:

1. Gather diagnostics: `copy(JSON.stringify(window.syncDiagnostics.report()))`
2. Check browser console for `[SyncManager]` and `[SyncDiagnostics]` logs
3. Check server logs for API errors
4. Review anomalies: `window.syncDiagnostics.anomalies()`
5. Check queue state: `window.syncDiagnostics.lastSnapshot()`
6. Compare with metrics: `window.syncDiagnostics.metrics()`
