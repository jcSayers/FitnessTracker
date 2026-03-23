# FitnessTracker — Terminal Redesign Spec
**Date:** 2026-03-23
**Status:** Approved

---

## Overview

Redesign all UI screens of the FitnessTracker Angular app to match the "Command Line Athlete" brutalist terminal aesthetic defined in `kernel_core/DESIGN.md` and the four Google Stitch HTML mockups. All existing TypeScript business logic is preserved; TypeScript may be rewritten where the new design requires it.

---

## Design System

### Authoritative Sources (priority order)
1. This spec document
2. Google Stitch HTML files (`dashboard_monochrome/code.html`, `live_tracking_monochrome/code.html`, `sync_status_monochrome/code.html`, `templates_monochrome/code.html`)
3. `kernel_core/DESIGN.md`

**Typography override:** `kernel_core/DESIGN.md` mentions both "Space Grotesk" and "JetBrains Mono." This spec resolves that ambiguity: **JetBrains Mono is the sole font** throughout the entire app. Space Grotesk is not used.

**Backdrop blur override:** `kernel_core/DESIGN.md` section 2 mentions a 20px backdrop-blur for floating overlays. This is **not used** — it contradicts the DESIGN.md Don'ts ("no drop shadows with blur > 2px"). Sharp edges and tonal layering only.

### Colors — Tailwind Token Map
Add to `tailwind.config.js` under `theme.extend.colors` as a **flat object** (producing classes like `bg-surface-container-high`, `text-on-surface-variant`):

```js
colors: {
  "primary":                    "#ffffff",
  "on-primary":                 "#1a1c1c",
  "primary-container":          "#d4d4d4",
  "on-primary-container":       "#000000",
  "primary-fixed":              "#5d5f5f",
  "primary-fixed-dim":          "#454747",
  "on-primary-fixed":           "#ffffff",
  "on-primary-fixed-variant":   "#e2e2e2",
  "secondary":                  "#c7c6c6",
  "on-secondary":               "#1a1c1c",
  "secondary-container":        "#464747",
  "on-secondary-container":     "#e3e2e2",
  "secondary-fixed":            "#c7c6c6",
  "secondary-fixed-dim":        "#ababab",
  "on-secondary-fixed":         "#1a1c1c",
  "on-secondary-fixed-variant": "#3a3c3c",
  "tertiary":                   "#e4e2e2",
  "on-tertiary":                "#1b1c1c",
  "tertiary-container":         "#919090",
  "on-tertiary-container":      "#000000",
  "tertiary-fixed":             "#5e5e5e",
  "tertiary-fixed-dim":         "#464747",
  "on-tertiary-fixed":          "#ffffff",
  "on-tertiary-fixed-variant":  "#e4e2e2",
  "error":                      "#ffb4ab",
  "on-error":                   "#690005",
  "error-container":            "#93000a",
  "on-error-container":         "#ffdad6",
  "background":                 "#131313",
  "on-background":              "#e2e2e2",
  "surface":                    "#131313",
  "surface-dim":                "#131313",
  "surface-bright":             "#393939",
  "surface-container-lowest":   "#0e0e0e",
  "surface-container-low":      "#1b1b1b",
  "surface-container":          "#1f1f1f",
  "surface-container-high":     "#2a2a2a",
  "surface-container-highest":  "#353535",
  "surface-variant":            "#353535",
  "on-surface":                 "#e2e2e2",
  "on-surface-variant":         "#c6c6c6",
  "outline":                    "#919191",
  "outline-variant":            "#474747",
  "inverse-surface":            "#e2e2e2",
  "inverse-on-surface":         "#303030",
  "inverse-primary":            "#5d5f5f",
  "surface-tint":               "#c6c6c7",
}
```

Do **not** include Tailwind's built-in `zinc` palette in the token map. All nav active/inactive states use the token equivalents defined in the Navigation section below.

### Typography
```js
fontFamily: {
  "mono":     ["JetBrains Mono", "monospace"],
  "headline": ["JetBrains Mono", "monospace"],
  "body":     ["JetBrains Mono", "monospace"],
  "label":    ["JetBrains Mono", "monospace"],
}
```

- **Display (3.5rem / tracking-tighter):** Major metrics (e.g. session timer, total volume)
- **Headline (2rem / uppercase):** Section headers
- **Body (1rem / leading-relaxed):** Instructions, list content
- **Label (0.75rem / uppercase / tracking-widest):** Tags, metadata, timestamps

