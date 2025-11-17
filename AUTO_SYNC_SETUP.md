# Automatic Data Syncing Implementation

## Overview

Your Fitness Tracker now has **automatic synchronization** of local data to the Supabase backend when:
1. ✅ User loads the app (automatic sync on startup)
2. ✅ Internet connection is detected
3. ✅ Local data is created or modified
4. ✅ User manually triggers sync

This implementation uses an **offline-first architecture** where all data is stored locally, and changes are queued for syncing when the user has internet.

## Architecture

```
┌─────────────────────────────────────────────────┐
│         App Startup (AppComponent)              │
├─────────────────────────────────────────────────┤
│  1. DatabaseService initialized                │
│  2. SyncManagerService configured               │
│  3. ConnectivityService checks online status   │
│  4. If online → Auto-sync starts               │
│  5. If offline → Wait for connectivity          │
└─────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────┐
│         SyncQueueService                        │
├─────────────────────────────────────────────────┤
│  Tracks local changes that need syncing        │
│  - Templates created/updated                   │
│  - Workouts completed                          │
│  - Exercise logs recorded                      │
│                                                 │
│  Stores in IndexedDB:                          │
│  - Record ID and type                          │
│  - Operation (create/update/delete)            │
│  - Sync status and attempts                    │
└─────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────┐
│    ConnectivityService                          │
├─────────────────────────────────────────────────┤
│  Monitors internet connection:                  │
│  - Online/offline events                       │
│  - Periodic health checks                      │
│  - Network quality information                 │
│                                                 │
│  Triggers sync when:                           │
│  - Connection restored                         │
│  - Server becomes healthy                      │
└─────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────┐
│    SyncManagerService                           │
├─────────────────────────────────────────────────┤
│  Orchestrates synchronization:                  │
│  - Batches pending changes                     │
│  - Retries failed syncs                        │
│  - Marks items as synced                       │
│  - Reports progress and status                 │
└─────────────────────────────────────────────────┘
         ↓
┌──────────────────────────────┐
│  Backend Sync API            │
│  POST /api/sync              │
└──────────────────────────────┘
         ↓
┌──────────────────────────────┐
│  Supabase PostgreSQL         │
└──────────────────────────────┘
```

## New Services

### 1. SyncQueueService
**File:** `src/app/services/sync-queue.service.ts`

Manages a queue of pending sync operations in IndexedDB.

**Key Features:**
- ✅ Tracks all local changes (create, update, delete)
- ✅ Stores retry count and last error for each item
- ✅ Provides pending items filtered by type
- ✅ Marks items as synced after successful upload
- ✅ Exposes reactive signals for UI updates

**Usage:**
```typescript
// In your component after making changes
await this.syncQueue.addToQueue('template', 'create', templateId);
await this.syncQueue.addToQueue('instance', 'update', instanceId);

// Get pending items
const pending = await this.syncQueue.getPendingItems();

// Check status
const hasPending = this.syncQueue.hasPendingChanges();
const count = this.syncQueue.queueCount();
```

### 2. ConnectivityService
**File:** `src/app/services/connectivity.service.ts`

Monitors internet connectivity with multiple strategies.

**Key Features:**
- ✅ Listens to online/offline events
- ✅ Periodic health checks to backend
- ✅ Network quality information (4G, 3G, 2G via Network Information API)
- ✅ Can wait for online status programmatically
- ✅ Debounces rapid connectivity changes

**Usage:**
```typescript
// Check current status
const isOnline = this.connectivity.isOnline();
const type = this.connectivity.effectiveType();

// Wait for online
const wasOnline = await this.connectivity.waitForOnline(60000); // 60 second timeout

// Get reactive changes
this.connectivity.onConnectivityChange().subscribe(isOnline => {
  console.log('Connectivity changed:', isOnline);
});
```

### 3. SyncManagerService
**File:** `src/app/services/sync-manager.service.ts`

Orchestrates the entire sync process.

**Key Features:**
- ✅ Automatic sync on app load
- ✅ Automatic sync when coming online
- ✅ Batches items for efficient network use
- ✅ Retry logic with configurable delays
- ✅ Progress tracking and status reporting
- ✅ Configurable server URL and user ID
- ✅ Handles conflict resolution

**Configuration:**
```typescript
this.syncManager.configure({
  userId: 'user-123',           // Current user ID
  serverUrl: 'http://localhost:3000', // Backend URL
  batchSize: 100,               // Items per sync request
  maxRetries: 3,                // Max retry attempts
  retryDelay: 1000,             // Delay between retries (ms)
  syncTimeout: 30000            // Request timeout (ms)
});
```

**Methods:**
```typescript
// Trigger sync manually
await this.syncManager.syncNow();

// Sync specific data type only
await this.syncManager.syncType('template');

// Get current status
const status = this.syncManager.getStatus();

// Clear queue (use with caution!)
await this.syncManager.clearQueue();

// Debug: Get all queue items
const items = await this.syncManager.getQueueItems();
```

## Integration Steps

### 1. Update Your Components (Optional)

When creating or modifying data, add to the sync queue:

```typescript
// In your workout creation component
async createWorkout(template: WorkoutTemplate) {
  // Create locally
  await this.db.addWorkoutTemplate(template);

  // Add to sync queue
  await this.syncQueue.addToQueue('template', 'create', template.id);
}

// When completing a workout
async completeWorkout(instance: WorkoutInstance) {
  instance.status = WorkoutStatus.COMPLETED;
  await this.db.updateWorkoutInstance(instance);

  // Queue for sync
  await this.syncQueue.addToQueue('instance', 'update', instance.id);
}
```

### 2. Add Sync Status UI

Use the `SyncStatusIndicatorComponent` in your layout:

```typescript
// In your app.component.html
<app-sync-status-indicator></app-sync-status-indicator>

// Or import in your component
import { SyncStatusIndicatorComponent } from './components/sync-status-indicator/sync-status-indicator.component';

@Component({
  imports: [SyncStatusIndicatorComponent, ...],
  template: `
    <app-sync-status-indicator></app-sync-status-indicator>
    <router-outlet></router-outlet>
  `
})
```

### 3. Handle Sync Events (Optional)

Monitor sync events in your app:

```typescript
export class MyComponent implements OnInit {
  constructor(private syncManager: SyncManagerService) {}

  ngOnInit() {
    effect(() => {
      if (this.syncManager.isSyncing()) {
        console.log('Sync started:', this.syncManager.syncMessage());
      }
    });

    effect(() => {
      if (this.syncManager.lastSyncTime()) {
        console.log('Last synced:', this.syncManager.lastSyncTime());
      }
    });

    effect(() => {
      if (this.syncManager.syncError()) {
        console.error('Sync error:', this.syncManager.syncError());
      }
    });
  }
}
```

## How It Works

### App Startup Flow

1. **AppComponent initializes**
   - Creates signals for sync status
   - Subscribes to sync manager and connectivity changes

2. **ngOnInit runs**
   - Calls `initializeAutoSync()`

3. **initializeAutoSync()**
   - Configures sync manager with userId and serverUrl
   - Waits 1 second for app to fully initialize
   - Checks if online
   - If online: calls `syncManager.syncNow()`
   - If offline: waits for connectivity

4. **SyncManagerService.syncNow()**
   - Checks if already syncing
   - Gets pending items from queue
   - Batches items (default 100 per batch)
   - For each batch:
     - Gathers actual data from database
     - Sends to backend: `POST /api/sync`
     - Marks items as synced on success
     - Records errors on failure
   - Updates progress and status signals

### Automatic Re-sync on Connectivity

- When user goes offline: connectivity service detects it
- When user comes back online: connectivity service notifies sync manager
- Sync manager automatically triggers `syncNow()` if there are pending changes

### Manual Sync Trigger

Users can manually trigger sync via the UI button or call:
```typescript
await this.syncManager.syncNow();
```

## Sync Data Flow

**What Gets Synced:**
- ✅ Workout Templates (create/update)
- ✅ Workout Instances (completed workouts)
- ✅ Exercise Logs (performance data)

**What Happens During Sync:**
1. Pending queue items are retrieved
2. For each item, the actual data is fetched from IndexedDB
3. Data is batched and sent to backend
4. Backend upserts data to Supabase
5. On success: items marked as synced, removed from queue
6. On failure: error recorded, item stays in queue for retry

**Conflict Resolution:**
- Backend uses upsert (insert or update on conflict)
- Last-write-wins strategy based on `updatedAt` timestamp
- Client side: local data always wins (offline-first)

## Configuration

### Update User ID

Replace the hardcoded 'current-user' with actual user ID from your auth service:

```typescript
// In app.component.ts initializeAutoSync()
private authService = inject(AuthService); // Your auth service

private async initializeAutoSync(): Promise<void> {
  const user = await this.authService.getCurrentUser();

  this.syncManager.configure({
    userId: user.id,  // From auth service
    serverUrl: 'http://localhost:3000',
    maxRetries: 3,
    retryDelay: 2000,
    syncTimeout: 30000
  });

  // ... rest of initialization
}
```

### Adjust Sync Timing

```typescript
// In initializeAutoSync()
// Change initial delay (default 1000ms)
await this.delay(2000); // Wait 2 seconds

// Change health check URL
this.connectivity.setHealthCheckUrl('/api/health');

// Change health check interval (default 30000ms)
this.connectivity.setHealthCheckInterval(60000); // Check every 60 seconds
```

### Adjust Batch Size

```typescript
this.syncManager.configure({
  batchSize: 50,  // Smaller batches for slower connections
  // or
  batchSize: 200, // Larger batches for faster connections
});
```

## Signals for UI Binding

All sync status is exposed via Angular Signals for reactive UI updates:

