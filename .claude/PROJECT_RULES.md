# Fitness Tracker - Project Development Rules

## Database Migrations
**RULE: Always use Drizzle Kit for database schema changes. No raw SQL modifications to Supabase.**

### Why?
- Drizzle Kit maintains migration history and version control
- Migrations can be tracked in git and rolled back if needed
- Schema changes are documented and repeatable
- Prevents schema drift between environments

### ⚠️ CRITICAL: Common Drizzle Mistakes to AVOID

#### ❌ Mistake 1: Creating Migration SQL Without Updating schema.ts
**What we did wrong:**
```
1. Created 0001_add_local_id.sql manually
2. Ran db:push
3. Nothing happened - showed "No changes detected"
```

**Why it failed:**
- Drizzle `db:push` compares `schema.ts` with database, NOT migration files
- It doesn't auto-execute orphaned migration files
- The migration file existed but schema.ts didn't define those columns

**The right way:**
```
1. ✅ Update schema.ts FIRST with new columns
2. ✅ Run db:generate (creates migration from the diff)
3. ✅ Review the generated migration file
4. ✅ Run db:push (applies migration to database)
```

#### ❌ Mistake 2: Pulling Schema Overwrites Your Schema Changes
**What happened:**
```
1. We updated schema.ts with localId columns
2. Ran db:push → still "No changes detected"
3. Ran db:pull to "check what's in database"
4. db:pull OVERWROTE schema.ts with current database state
5. Our localId columns disappeared from schema.ts
```

**Why it's dangerous:**
- `db:pull` regenerates schema.ts from current database
- It replaces any uncommitted changes
- You lose schema definitions that aren't in the database yet

**The right workflow:**
```
ALWAYS UPDATE SCHEMA.TS FIRST, then let db:generate and db:push handle it
Never run db:pull unless you want to sync an external database change
```

#### ❌ Mistake 3: Assuming db:generate Will Auto-Execute
**What we expected:**
```
db:generate → creates migration → auto-applies to database
```

**Reality:**
```
db:generate → creates migration file ONLY
You must run db:push separately to apply it
```

**The fix:**
```bash
# Complete sequence:
npm run db:generate  # Creates migration SQL
npm run db:push      # Applies migration to Supabase
```

#### ❌ Mistake 4: Manual SQL First, Then Schema.ts
**Wrong approach:**
```
1. Create raw SQL: ALTER TABLE ... ADD COLUMN
2. Run it against Supabase
3. Try to add it to schema.ts later
4. Drizzle thinks database is ahead of schema definition
```

**Correct approach:**
```
1. Update schema.ts with new fields
2. Run db:generate to CREATE the migration
3. Review the generated SQL
4. Run db:push to apply it
5. Commit migration file to git
```

### How to Make Schema Changes (THE RIGHT WAY)

#### 1. Update the Schema Definition
Edit `server/src/db/schema.ts` with your changes:
```typescript
export const workoutTemplates = pgTable(
  "workout_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    localId: varchar("local_id", { length: 255 }), // ← Add new column here
    // ... other fields
  },
  (table) => [
    index("idx_workout_templates_local_id").using("btree", table.localId),
  ]
);
```

**IMPORTANT:** Add to schema.ts BEFORE generating migration!

#### 2. Generate Migration
```bash
cd server
npm run db:generate
```
This creates a new migration file in `server/src/db/migrations/` based on the difference between schema.ts and current database state.

#### 3. Review the Migration
Check `server/src/db/migrations/000X_*.sql` to verify:
- Correct column names and types
- Proper indexes created
- Foreign keys intact

#### 4. Apply the Migration
```bash
cd server
npm run db:push
```
This executes the migration against Supabase database.

**Output you should see:**
```
✓ Applying migration: 0002_add_new_columns.sql
✓ Migration applied successfully!
```

#### 5. Verify Success
```bash
npm run db:pull
```
Should show updated column count and no "No changes detected" warning.

#### 6. Commit Migration Files
```bash
git add server/src/db/migrations/
git commit -m "feat(db): add local_id columns to track offline IDs"
```

### Migration Workflow Diagram
```
┌─────────────────────────────────────────────┐
│  1. Edit server/src/db/schema.ts            │
│     (add new fields/tables)                 │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  2. npm run db:generate                     │
│     (creates 000X_*.sql in migrations/)     │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  3. Review migrations/*.sql                 │
│     (check SQL looks correct)               │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  4. npm run db:push                         │
│     (applies migration to Supabase)         │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  5. npm run db:pull (verify)                │
│     (confirm columns in database)           │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  6. git commit migrations/                  │
│     (commit to version control)             │
└─────────────────────────────────────────────┘
```