### Border Radius
```js
borderRadius: {
  "DEFAULT": "0px",
  "sm":      "0px",
  "md":      "0px",
  "lg":      "0px",
  "xl":      "0px",
  "2xl":     "0px",
  "full":    "0px",
}
```

### Components
- **Buttons (primary):** `bg-primary text-on-primary` — hover: instant invert to `bg-on-surface text-surface` (no transition)
- **Buttons (outline):** `border border-primary text-primary bg-transparent` — hover: invert instantly
- **Inputs:** `>` prefix character, bottom-border only (`border-b border-secondary`), focus: `bg-surface-container-highest`
- **Progress bars:** ASCII style `[||||||..........]` — filled chars `text-primary`, empty chars `text-outline-variant`
- **Status tags:** `[ LVL 14 ]` pattern — `bg-secondary-container text-on-secondary-container`

---

## `index.html` Changes

**Remove** (if present):
```html
<meta name="theme-color" content="#2196f3">
<link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
```

**Add:**
```html
<meta name="theme-color" content="#131313">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet"/>
```

Add to global styles in `src/styles.scss` — **replace or remove** all legacy global rules that conflict:
```scss
// Remove: border-radius on .btn, .btn-icon, .card
// Remove: font-family: 'Inter' on html, body
// Add:
html, body { font-family: 'JetBrains Mono', monospace; background-color: #131313; color: #e2e2e2; }
* { border-radius: 0 !important; }
.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: #131313; }
::-webkit-scrollbar-thumb { background: #474747; }
```

---

## Navigation

### Bottom Navigation (5 tabs)
| # | Label | Route | Icon | Active state |
|---|---|---|---|---|
| 1 | `~/dash` | `/dashboard` | `dashboard` | `bg-primary text-on-primary` |
| 2 | `~/tmpl` | `/templates` | `description` | same |
| 3 | `~/actv` | dynamic (see below) | `fitness_center` | same |
| 4 | `~/hist` | `/history` | `history` | same |
| 5 | `~/sync` | `/sync` | `sync` | same |

- Inactive tab: `text-outline hover:bg-surface-container-low`
- Nav container: `bg-surface-container-lowest border-t border-outline-variant h-20 fixed bottom-0`

**`~/actv` tab routing behavior:**
- `BottomNavigationComponent` already calls `databaseService.getActiveWorkoutInstance()` inside `checkForActiveWorkout()`. Extend this method to also store the active workout's `id`: add `activeWorkoutId = signal<string | null>(null)` and set it from `activeWorkout?.id ?? null`.
- If `activeWorkoutId()` is non-null: tap navigates to `/workout/${activeWorkoutId()}`
- If `activeWorkoutId()` is null: tap navigates to `/templates`
- The bottom nav is **visible** during an active workout — change from current behavior. Update `shouldShowNavigation()` to return `true` on all routes.
- The `~/actv` tab is highlighted (active state) when the current route matches `/workout/:id`

### Top App Bar (new `TopAppBarComponent`)
- Selector: `app-top-app-bar`
- File: `src/app/components/top-app-bar/top-app-bar.component.ts`
- Template: `terminal` Material Symbol icon + `root@fitness` text (bold, uppercase, monospace) + live clock `[ HH:MM:SS ]` on right updating every second via `setInterval`
- Styles: `bg-surface-container-lowest border-b-2 border-outline-variant h-16 fixed top-0 w-full z-50`

---

## Shell — `app.component`

### `app.component.html` — replace entirely with:
```html
<div class="app-container">
  <app-top-app-bar></app-top-app-bar>
  <main class="main-content pt-16 pb-20">
    <router-outlet></router-outlet>
  </main>
  <app-bottom-navigation></app-bottom-navigation>
</div>
```

### `app.component.ts` — remove:
- `toggleMenu()`, `menuOpen`, `isDesktop()` desktop toolbar logic
- `onExport()`, `onImport()` — **move to `/sync` page** (see Sync page spec below)
- `showAbout()` — remove (not in scope)
- `hasPendingSync()`, `isSyncing()`, `isOnline()`, `syncStatus()`, `pendingCount()` sync bar signals — these move to `SyncStatusComponent`

Keep: any remaining app-level DI or router setup.

---

## Component Architecture Decision: Dashboard vs Templates Split

`WorkoutListComponent` currently handles both the template list and stats. **Do not split this into two separate components.** Instead:

