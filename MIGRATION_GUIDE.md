# Database Migration Guide

## Overview
This guide explains how to apply the local_id migration to your Supabase database. The migration adds a `local_id` column to store the original offline database IDs alongside the UUID IDs used in Supabase.

## Why This Migration?
- Your offline (Dexie) database uses custom IDs like "workout-1" and "mhw56kg0oin3vrw06el"
- Supabase requires UUIDs for primary keys
- The migration allows us to:
  - Store the original local ID as `local_id` for reference
  - Generate and store UUIDs as the primary `id` for Supabase
  - Map between local and cloud IDs on sync

## Migration Details
The migration file `server/src/db/migrations/0001_add_local_id.sql` adds three new columns:
- `workout_templates.local_id` (varchar 255)
- `workout_instances.local_id` (varchar 255)
- `exercise_logs.local_id` (varchar 255)

Plus indexes on each for faster lookups.

## How to Apply the Migration

### Option 1: Using Drizzle Kit (Recommended)
Run this command in the server directory:

```bash
cd server
npx drizzle-kit push:pg
```

This will:
1. Connect to your Supabase database using `SUPABASE_SERVICE_ROLE_KEY`
2. Apply all pending migrations
3. Update the schema in Supabase

### Option 2: Manual SQL (Alternative)
If you prefer to run the SQL directly in Supabase:

1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy and paste the contents of `server/src/db/migrations/0001_add_local_id.sql`
4. Execute

## Environment Setup
Make sure your `.env` file in the server directory has:

```env
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://user:password@host/database
```

Or for Netlify:
```
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=your-postgres-connection-string
```

## Verification
After running the migration, verify the columns were added:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'workout_templates'
AND column_name = 'local_id';
```

Should return: `local_id | character varying`

## What Happens During Sync
After migration, the sync process will:

1. **First Sync (New Data):**
   ```
   Local: {id: "workout-1", name: "Upper Body"}
       ↓ (no cloudId yet)
   Server: Generates UUID, stores as {id: "550e8400...", local_id: "workout-1"}
   ```

2. **Subsequent Syncs (Updates):**
   ```
   Local: {id: "workout-1", cloudId: "550e8400...", name: "Upper Body V2"}
       ↓ (has cloudId)
   Server: Uses UUID "550e8400..." directly for upsert
   ```

## Rollback (If Needed)
If you need to rollback this migration:

```sql
ALTER TABLE "workout_templates" DROP COLUMN "local_id";
DROP INDEX IF EXISTS "idx_workout_templates_local_id";

ALTER TABLE "workout_instances" DROP COLUMN "local_id";
DROP INDEX IF EXISTS "idx_workout_instances_local_id";

ALTER TABLE "exercise_logs" DROP COLUMN "local_id";
DROP INDEX IF EXISTS "idx_exercise_logs_local_id";
```

## Next Steps
1. Apply this migration to Supabase
2. Rebuild and test the sync with your app
3. Existing data will have `local_id = NULL` until synced again
4. New syncs will populate `local_id` automatically