### What Each Drizzle Command Does
| Command | Purpose | When to Use |
|---------|---------|------------|
| `db:generate` | Compares schema.ts vs database, creates migration SQL | After editing schema.ts |
| `db:push` | Applies pending migrations to database | To sync database with schema |
| `db:pull` | Regenerates schema.ts from current database | When database was modified externally |
| `db:migrate` | Applies migrations in production mode | For CI/CD pipelines |

**Key difference:** `db:push` reads schema.ts → `db:pull` reads database

---

## Architecture Rules

### Offline-First Sync Pattern
The app uses an offline-first architecture with two ID systems:

**Local ID** (`id` field)
- Used by Dexie (IndexedDB) for offline storage
- Custom format: "workout-1", "instance-xyz", "log-abc"
- Kept for user continuity and local references

**Cloud ID** (`cloudId` field)
- Used by Supabase for cloud storage
- UUID format: "550e8400-e29b-41d4-a716-446655440000"
- Generated on first sync, reused on updates

### Sync Flow
```
Client (Dexie) → Sync Manager → Server → Supabase
   local ID                                UUID (cloudId)
```

### Never Mix ID Types
❌ DON'T: Use local IDs in Supabase upsert
✅ DO: Use cloudId if available, generate UUID if not

---

## Server Configuration Rules

### Environment Variables
**Required for all deployments:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-secret-key-here
DATABASE_URL=postgresql://user:password@host/db
CORS_ORIGIN=https://your-app-domain.com
NODE_ENV=production
```

### Authentication
**Rule: Always use SUPABASE_SERVICE_ROLE_KEY on the server side.**
- Service role bypasses RLS (safe for backend)
- Never expose in client code
- Use anon key only for client-side auth

### Error Handling
**Rule: Add retry logic with exponential backoff for database operations.**
- Max 3 attempts
- 100ms → 200ms → 400ms delays
- Log all errors with context

---

## API Contract Rules

### Sync Request Format
```typescript
{
  userId: "email@example.com" | "uuid",
  workoutTemplates?: [
    {
      id: "workout-1",           // Local ID
      cloudId?: "uuid",          // Only on updates
      name: "Upper Body",
      // ... other fields
    }
  ],
  workoutInstances?: [...],
  exerciseLogs?: [...]
}
```

### Sync Response Format
```typescript
{
  success: boolean,
  message?: string,
  data?: {
    workoutTemplates: [],
    workoutInstances: [],
    exerciseLogs: []
  },
  error?: string
}
```

---

## Code Quality Rules

### Type Safety
- ✅ Use strict TypeScript mode
- ✅ Add explicit types to all function parameters
- ✅ Define interfaces for data models
- ❌ Avoid `any` types except in edge cases

### Logging
- Add contextual logging with module/function name prefix
- Examples: `[syncWorkoutTemplates]`, `[resolveUserId]`
- Log at info level: successes, data counts
- Log at error level: failures with full error details

### Git Commits
Format: `type(scope): subject`
- `feat(sync)`: New sync feature
- `fix(db)`: Bug fix in database
- `refactor(api)`: Code restructuring
- `docs(migration)`: Documentation updates

---

## Deployment Checklist

Before deploying to production:

- [ ] Schema migrations applied: `npm run db:push`
- [ ] Server builds without errors: `npm run build`
- [ ] App builds without errors: `npm run build`
- [ ] Environment variables configured
- [ ] Service role key set correctly
- [ ] CORS origin matches deployment domain
- [ ] Database backups created
- [ ] Git changes committed and pushed

---

## Common Tasks

### Add a New Workout Field
1. Update `server/src/db/schema.ts` WorkoutTemplate
2. Run `npm run db:generate`
3. Review migration file
4. Run `npm run db:push`
5. Update TypeScript interfaces
6. Commit with `git add server/src/db/`

### Fix Sync Issues
1. Check server logs for `[Sync]` messages
2. Look for `[resolveUserId]` retry attempts
3. Verify `SUPABASE_SERVICE_ROLE_KEY` is set
4. Check `DATABASE_URL` format
5. Ensure RLS policies aren't blocking service role

### Handle Migration Rollback
```bash
# Manual SQL rollback (if migration failed)
# 1. Get migration timestamp
ls server/src/db/migrations/

# 2. Run rollback SQL from migration file
# 3. Delete migration file from migrations/ folder
# 4. Commit removal

git add server/src/db/migrations/
git commit -m "revert(db): rollback failed migration"
```

---

## Questions?
Refer to [MIGRATION_GUIDE.md](../../MIGRATION_GUIDE.md) for database-specific questions.