- **`WorkoutListComponent`** is repurposed as the **Dashboard** at `/dashboard`. It keeps its existing data fetching. Its template is rewritten to show: stats header, XP bar, heatmap, quick stats, recent session logs. Template items are not shown here.
- **New `TemplateListComponent`** is created at `src/app/components/template-list/template-list.component.ts` for the `/templates` route. It injects the same `WorkoutService` / `DatabaseService` to load templates and renders the `ls -la` list view from the Stitch design.
- `/create-workout` route is kept as-is (the `CreateWorkoutComponent` form). It is reached by pressing `[START]` or `[EDIT]` or `[+ NEW]` from the templates list.

---

## Existing Component: `SyncStatusIndicatorComponent`

`sync-status-indicator.component.ts` currently exists as an **inline/embedded widget** (no route). It is **kept as-is** (not deleted) — it may still be used inside `TopAppBarComponent` for a compact status dot. The new **`SyncStatusComponent`** is a separate full-page component at `/sync`. There is no naming collision.

---

## Screen Designs

### 1. Dashboard (`/dashboard` — `WorkoutListComponent`)
**Source:** `dashboard_monochrome/code.html` — use as the direct HTML reference.

Sections (top to bottom):
1. **Header row:** `DASHBOARD_OVERVIEW` h1 (4xl, bold, uppercase, tracking-tighter) + session type subtitle + `LVL XX` badge (top-right, `bg-surface-container-lowest border border-outline-variant`)
2. **XP bar block:** `XP_PROGRESSION` label + percentage + ASCII bar `[||||||||||..........]`
3. **Metrics bento grid (md:grid-cols-3):**
   - Columns 1–2: `INTENSITY_HEATMAP` panel — ASCII character grid. `CalendarHeatmapComponent` provides the raw data (activity levels per day). The **dashboard template** renders the ASCII characters; `CalendarHeatmapComponent` is **not** rewritten — it continues to emit day-level intensity data which the parent maps to `. + # █`. This means `CalendarHeatmapComponent`'s existing SVG output is not rendered on the dashboard; the dashboard reads its data output only.
   - Column 3: `QUICK_STATS` — stacked label/value rows: Total Vol, Streak, Recovery, System Status bar
4. **Recent logs:** `LOG_RECORDS.EXE` heading + bordered list rows (date, name, volume, status badge, `chevron_right`)
5. **System footer:** `<pre>` block with `SYSTEM_KERNEL`, `HARDWARE_ID`, boot messages

**Empty state (no sessions):** Show the header + XP bar at 0%, heatmap with all `.` chars, quick stats at `0`, and a single log row reading `>>> NO_SESSIONS_FOUND — RUN FIRST WORKOUT`.

### 2. Templates (`/templates` — new `TemplateListComponent`)
**Source:** `templates_monochrome/code.html` — use as the direct HTML reference.

Sections:
1. **Breadcrumb:** `> ls -la ./templates/routines/`
2. **Stat header (3-col):** Total templates count, estimated disk usage (bytes), system status `NOMINAL`
3. **Template list:** Table header row (Permissions / Routine Name / Stats / Execute) + rows with `-rwxr-xr-x 1 root staff`, template name (uppercase), `[EX: NN] [TM: NNM]`, difficulty badge, `[START]` solid + `[EDIT]` outline buttons
4. **Athlete load:** ASCII progress bars for Recovery % and Weekly Target Volume %
5. **Command prompt:** `>` input + command chip suggestions

**Empty state:** Show breadcrumb + stat header + a single row `>>> NO_ROUTINES_FOUND — RUN: mkdir routine` + command prompt.

### 3. Active Workout (`/workout/:id` — `ActiveWorkoutComponent`)
**Source:** `live_tracking_monochrome/code.html` — use as the direct HTML reference.

Key bindings to existing component signals/methods:
- Timer display: existing `elapsedTime` signal → format as `HH:MM:SS`
- Exercise header: `getCurrentExercise()` method (no signal exists — call in template or wrap in a `computed` signal in the component) → name, PR, level
- Set rows: `completedSets` array → dim rows; `currentSet` → active input row
- `LOG_SET` button → `completeSet()` method (not `logSet()` — that method does not exist)
- `FINISH_SESSION` button → `finishWorkout()` method
- `ADD_EXERCISE` button → navigate to `/manage-exercises?context=workout` (no existing in-workout add-exercise method; this is new behaviour — the nav back from manage-exercises should return to the active workout)
- `RestTimerComponent`: render inline between sets as a minimal ASCII countdown `[ REST: 01:30 ]`

Bottom nav visible during active workout (change from current behavior).

### 4. Workout History (`/history` — `WorkoutHistoryComponent`)
**Source:** Designed per DESIGN.md (approved in brainstorm visual).

