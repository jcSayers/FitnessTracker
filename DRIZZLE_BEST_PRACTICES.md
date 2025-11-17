# Drizzle Kit Best Practices

> Learn from our mistakes so you don't repeat them

## The Golden Rule
**Schema First. Generation Second. Execution Third.**

```
schema.ts → db:generate → review → db:push
```

---

## The Correct Workflow

### Adding a New Column
```bash
# 1. Edit server/src/db/migrations/schema.ts
#    Add: myNewField: varchar("my_new_field", { length: 255 })

# 2. Generate the migration
cd server
npm run db:generate

# 3. Check the generated SQL file
cat src/db/migrations/000X_*.sql

# 4. Apply to database
npm run db:push

# 5. Verify it worked
npm run db:pull  # Should show increased column count

# 6. Commit
git add src/db/migrations/
git commit -m "feat(db): add myNewField column"
```

---

## What NOT to Do (Real Mistakes)

### ❌ DON'T: Create SQL Files Manually
```bash
# Wrong - this file will be ignored
echo "ALTER TABLE users ADD COLUMN age INT;" > 0002_add_age.sql

npm run db:push  # Nothing happens - "No changes detected"
```

**Why?** Drizzle doesn't auto-discover orphaned SQL files. It only generates migrations from schema.ts diffs.

---

### ❌ DON'T: Run db:pull When You Have Uncommitted schema.ts Changes
```bash
# Wrong - this loses your work
# You: Edit schema.ts, add new columns
npm run db:pull  # ❌ Overwrites schema.ts with current database state
# Result: Your changes are gone
```

**Why?** `db:pull` regenerates schema.ts from the live database. Any changes not yet in the database get lost.

---

### ❌ DON'T: Assume db:generate Auto-Executes
```bash
# Wrong - generate doesn't apply changes
npm run db:generate  # Creates SQL file only

# Database is unchanged! You must do:
npm run db:push  # This actually applies the migration
```

**Why?** Separation of concerns - generate creates files, push applies them.

---

### ❌ DON'T: Mix Manual SQL with Schema.ts
```typescript
// In schema.ts (outdated)
export const users = pgTable("users", {
  id: uuid().primaryKey(),
  name: varchar({ length: 255 })
});

// Manually in Supabase (applied)
// ALTER TABLE users ADD COLUMN email VARCHAR(255);

// Now Drizzle is confused:
// - schema.ts says: 2 columns
// - database has: 3 columns
// - db:generate thinks database is ahead
```

**Why?** Drizzle tracks state as schema.ts ↔ database. Manual changes break this sync.

---

## Quick Reference

### Schema → Database (Update Schema First)
| Step | Command | What It Does | What Happens to Database |
|------|---------|-------------|-------------------------|
| 1 | Edit `schema.ts` | Define new structure | Nothing yet |
| 2 | `db:generate` | Create migration SQL | Nothing yet |
| 3 | Review `.sql` | Verify migration looks good | Nothing yet |
| 4 | `db:push` | **Execute** the migration | Schema is updated! |

### Database → Schema (Read Current State)
| Step | Command | What It Does | What Happens to schema.ts |
|------|---------|-------------|--------------------------|
| 1 | `db:pull` | Read current database | **Regenerates schema.ts** |

**Key:** `db:push` watches schema.ts. `db:pull` reads database.

---

## Troubleshooting

### "No changes detected"
```bash
# This means: schema.ts matches database

# Check what's in your schema.ts vs database:
npm run db:pull  # See current database state

# Then make sure your schema.ts edits are saved and complete
cat server/src/db/migrations/schema.ts | grep your_new_field
```

### Migration Won't Apply
```bash
# Check:
1. Is DATABASE_URL set correctly?
   echo $DATABASE_URL

2. Is SUPABASE_SERVICE_ROLE_KEY set?
   echo $SUPABASE_SERVICE_ROLE_KEY

3. Are there syntax errors in migration SQL?
   cat src/db/migrations/000X_*.sql

4. Is schema.ts actually different from database?
   npm run db:pull  # Regenerate and compare
```

### Lost Changes After db:pull
```bash
# If you accidentally ran db:pull and lost schema.ts changes:
1. git checkout server/src/db/migrations/schema.ts
2. Re-apply your changes
3. Run db:generate again
4. Run db:push
```

---

## Real World Example

**Goal:** Add an `archived` boolean field to workout_templates

### Step 1: Update schema.ts
```typescript
// server/src/db/migrations/schema.ts
export const workoutTemplates = pgTable("workout_templates", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  userId: uuid("user_id").notNull(),
  name: varchar({ length: 255 }).notNull(),
  archived: boolean("archived").default(false), // ← NEW FIELD
  createdAt: timestamp("created_at").defaultNow(),
  // ... rest of fields
});
```

### Step 2: Generate Migration
```bash
cd server
npm run db:generate
```

**Output:**
```
drizzle-kit generate:pg
CREATE INDEX "idx_workout_templates_archived" on "workout_templates" USING btree ("archived");
ALTER TABLE "workout_templates" ADD COLUMN "archived" boolean DEFAULT false;
→ Migration file created: src/db/migrations/0002_add_archived.sql
```

### Step 3: Review Migration
```bash
cat src/db/migrations/0002_add_archived.sql
```

```sql
-- Add archived column to workout_templates
ALTER TABLE "workout_templates" ADD COLUMN "archived" boolean DEFAULT false;
--> statement-breakpoint
-- Create index for faster queries
CREATE INDEX "idx_workout_templates_archived" ON "workout_templates" USING btree ("archived");
```

✅ Looks good!

### Step 4: Apply Migration
```bash
npm run db:push
```

**Output:**
```
✓ Pulling schema from database...
✓ Applying migration: 0002_add_archived.sql
✓ Migration applied successfully!
```

### Step 5: Verify
```bash
npm run db:pull
```

**Output:**
```
✓ 5 tables fetched
✓ 75 columns fetched (was 74 before)
✓ 15 indexes fetched (was 14 before)
```

✅ Success! New column exists in database.

### Step 6: Commit
```bash
git add server/src/db/migrations/
git commit -m "feat(db): add archived field to workout_templates"
```

---

## Summary: The Three Commands

| Command | Schema First? | Reads | Writes | Use Case |
|---------|--------------|-------|--------|----------|
| `db:generate` | YES ✅ | schema.ts + database | migration SQL file | After editing schema.ts |
| `db:push` | YES ✅ | migration files | database | Apply pending migrations |
| `db:pull` | NO ❌ | database | schema.ts | Sync external DB changes |

**Never run `db:pull` unless you want to overwrite your schema.ts!**

---

## Remember
- 🟢 Always edit **schema.ts first**
- 🟢 Then **db:generate** to create SQL
- 🟢 Then **db:push** to apply
- 🟡 **db:pull** only when you need to read current database state
- 🔴 Never run db:pull with uncommitted schema.ts changes
