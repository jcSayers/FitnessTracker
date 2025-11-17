# Drizzle ORM Migration Guide for Fitness Tracker

## Overview
This guide explains how to manage database migrations for the Fitness Tracker Supabase database using Drizzle ORM.

## Setup

### 1. Environment Configuration

Create a `.env` file in the `server/` directory with your Supabase connection string:

```bash
# server/.env
DATABASE_URL="postgresql://postgres.[PROJECT-ID].pooler.supabase.com:6543/postgres?sslmode=require"
```

**Important**: Replace `[YOUR-PASSWORD]` with your actual Supabase database password from the Supabase dashboard.

### 2. Configuration File

The `drizzle.config.ts` file is already configured in the server root:

```typescript
{
  schema: "./src/db/schema.ts",           // Where your table definitions are
  out: "./src/db/migrations",             // Where migration files are generated
  dialect: "postgresql",                  // Database type
  dbCredentials: {
    url: process.env.DATABASE_URL || "", // Connection string from .env
  },
  verbose: true,                          // Show detailed output
  strict: true,                           // Strict mode for type safety
}
```

## Database Schema

The schema is defined in `server/src/db/schema.ts` with the following tables:

### Tables

1. **users** - User accounts
   - `id` (UUID, primary key)
   - `email` (varchar, unique)
   - `created_at` / `updated_at` (timestamps)

2. **workout_templates** - Workout blueprints created by users
   - `id` (UUID, primary key)
   - `user_id` (foreign key → users)
   - `name`, `description`, `exercises` (JSONB)
   - `difficulty`, `category`, `is_active`
   - Indexed by: `user_id`, `created_at`

3. **workout_instances** - Actual workout sessions
   - `id` (UUID, primary key)
   - `user_id`, `template_id` (foreign keys)
   - `start_time`, `end_time`, `total_duration`
   - `sets` (JSONB), `status`, `notes`, `location`
   - Garmin metrics: `heart_rate_avg`, `cadence_avg`, `distance`, `elevation_gain`, `calories`
   - `external_source`, `external_id` (for Garmin sync)
   - Indexed by: `user_id`, `status`, `created_at`, `external_id`

4. **exercise_logs** - Individual exercise tracking
   - `id` (UUID, primary key)
   - `user_id` (foreign key → users)
   - `exercise_name`, `date`, `sets` (JSONB)
   - `personal_record` (JSONB)
   - Garmin metrics: `heart_rate_*`, `cadence_*`, `speed_*`, `power_*`, `elevation_*`, `gps_data`
   - `external_source`, `external_id`, `external_data`
   - Indexed by: `user_id`, `date`, `exercise_name`, `external_id`

5. **sync_status** - Tracks synchronization state
   - `user_id` (UUID, primary key & foreign key)
   - `last_sync_time`, `status`, `error_message`
   - `synced_templates`, `synced_instances`, `synced_logs` (counters)
   - Indexed by: `updated_at`

### Relationships

```
users (1) ──── (many) workout_templates
users (1) ──── (many) workout_instances
users (1) ──── (many) exercise_logs
users (1) ──── (one) sync_status

workout_templates (1) ──── (many) workout_instances
```

## Migration Workflow

### Step 1: Update Schema

Modify your tables in `server/src/db/schema.ts`:

```typescript
// Example: Add a new column
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }), // ← New column
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});
```

### Step 2: Generate Migration

Run the generate command to create SQL migration files:

```bash
cd server
npm run db:generate
```

This will:
- Analyze your schema against the current database state
- Create a new timestamped SQL file in `server/src/db/migrations/`
- Name it with a pattern: `NNNN_<descriptive_name>.sql`

Example output:
```
src/db/migrations/0001_add_phone_to_users.sql
```

### Step 3: Review Migration SQL

Always review the generated SQL before applying:

```bash
cat server/src/db/migrations/0001_add_phone_to_users.sql
```

Example SQL:
```sql
ALTER TABLE "users" ADD COLUMN "phone" varchar(20);
```

### Step 4: Apply Migration