Sections:
1. **Header:** `HISTORY.LOG` h1 + `cat /var/log/sessions/* | sort -r` subtitle
2. **Stats row (3-col grid):** Total Volume (kg), Total Sessions count, Current Streak (days) — each in `bg-surface-container border border-outline-variant p-4`
3. **Session table:** `border border-outline-variant` wrapper + table header row (`Date / Session / Volume / Status`) + data rows: `[MM-DD]` date, session name uppercase, volume in kg, `[OK]` or `[RCV]` tag, `chevron_right` icon navigating to workout detail
4. Rows sorted newest first. History rows are **not tappable** in this iteration — `WorkoutDetailComponent` exists at `src/app/workout/workout-detail/` but is an empty stub (no data loading, no registered route). Implementing the detail view is out of scope. Do not render a `chevron_right` icon on history rows.

**Empty state (zero sessions):** Stats row at 0 + single table row `>>> NO_SESSIONS_RECORDED`.

### 5. Sync Status (`/sync` — new `SyncStatusComponent`)
**Source:** `sync_status_monochrome/code.html` — use as the direct HTML reference.

File: `src/app/components/sync-status/sync-status.component.ts`

Wire to existing services: `ConnectivityService`, `SyncManagerService`, `SyncQueueService`, `SyncDiagnosticsService`.

Sections:
1. **Status header grid (3-col):**
   - Network Status: `PING... [OK]` or `[OFFLINE]` from `ConnectivityService.isOnline()`. No latency value — `ConnectivityService` does not expose one. Display `TYPE: ${effectiveType()}` instead (from `ConnectivityService.effectiveType()`).
   - Local Repository: pending queue count from `SyncQueueService.pendingCount()` + queue size
   - Daemon Thread: `IDLE` / `SYNCING` from `SyncManagerService.isSyncing()`
2. **Terminal console:** `/var/log/fitness.sync.log` title bar + scrollable log area. Bind to `SyncDiagnosticsService.operations()` signal. Each `SyncOperation` in the array renders as one log line formatted: `[HH:MM:SS] TYPE STATUS — N items` (derive time from `operation.timestamp` (Unix ms → format HH:MM:SS), type from `operation.type`, status from `operation.status`, item count from `operation.itemsProcessed`). Show the 50 most recent entries, newest at bottom. Auto-scroll to bottom when new entries arrive. `window.syncDiagnostics` is a debug console API — do not use it in the component; use the injected service signals directly.
3. **Progress/Action row:** ASCII sync progress bar (0–100% from `SyncManagerService`) + `LAST_SYNC` timestamp + `[ EXECUTE_SYNC ]` button → `SyncManagerService.syncNow()`
4. **Data Operations section (2-col):**
   - Left: "Network Topology" ASCII pre block (static visual)
   - Right: "Daemon Stats" ASCII progress bars for queue fill rate
5. **Export/Import actions** (moved from old desktop toolbar):
   - `[ EXPORT_DATA ]` button → calls existing `onExport()` logic (move implementation from `app.component.ts`)
   - `[ IMPORT_DATA ]` button → calls existing `onImport()` logic (move implementation from `app.component.ts`)

### 6. Manage Exercises (`/manage-exercises` — `ManageExercisesComponent`)
**Source:** Designed per DESIGN.md (approved in brainstorm visual).

Sections:
1. **Header row:** `EXERCISES.DB` h1 + `ls -la ./exercises/` subtitle + `[+ NEW]` solid button (→ `/add-exercise`)
2. **Filter prompt:** `>` prefix + live filter input — filters the list in-component
3. **Exercise table:** `border border-outline-variant` wrapper + header row (`Exercise / Category / Actions`) + data rows: name (bold uppercase) + muscle group (dim), category tag, `[EDIT]` outline button (→ `/add-exercise?id=X`) + `[DEL]` outline button (error-toned border)
4. **Delete confirmation:** On `[DEL]` click, replace that row's buttons inline with `[CONFIRM_DEL]` solid error + `[ABORT]` outline — no modal. On confirm: delete + undo toast `[ UNDONE ]` for 3 seconds using existing undo logic.

### 7. Add Exercise (`/add-exercise` — `AddExerciseComponent`)
**Source:** Designed per DESIGN.md (approved in brainstorm visual).