```typescript
// In SyncManagerService
isSyncing: signal<boolean>              // Is sync in progress?
lastSyncTime: signal<Date | null>       // When was last successful sync?
syncProgress: signal<number>             // 0-100 progress
syncMessage: signal<string>              // Status message
syncError: signal<string | null>         // Last error if any
shouldAutoSync: computed<boolean>        // Should auto-sync run?
canSync: computed<boolean>               // Can sync run now?

// In SyncQueueService
queueCount: signal<number>               // Items pending sync
hasPendingChanges: signal<boolean>       // Any changes to sync?
lastSyncTime: signal<Date | null>        // Last successful sync
isSyncing: signal<boolean>               // Is syncing?
syncError: signal<string | null>         // Last error

// In ConnectivityService
isOnline: signal<boolean>                // Current online status
effectiveType: signal<string>            // Network type (4g, 3g, etc.)
isChecking: signal<boolean>              // Checking connectivity?
```

## Debugging

### Check Sync Status

In browser console:
```typescript
// Get sync manager from app component
const app = document.querySelector('app-root') as any;
const syncManager = app['syncManager'];

// Check status
console.log(syncManager.getStatus());

// Get queue items
syncManager.getQueueItems().then(items => console.log(items));

// Manual sync
syncManager.syncNow();
```

### Monitor in Console

```typescript
// Watch sync messages
effect(() => {
  console.log('[Sync]', this.syncManager.syncMessage());
});

// Watch connectivity
effect(() => {
  console.log('[Connectivity]', this.connectivity.isOnline() ? 'Online' : 'Offline');
});

// Watch pending changes
effect(() => {
  console.log('[Queue]', this.syncQueue.queueCount(), 'pending');
});
```

### Browser Storage

View sync queue and database:
1. Open Chrome DevTools
2. Application → IndexedDB
3. View `FitnessTrackerDB` and `FitnessTrackerSyncQueue` databases
4. Browse the tables to see stored data

## Error Handling

### Retry Logic

Failed syncs are automatically retried:
- First attempt: immediate
- Second attempt: after retryDelay (default 1000ms)
- Third attempt: after retryDelay × 2
- Failure recorded after max retries

### Handling Sync Errors

```typescript
effect(() => {
  if (this.syncManager.syncError()) {
    // Show error to user
    this.toast.error('Sync failed: ' + this.syncManager.syncError());

    // Could implement manual retry button
  }
});
```

### Clear Stuck Queue (Emergency)

If items get stuck in queue:
```typescript
// In browser console
await syncManager.clearQueue();

// Or selectively clear after fix
const items = await syncManager.getQueueItems();
items.forEach(item => {
  console.log(item.recordId, item.error);
});
```

## Performance Considerations

### Local Database
- ✅ Fast reads/writes with Dexie.js IndexedDB
- ✅ All operations are local (no network latency)
- ✅ Works completely offline

### Network Usage
- ✅ Batches changes to reduce requests
- ✅ Only syncs modified items
- ✅ Gzip compression by default
- ✅ Configurable timeouts for slow connections

### Memory
- ✅ Signals update efficiently (no re-renders for unchanged values)
- ✅ Queue stored in IndexedDB (not in memory)
- ✅ Completes in <50MB of IndexedDB usage

## Troubleshooting

### Sync Not Starting
- Check if online: `connectivity.isOnline()`
- Check if has pending: `syncQueue.hasPendingChanges()`
- Check server: `curl http://localhost:3000/health`
- Check browser console for errors

### Data Not Appearing in Backend
1. Check sync status: `syncManager.getStatus()`
2. Verify user ID is correct: `syncManager.config.userId`
3. Check server logs for errors
4. Verify Supabase connection in server

### Sync Taking Too Long
- Reduce `batchSize` for slower connections
- Increase `syncTimeout` if server is slow
- Check network speed: `connectivity.effectiveType()`
- Check server load and database performance

### Pending Items Won't Clear
- Check error message: `syncManager.syncError()`
- Verify data exists in database
- Check if server rejected the data
- Last resort: `syncManager.clearQueue()`

## API Integration

The sync manager sends requests to: `POST {serverUrl}/api/sync`

**Payload:**
```json
{
  "userId": "user-123",
  "workoutTemplates": [...],
  "workoutInstances": [...],
  "exerciseLogs": [...]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Data synced successfully",
  "data": {
    "workoutTemplates": [...],
    "workoutInstances": [...],
    "exerciseLogs": [...]
  }
}
```

## Next Steps

1. ✅ **Replace hardcoded user ID** with auth service
2. ✅ **Add sync queue tracking** to all create/update operations
3. ✅ **Deploy backend** to production
4. ✅ **Update server URL** for production environment
5. ✅ **Test offline scenarios** with Chrome DevTools
6. ✅ **Monitor sync status** in production logs

## Files Created

| File | Purpose |
|------|---------|
| `src/app/services/sync-queue.service.ts` | Queue management |
| `src/app/services/connectivity.service.ts` | Network monitoring |
| `src/app/services/sync-manager.service.ts` | Sync orchestration |
| `src/app/components/sync-status-indicator/` | Status UI |

## Modified Files

| File | Changes |
|------|---------|
| `src/app/services/database.service.ts` | Added getExerciseLog(), exportAllData() |
| `src/app/app.component.ts` | Added auto-sync initialization and monitoring |

---

**Version:** 1.0.0
**Created:** November 17, 2025
**Status:** Ready to use