Run migrations to your Supabase database:

```bash
cd server
npm run db:migrate
```

This will:
- Create a `drizzle` schema in your database (first run only)
- Track applied migrations in `drizzle._migrations` table
- Execute pending migration files sequentially
- Show success/failure status

## Available Commands

All Drizzle commands are available via npm scripts in `server/package.json`:

```bash
# Generate SQL migrations from schema changes
npm run db:generate

# Apply pending migrations to database
npm run db:migrate

# Push schema changes directly (no migration files - rapid dev)
npm run db:push

# Pull existing database schema into TypeScript
npm run db:pull

# Open Drizzle Studio web UI (visual database management)
npm run db:studio
```

## Generated Migration Files

The initial migration `0000_overconfident_post.sql` includes:

1. **Table Creations** (5 tables):
   - `exercise_logs` (24 columns, 4 indexes, 1 foreign key)
   - `sync_status` (9 columns, 1 index, 1 foreign key)
   - `users` (4 columns)
   - `workout_instances` (23 columns, 4 indexes, 2 foreign keys)
   - `workout_templates` (11 columns, 2 indexes, 1 foreign key)

2. **Foreign Key Constraints**:
   - All tables cascade-delete on user deletion
   - workout_instances → workout_templates uses "set null"

3. **Indexes** (10 total):
   - Primary optimizations on `user_id`, `status`, `created_at`, `external_id`
   - Sorted by modification time for query efficiency

4. **Default Values**:
   - UUIDs auto-generate using `gen_random_uuid()`
   - Timestamps use `now()`
   - JSONB columns default to empty arrays `[]`
   - Status enums have sensible defaults

## Troubleshooting

### Connection Issues

**Error**: `password authentication failed`

**Solution**: Update `server/.env` with your actual Supabase password:
```bash
# Get from Supabase Dashboard → Settings → Database → Connection String
DATABASE_URL="postgresql://postgres.YOURPROJECT:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"
```

### Migration Already Applied

**Error**: `Migration already applied` or duplicate migration issues

**Solution**: Check migration history:
```bash
npm run db:migrate -- --list
```

The `drizzle._migrations` table tracks applied migrations. If there's a conflict, you may need to manually check and repair:

```bash
npm run db:migrate -- --repair
```

### Schema Conflicts

If your database schema doesn't match the TypeScript schema:

**Option 1**: Pull the database schema into TypeScript
```bash
npm run db:pull
```

**Option 2**: Push TypeScript schema to database (⚠️ careful with production)
```bash
npm run db:push
```

## Best Practices

### ✅ Do's

1. **Always review migrations** before applying to production
2. **Test locally first** using a development database
3. **Commit migration files** to version control
4. **Use descriptive names** when making schema changes
5. **Keep migrations small** - one logical change per migration
6. **Use cascade delete** for dependent records
7. **Index foreign keys** for query performance
8. **Add timestamps** (`created_at`, `updated_at`) to audit tables

### ❌ Don'ts

1. **Don't modify migration files** after applying them
2. **Don't push to production** without testing
3. **Don't delete columns** without a deprecation period
4. **Don't change column types** without careful testing
5. **Don't use magic strings** - prefer enums for status fields

## Development vs Production

### Local Development

Use the database-first approach:
```bash
npm run db:pull  # Pull changes from your dev database
npm run db:push  # Push schema changes directly
```

### Production

Use the migration-first approach:
```bash
npm run db:generate  # Generate SQL from schema changes
npm run db:migrate   # Apply migrations carefully
```

Always test migrations on a staging environment first!

## References

- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Drizzle PostgreSQL Guide](https://orm.drizzle.team/docs/get-started-postgresql)
- [Migrations Documentation](https://orm.drizzle.team/docs/migrations)
- [Supabase PostgreSQL](https://supabase.com/docs/guides/database)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres)

## Migration History

| Date | Migration | Changes |
|------|-----------|---------|
| 2025-11-17 | `0000_overconfident_post.sql` | Initial schema creation - 5 tables, 10 indexes, foreign keys |