Sections:
1. **Header:** `MKDIR EXERCISE` h1 + `> sudo create-exercise --type=strength` subtitle
2. **Exercise Name:** terminal prompt input (`>` prefix, bottom-border)
3. **Category:** chip selector row — `PUSH` / `PULL` / `LEGS` / `CORE` / `CARDIO` — selected chip: `border-primary text-primary`; unselected: `border-outline-variant text-on-surface-variant`
4. **Equipment:** chip selector row — `BARBELL` / `DUMBBELL` / `MACHINE` / `BODYWEIGHT` / `CABLE` / `RESISTANCE_BAND`
5. **Muscle Group:** free text terminal prompt input
6. **Actions row:** `[ CANCEL ]` outline (→ back) + `[ WRITE_TO_DB ]` solid (→ save + navigate back)

Edit mode (when `?id=X` param present): pre-populate all fields; button reads `[ UPDATE_RECORD ]`.

### 8. Create Workout (`/create-workout` — `CreateWorkoutComponent`)
**Source:** Designed per DESIGN.md (approved in brainstorm visual).

Sections:
1. **Header:** `COMPILE ROUTINE` h1 + `> vim ./templates/new_routine.json` subtitle
2. **Routine name:** terminal prompt input
3. **Meta row (2-col):** Difficulty selector (BEGINNER / HYPERTROPHY / ELITE / BRUTAL) + Category selector (STRENGTH / CARDIO / HIIT / MOBILITY) — styled as `bg-surface-container-lowest border-b border-outline-variant` dropdowns
4. **Exercise queue:** numbered list `01 EXERCISE_NAME 4×8` rows + final row `[ ADD_EXERCISE_TO_QUEUE ]` (outline, opens exercise search/select)
5. **Actions row:** `[ DISCARD ]` outline + `[ SAVE_ROUTINE ]` solid

**Enum values — required data model change:**

The existing `DifficultyLevel` enum (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`) must be extended to include the new terminal-flavour values used in the Stitch designs. Add to `workout.models.ts`:
```ts
export enum DifficultyLevel {
  BEGINNER     = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED     = 'advanced',
  HYPERTROPHY  = 'hypertrophy',  // new
  ELITE        = 'elite',         // new
  BRUTAL       = 'brutal',        // new
}
```

The difficulty selector in `CreateWorkoutComponent` displays all 6 values. Existing templates saved with `BEGINNER`/`INTERMEDIATE`/`ADVANCED` continue to work — these values remain valid.

`WorkoutCategory` is **not changed**. The selector in the Create Workout form uses the existing values: `STRENGTH / CARDIO / HIIT / YOGA / SPORTS / MIXED`. Remove `MOBILITY` — it is not in the enum.

---

## Routes Changes

| Change | Detail |
|---|---|
| Add `/templates` | New route → `TemplateListComponent` |
| Add `/sync` | New route → `SyncStatusComponent` |
| Keep `/dashboard` | `WorkoutListComponent` (dashboard view only) |
| Keep `/create-workout` | `CreateWorkoutComponent` |
| Keep `/manage-exercises` | `ManageExercisesComponent` |
| Keep `/add-exercise` | `AddExerciseComponent` |
| Keep `/workout/:id` | `ActiveWorkoutComponent` |
| Keep `/history` | `WorkoutHistoryComponent` |
| **Not added** `/history/:id` | `WorkoutDetailComponent` is an empty stub — out of scope |

---

## New Components Summary

| Component | Selector | File |
|---|---|---|
| `TopAppBarComponent` | `app-top-app-bar` | `src/app/components/top-app-bar/top-app-bar.component.ts` |
| `TemplateListComponent` | `app-template-list` | `src/app/components/template-list/template-list.component.ts` |
| `SyncStatusComponent` | `app-sync-status` | `src/app/components/sync-status/sync-status.component.ts` |

`SyncStatusIndicatorComponent` (existing inline widget) is **kept** — not renamed or deleted.

---

## Success Criteria

1. All 8 screens render with: monochrome colors only (no blue, green, or non-grey hue), JetBrains Mono font, 0px border radius, ASCII progress elements
2. All existing TypeScript functionality works: data binding, routing, Dexie.js reads/writes, sync trigger, Garmin import, export/import (now on `/sync`)
3. Bottom nav shows 5 tabs; active tab = `bg-primary text-on-primary`; nav visible on all routes including `/workout/:id`
4. `~/actv` tab navigates to active workout if one exists, otherwise to `/templates`
5. Top app bar shows live clock updating every second
6. No `zinc-*` Tailwind classes in the codebase (all replaced with design tokens)
7. `theme-color` meta tag = `#131313`
8. Single font throughout: JetBrains Mono
9. Empty states defined for Dashboard, Templates, History, Manage Exercises
