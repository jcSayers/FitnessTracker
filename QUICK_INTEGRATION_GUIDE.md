# Quick Integration Guide - Automatic Sync

## 5-Minute Setup

### Step 1: Configure User ID
Update the app component with your auth service's user ID:

```typescript
// src/app/app.component.ts - in initializeAutoSync()
private authService = inject(AuthService); // Your auth service

// Replace this:
userId: 'current-user',

// With this:
userId: (await this.authService.getCurrentUser()).id,
```

### Step 2: Update Server URL for Production
```typescript
// In app component configuration
serverUrl: environment.production
  ? 'https://api.yourdomain.com'
  : 'http://localhost:3000',
```

### Step 3: Add Sync Tracking to Your Components
When users create/modify data, add to sync queue:

```typescript
// Example: Creating a workout
async createTemplate(template: WorkoutTemplate) {
  // Save locally
  await this.db.addWorkoutTemplate(template);

  // Queue for sync
  await this.syncQueue.addToQueue('template', 'create', template.id);
}

// Example: Completing a workout
async finishWorkout(instance: WorkoutInstance) {
  instance.status = WorkoutStatus.COMPLETED;
  instance.endTime = new Date();

  await this.db.updateWorkoutInstance(instance);
  await this.syncQueue.addToQueue('instance', 'update', instance.id);
}
```

### Step 4: Display Sync Status (Optional)
Add indicator to your layout:

```typescript
// In your app.component.html
<app-sync-status-indicator></app-sync-status-indicator>
<router-outlet></router-outlet>
```

### Step 5: Test It!
1. Create some workout data locally
2. Check DevTools → Application → IndexedDB → FitnessTrackerSyncQueue
3. Make sure server is running: `npm run dev:full` (from root)
4. Watch the sync happen automatically!

## What Happens Automatically

✅ **On App Load:**
- Checks if online
- Syncs any pending local data to server
- Monitors for new changes

✅ **When Coming Online:**
- Detects connectivity restored
- Automatically syncs queued changes
- Shows progress to user

✅ **In Background:**
- Monitors connection every 30 seconds
- Queues changes as they happen
- Batches sync to be efficient

## Verify It's Working

### Browser Console
```javascript
// Check sync manager
const syncManager = ng.probe(document.querySelector('app-root')).injector.get('SyncManagerService');
syncManager.getStatus();

// Should show:
// {
//   isSyncing: false,
//   lastSyncTime: Date,
//   queueCount: 0,
//   isOnline: true,
//   ...
// }
```

### DevTools Network Tab
1. Open DevTools → Network
2. Create a new workout
3. Look for `POST /api/sync` request
4. Should see it batched with your data

### IndexedDB
1. DevTools → Application → IndexedDB
2. Open `FitnessTrackerSyncQueue`
3. View the `syncQueue` table
4. Should see items appear when you create data
5. Should see items disappear after sync succeeds

## Common Customizations

### Change Auto-Sync Delay
```typescript
// In app component initializeAutoSync()
await this.delay(2000); // Changed from 1000ms
```

### Change Batch Size
```typescript
// Sync smaller batches for slow connections
this.syncManager.configure({
  batchSize: 50  // Changed from 100
});

// Or larger for fast connections
this.syncManager.configure({
  batchSize: 200
});
```

### Disable Auto-Sync (Manual Only)
```typescript
// In app component - comment out automatic sync
// await this.syncManager.syncNow();

// Users call manually via button
async manualSync() {
  await this.syncManager.syncNow();
}
```

### Custom Retry Logic
```typescript
this.syncManager.configure({
  maxRetries: 5,      // More retries
  retryDelay: 5000    // Longer delay between retries
});
```

## Testing Offline Mode

### Simulate Offline in Chrome
1. DevTools → Network → Throttle dropdown
2. Select "Offline"
3. Create some workouts
4. Watch queue populate in DevTools
5. Turn off Offline mode
6. Watch it auto-sync!

### Test Network Latency
1. DevTools → Network → Throttle dropdown
2. Select "Slow 3G" or "Fast 3G"
3. Create data and watch sync handle the slow connection

### Disable Server
1. Stop the backend: `Ctrl+C`
2. App should go offline automatically
3. Create some local data
4. Restart backend
5. Watch auto-sync resume

## Troubleshooting

### Sync Not Starting
- [ ] Is server running? `npm run dev` in `/server`
- [ ] Is browser online? Check DevTools → Network tab
- [ ] Are there pending changes? Open IndexedDB and check queue
- [ ] Check browser console for errors

### Data Not Syncing to Backend
- [ ] Check user ID is correct
- [ ] Verify server URL is correct
- [ ] Test: `curl http://localhost:3000/health`
- [ ] Check server logs for errors
- [ ] Try manual sync: `syncManager.syncNow()` in console

### Performance Issues
- [ ] Reduce batch size for slow connections
- [ ] Check for large images in workout data
- [ ] Monitor network tab for request size
- [ ] Check Supabase query logs

## Files You Modified

1. **app.component.ts** - Added auto-sync initialization
2. **database.service.ts** - Added export methods

## New Services (Auto-Injected)

1. **SyncManagerService** - Orchestrates sync
2. **SyncQueueService** - Tracks changes
3. **ConnectivityService** - Monitors connection

You don't need to inject these manually - they're provided at root level!

## Next Steps

1. [ ] Configure real user ID from auth service
2. [ ] Add sync queue tracking to all create/update operations
3. [ ] Test offline scenarios
4. [ ] Deploy backend to production
5. [ ] Update server URL for production
6. [ ] Monitor sync logs in production

## Need Help?

- Full docs: `AUTO_SYNC_SETUP.md`
- Server API: `SWAGGER_SETUP.md`
- Server setup: `SYNC_SERVER_SETUP.md`
- Sync server code: `server/QUICK_REFERENCE.md`

---

**Everything is ready to use - just add user IDs and you're done!**
