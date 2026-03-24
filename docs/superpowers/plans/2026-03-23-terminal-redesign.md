# Terminal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all 8 screens of the FitnessTracker Angular app to the "Command Line Athlete" brutalist terminal aesthetic defined in the spec and Stitch mockups.

**Architecture:** Template-only replacement for existing screens with selective TypeScript rewrites where the new design requires it. New components (`TopAppBarComponent`, `TemplateListComponent`, `SyncStatusComponent`) are added. All Dexie/sync/routing logic is preserved. Tailwind config becomes the single source of truth for all design tokens.

**Tech Stack:** Angular 19 standalone components, Tailwind CSS 3, JetBrains Mono (Google Fonts), Material Symbols Outlined icons, Karma/Jasmine for tests.

**Spec:** `docs/superpowers/specs/2026-03-23-terminal-redesign-design.md`

---

## File Map

### Modified
| File | Change |
|---|---|
| `tailwind.config.js` | Replace all colors/fonts/radius with terminal token map |
| `src/index.html` | Swap font links; update `theme-color` |
| `src/styles.scss` | Replace legacy global styles |
| `src/app/app.routes.ts` | Add `/templates` and `/sync` routes |
| `src/app/app.component.html` | Replace with minimal shell |
| `src/app/app.component.ts` | Remove desktop toolbar + sync bar |
| `src/app/app.component.scss` | Strip legacy toolbar/sync-bar styles |
| `src/app/models/workout.models.ts` | Add HYPERTROPHY, ELITE, BRUTAL to DifficultyLevel |
| `src/app/components/bottom-navigation/bottom-navigation.component.ts` | 5 tabs, Material Symbols, activeWorkoutId signal, nav always visible |
| `src/app/components/bottom-navigation/bottom-navigation.component.html` | Terminal 5-tab layout |
| `src/app/components/bottom-navigation/bottom-navigation.component.scss` | Strip legacy styles |
| `src/app/components/workout-list/workout-list.component.ts` | Add ASCII heatmap helpers, recentSessions signal |
| `src/app/components/workout-list/workout-list.component.html` | Dashboard from Stitch |
| `src/app/components/workout-list/workout-list.component.scss` | Strip legacy styles |
| `src/app/components/active-workout/active-workout.component.ts` | Add currentExercise computed, formattedTime, setRows |
| `src/app/components/active-workout/active-workout.component.html` | Live tracking from Stitch |
| `src/app/components/active-workout/active-workout.component.scss` | Strip legacy styles |
| `src/app/components/workout-history/workout-history.component.ts` | Add totalVolume, streak computed signals |
| `src/app/components/workout-history/workout-history.component.html` | Terminal history table |
| `src/app/components/workout-history/workout-history.component.scss` | Strip legacy styles |
| `src/app/components/manage-exercises/manage-exercises.component.ts` | Add filterQuery, confirmDeleteId signals |
| `src/app/components/manage-exercises/manage-exercises.component.html` | Terminal exercise table |
| `src/app/components/manage-exercises/manage-exercises.component.scss` | Strip legacy styles |
| `src/app/components/add-exercise/add-exercise.component.ts` | Add chip-select signals |
| `src/app/components/add-exercise/add-exercise.component.html` | Terminal chip-select form |
| `src/app/components/add-exercise/add-exercise.component.scss` | Strip legacy styles |
| `src/app/components/create-workout/create-workout.component.ts` | Expose new DifficultyLevel values |
| `src/app/components/create-workout/create-workout.component.html` | Terminal compile-routine form |
| `src/app/components/create-workout/create-workout.component.scss` | Strip legacy styles |

### Created
| File | Purpose |
|---|---|
| `src/app/components/top-app-bar/top-app-bar.component.ts` | Brand + live clock |
| `src/app/components/top-app-bar/top-app-bar.component.html` | Header template |
| `src/app/components/top-app-bar/top-app-bar.component.spec.ts` | Renders + clock test |
| `src/app/components/template-list/template-list.component.ts` | /templates page |
| `src/app/components/template-list/template-list.component.html` | ls -la template list |
| `src/app/components/template-list/template-list.component.spec.ts` | Renders + empty state |
| `src/app/components/sync-status/sync-status.component.ts` | /sync page |
| `src/app/components/sync-status/sync-status.component.html` | Sync dashboard from Stitch |
| `src/app/components/sync-status/sync-status.component.spec.ts` | Renders |

---

## Task 1: Foundation — Tailwind, Fonts, Global Styles

**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/index.html`
- Modify: `src/styles.scss`

- [ ] **Step 1: Replace `tailwind.config.js` entirely**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  darkMode: 'class',
  theme: {
    borderRadius: {
      DEFAULT: "0px", sm: "0px", md: "0px",
      lg: "0px", xl: "0px", "2xl": "0px", full: "0px",
    },
    extend: {
      colors: {
        "primary":                    "#ffffff",
        "on-primary":                 "#1a1c1c",
        "primary-container":          "#d4d4d4",
        "on-primary-container":       "#000000",
        "on-primary-fixed":           "#ffffff",
        "on-primary-fixed-variant":   "#e2e2e2",
        "secondary":                  "#c7c6c6",
        "on-secondary":               "#1a1c1c",
        "secondary-container":        "#464747",
        "on-secondary-container":     "#e3e2e2",
        "tertiary":                   "#e4e2e2",
        "on-tertiary":                "#1b1c1c",
        "tertiary-container":         "#919090",
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
      },
      fontFamily: {
        mono:     ["JetBrains Mono", "monospace"],
        headline: ["JetBrains Mono", "monospace"],
        body:     ["JetBrains Mono", "monospace"],
        label:    ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        hard: "4px 4px 0 rgba(0,0,0,0.4)",
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: Update `src/index.html`**

Remove any existing `<meta name="theme-color">` and `<link>` tags for Material Icons or legacy Google Fonts. Add inside `<head>`:

```html
<meta name="theme-color" content="#131313">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet"/>
```

- [ ] **Step 3: Replace `src/styles.scss` body**

Remove all legacy rules (border-radius on `.btn`, font-family on `html`, dark-mode overrides, etc.). Replace with:

```scss
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body {
  font-family: 'JetBrains Mono', monospace;
  background-color: #131313;
  color: #e2e2e2;
  height: 100%;
  margin: 0;
}

* { border-radius: 0 !important; }

.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  vertical-align: middle;
  line-height: 1;
}

::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: #131313; }
::-webkit-scrollbar-thumb { background: #474747; }
```

- [ ] **Step 4: Start dev server and verify visually**

Run: `npm start`

Navigate to `http://localhost:4200`. Verify:
- Page background is `#131313`
- Font is monospace (JetBrains Mono once loaded)
- No blue/green colors anywhere (may still have old component styles — that is OK at this stage)

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.js src/index.html src/styles.scss
git commit -m "feat: replace design tokens with terminal monochrome system (JetBrains Mono, 0px radius)"
```

---

## Task 2: Data Model — Extend DifficultyLevel

**Files:**
- Modify: `src/app/models/workout.models.ts`

- [ ] **Step 1: Read `workout.models.ts` lines 39-43**

Confirm the current enum is:
```ts
export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}
```

- [ ] **Step 2: Extend the enum**

```ts
export enum DifficultyLevel {
  BEGINNER     = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED     = 'advanced',
  HYPERTROPHY  = 'hypertrophy',
  ELITE        = 'elite',
  BRUTAL       = 'brutal',
}
```

- [ ] **Step 3: Run tests to confirm no regression**

Run: `npm test`

Expected: all existing specs pass. This is an additive change.

- [ ] **Step 4: Commit**

```bash
git add src/app/models/workout.models.ts
git commit -m "feat: add HYPERTROPHY, ELITE, BRUTAL to DifficultyLevel enum"
```

---

## Task 3: TopAppBarComponent

**Files:**
- Create: `src/app/components/top-app-bar/top-app-bar.component.spec.ts`
- Create: `src/app/components/top-app-bar/top-app-bar.component.ts`
- Create: `src/app/components/top-app-bar/top-app-bar.component.html`

- [ ] **Step 1: Write the failing spec**

Create `src/app/components/top-app-bar/top-app-bar.component.spec.ts`:

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TopAppBarComponent } from './top-app-bar.component';

describe('TopAppBarComponent', () => {
  let fixture: ComponentFixture<TopAppBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopAppBarComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(TopAppBarComponent);
    fixture.detectChanges();
  });

  it('should render brand text', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('root@fitness');
  });

  it('should render a clock matching [ HH:MM:SS ]', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toMatch(/\[\s*\d{2}:\d{2}:\d{2}\s*\]/);
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

Run: `npm test`

Expected: FAILED — `TopAppBarComponent` does not exist yet.

- [ ] **Step 3: Create the component TypeScript**

Create `src/app/components/top-app-bar/top-app-bar.component.ts`:

```ts
import { Component, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-top-app-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-app-bar.component.html',
})
export class TopAppBarComponent implements OnDestroy {
  clock = signal('');
  private interval: ReturnType<typeof setInterval>;

  constructor() {
    this.tick();
    this.interval = setInterval(() => this.tick(), 1000);
  }

  ngOnDestroy() { clearInterval(this.interval); }

  private tick() {
    const n = new Date();
    const pad = (v: number) => v.toString().padStart(2, '0');
    this.clock.set(`[ ${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())} ]`);
  }
}
```

- [ ] **Step 4: Create the HTML**

Create `src/app/components/top-app-bar/top-app-bar.component.html`:

```html
<header class="fixed top-0 left-0 right-0 z-50 h-16 bg-surface-container-lowest border-b-2 border-outline-variant flex items-center justify-between px-4">
  <div class="flex items-center gap-2">
    <span class="material-symbols-outlined text-on-surface text-xl select-none">terminal</span>
    <span class="font-mono font-bold uppercase tracking-widest text-on-surface text-sm select-none">root@fitness</span>
  </div>
  <span class="font-mono text-outline text-xs tracking-widest select-none">{{ clock() }}</span>
</header>
```

- [ ] **Step 5: Run tests — expect PASS**

Run: `npm test`

Expected: both `TopAppBarComponent` specs PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/components/top-app-bar/
git commit -m "feat: add TopAppBarComponent with brand + live clock"
```

---

## Task 4: BottomNavigationComponent — 5-Tab Redesign

**Files:**
- Modify: `src/app/components/bottom-navigation/bottom-navigation.component.ts`
- Modify: `src/app/components/bottom-navigation/bottom-navigation.component.html`
- Modify: `src/app/components/bottom-navigation/bottom-navigation.component.scss`

- [ ] **Step 1: Read the current component in full**

Read `src/app/components/bottom-navigation/bottom-navigation.component.ts` to understand existing logic before replacing it.

- [ ] **Step 2: Replace the TypeScript**

```ts
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { DatabaseService } from '../../services/database.service';

interface NavItem { label: string; icon: string; route: string; }

@Component({
  selector: 'app-bottom-navigation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bottom-navigation.component.html',
  styleUrls: ['./bottom-navigation.component.scss'],
})
export class BottomNavigationComponent {
  private router = inject(Router);
  private db = inject(DatabaseService);

  activeWorkoutId = signal<string | null>(null);
  currentUrl = signal(this.router.url);

  navItems: NavItem[] = [
    { label: '~/dash', icon: 'dashboard',     route: '/dashboard' },
    { label: '~/tmpl', icon: 'description',    route: '/templates' },
    { label: '~/actv', icon: 'fitness_center', route: '/actv'      },
    { label: '~/hist', icon: 'history',        route: '/history'   },
    { label: '~/sync', icon: 'sync',           route: '/sync'      },
  ];

  isActive = computed(() => {
    const url = this.currentUrl();
    return this.navItems.map((item, i) => {
      if (i === 2) return url.startsWith('/workout/');
      return url === item.route || url.startsWith(item.route + '/');
    });
  });

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(e => this.currentUrl.set((e as NavigationEnd).url));
    this.checkActiveWorkout();
  }

  private async checkActiveWorkout() {
    try {
      const w = await this.db.getActiveWorkoutInstance();
      this.activeWorkoutId.set(w?.id ?? null);
    } catch {}
  }

  navigate(i: number) {
    if (i === 2) {
      const id = this.activeWorkoutId();
      this.router.navigate([id ? `/workout/${id}` : '/templates']);
    } else {
      this.router.navigate([this.navItems[i].route]);
    }
  }
}
```

- [ ] **Step 3: Replace the HTML template**

```html
<nav class="fixed bottom-0 left-0 right-0 z-50 h-20 bg-surface-container-lowest border-t border-outline-variant flex">
  @for (item of navItems; track item.route; let i = $index) {
    <button
      (click)="navigate(i)"
      class="flex-1 flex flex-col items-center justify-center gap-1"
      [class.bg-primary]="isActive()[i]"
      [class.text-on-primary]="isActive()[i]"
      [class.text-outline]="!isActive()[i]"
      [class.hover:bg-surface-container-low]="!isActive()[i]">
      <span class="material-symbols-outlined text-xl">{{ item.icon }}</span>
      <span class="font-mono text-[9px] uppercase tracking-widest">{{ item.label }}</span>
    </button>
  }
</nav>
```

- [ ] **Step 4: Clear the SCSS**

```scss
// All styles are Tailwind utility classes.
```

- [ ] **Step 5: Verify in browser**

Run `npm start`. Verify:
- 5 tabs visible at bottom
- Active tab (dashboard on load) shows white background + black text
- Inactive tabs show grey text
- Clicking each tab navigates correctly

- [ ] **Step 6: Commit**

```bash
git add src/app/components/bottom-navigation/
git commit -m "feat: redesign bottom nav to 5-tab terminal layout with Material Symbols"
```

---

## Task 5: App Shell

**Files:**
- Modify: `src/app/app.component.ts`
- Modify: `src/app/app.component.html`
- Modify: `src/app/app.component.scss`

- [ ] **Step 1: Read `app.component.ts` in full**

Identify all signals and methods. Note any that are needed at app level (e.g. `SyncManagerService` initialization on app startup) vs those that are desktop-toolbar/sync-bar specific and can be removed.

- [ ] **Step 2: Copy `onExport()` and `onImport()` implementations**

Paste them into a comment block at the top of `src/app/components/sync-status/sync-status.component.ts` (the stub created in Task 6). These will be wired properly in Task 11.

- [ ] **Step 3: Replace `app.component.html`**

```html
<app-top-app-bar></app-top-app-bar>
<main class="pt-16 pb-20 min-h-screen bg-background">
  <router-outlet></router-outlet>
</main>
<app-bottom-navigation></app-bottom-navigation>
```

- [ ] **Step 4: Simplify `app.component.ts`**

Remove: `toggleMenu`, `menuOpen`, `isDesktop`, `showAbout`, `onExport`, `onImport`, `hasPendingSync`, `isSyncing`, `isOnline`, `syncStatus`, `pendingCount`, and all their service injections that are no longer needed.

Keep: `RouterOutlet` import, `TopAppBarComponent` import, `BottomNavigationComponent` import, any app-level service initializations (e.g. if `SyncManagerService` is injected to auto-initialize on app start — check the constructor).

Minimal result:

```ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopAppBarComponent } from './components/top-app-bar/top-app-bar.component';
import { BottomNavigationComponent } from './components/bottom-navigation/bottom-navigation.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TopAppBarComponent, BottomNavigationComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {}
```

> If `app.component.ts` injects `SyncManagerService` in the constructor to start auto-sync, keep that injection.

- [ ] **Step 5: Clear `app.component.scss`**

```scss
// Shell layout handled by Tailwind in app.component.html.
```

- [ ] **Step 6: Verify app loads**

Run: `npm start`

Navigate to `http://localhost:4200`. Top bar and bottom nav should be visible. Route outlet renders dashboard.

- [ ] **Step 7: Commit**

```bash
git add src/app/app.component.html src/app/app.component.ts src/app/app.component.scss
git commit -m "feat: strip app shell to minimal top-bar + router-outlet + bottom-nav"
```

---

## Task 6: Routes — Add /templates and /sync

**Files:**
- Modify: `src/app/app.routes.ts`
- Create: `src/app/components/template-list/template-list.component.ts` (stub)
- Create: `src/app/components/sync-status/sync-status.component.ts` (stub)

- [ ] **Step 1: Create stub `TemplateListComponent`**

Create `src/app/components/template-list/template-list.component.ts`:

```ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-template-list',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="p-4 font-mono text-on-surface">~/tmpl — loading...</div>`,
})
export class TemplateListComponent {}
```

- [ ] **Step 2: Create stub `SyncStatusComponent`**

Create `src/app/components/sync-status/sync-status.component.ts`:

```ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// TODO Task 11: onExport and onImport implementations moved from app.component.ts
// async onExport() { ... }
// async onImport() { ... }

@Component({
  selector: 'app-sync-status',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="p-4 font-mono text-on-surface">~/sync — loading...</div>`,
})
export class SyncStatusComponent {}
```

- [ ] **Step 3: Update `app.routes.ts`**

```ts
import { Routes } from '@angular/router';
import { WorkoutListComponent } from './components/workout-list/workout-list.component';
import { CreateWorkoutComponent } from './components/create-workout/create-workout.component';
import { ManageExercisesComponent } from './components/manage-exercises/manage-exercises.component';
import { AddExerciseComponent } from './components/add-exercise/add-exercise.component';
import { ActiveWorkoutComponent } from './components/active-workout/active-workout.component';
import { WorkoutHistoryComponent } from './components/workout-history/workout-history.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard',        component: WorkoutListComponent },
  { path: 'templates',        loadComponent: () => import('./components/template-list/template-list.component').then(m => m.TemplateListComponent) },
  { path: 'create-workout',   component: CreateWorkoutComponent },
  { path: 'manage-exercises', component: ManageExercisesComponent },
  { path: 'add-exercise',     component: AddExerciseComponent },
  { path: 'workout/:id',      component: ActiveWorkoutComponent },
  { path: 'history',          component: WorkoutHistoryComponent },
  { path: 'sync',             loadComponent: () => import('./components/sync-status/sync-status.component').then(m => m.SyncStatusComponent) },
  { path: '**', redirectTo: '/dashboard' },
];
```

- [ ] **Step 4: Verify routes**

Run: `npm start`. Navigate to `/templates` and `/sync` — both should show stub text. Bottom nav `~/tmpl` and `~/sync` tabs should navigate correctly.

- [ ] **Step 5: Commit**

```bash
git add src/app/app.routes.ts src/app/components/template-list/template-list.component.ts src/app/components/sync-status/sync-status.component.ts
git commit -m "feat: add /templates and /sync routes with lazy-loaded stubs"
```

---

## Task 7: Dashboard Screen

**Reference:** `dashboard_monochrome/code.html` — read this file before writing the template.

**Files:**
- Modify: `src/app/components/workout-list/workout-list.component.ts`
- Modify: `src/app/components/workout-list/workout-list.component.html`
- Modify: `src/app/components/workout-list/workout-list.component.scss`

- [ ] **Step 1: Read both source files**

Read `dashboard_monochrome/code.html` in full for layout reference.
Read `src/app/components/workout-list/workout-list.component.ts` in full to understand existing signals.

- [ ] **Step 2: Add helpers to the TypeScript**

After reading the component, add these computed signals and helpers. Confirm the correct `DatabaseService` method name for fetching instances (e.g. `getAllWorkoutInstances()` or `getWorkoutHistory()`):

```ts
recentSessions = signal<WorkoutInstance[]>([]);

xpProgress = computed(() => Math.min((this.recentSessions().length % 10) * 10, 100));
level = computed(() => Math.floor(this.recentSessions().length / 10) + 1);
totalVolume = computed(() =>
  this.recentSessions().reduce((acc, s: any) => acc + (s.totalVolume ?? 0), 0)
);

heatmapRows = computed(() => {
  const sessionDates = new Set(
    this.recentSessions().map(s => {
      const d = new Date(s.startTime);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );
  return Array.from({ length: 8 }, (_, row) =>
    Array.from({ length: 7 }, (__, col) => {
      const d = new Date();
      d.setDate(d.getDate() - (55 - (row * 7 + col)));
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      return sessionDates.has(key) ? '█ ' : '. ';
    }).join('')
  );
});

asciiBar(pct: number, width = 20): string {
  const f = Math.round((pct / 100) * width);
  return '[' + '|'.repeat(f) + '.'.repeat(width - f) + ']';
}
```

Add `WorkoutInstance` to the imports from `workout.models.ts`.

Add a `loadRecentSessions()` call inside `ngOnInit()`:

```ts
async loadRecentSessions() {
  try {
    const all = await this.databaseService.getAllWorkoutInstances(); // adjust method name
    this.recentSessions.set([...all].reverse().slice(0, 20));
  } catch (e) { console.error(e); }
}
```

- [ ] **Step 3: Rewrite the HTML template**

Replace `workout-list.component.html` with a terminal layout based on `dashboard_monochrome/code.html`. Key structure:

```html
<div class="min-h-screen bg-background p-4 font-mono text-on-surface">

  <!-- HEADER ROW -->
  <div class="flex items-start justify-between mb-4">
    <div>
      <h1 class="text-4xl font-bold uppercase tracking-tighter text-primary leading-none">DASHBOARD_OVERVIEW</h1>
      <p class="text-[9px] uppercase tracking-widest text-outline mt-1">SESSION_TYPE: STRENGTH_TRAINING</p>
    </div>
    <span class="border border-outline-variant bg-surface-container-lowest px-2 py-1 text-[9px] uppercase tracking-widest text-on-surface-variant shrink-0">
      LVL {{ level() }}
    </span>
  </div>

  <!-- XP BAR -->
  <div class="bg-surface-container border border-outline-variant p-3 mb-4">
    <div class="flex justify-between text-[9px] uppercase tracking-widest text-outline mb-2">
      <span>XP_PROGRESSION</span><span>{{ xpProgress() }}%</span>
    </div>
    <pre class="text-xs text-primary leading-none tracking-tight">{{ asciiBar(xpProgress()) }}</pre>
  </div>

  <!-- METRICS GRID -->
  <div class="grid grid-cols-3 gap-3 mb-4">
    <div class="col-span-2 bg-surface-container border border-outline-variant p-3">
      <div class="text-[9px] uppercase tracking-widest text-outline mb-2">INTENSITY_HEATMAP</div>
      <div class="font-mono text-[10px] text-on-surface leading-snug">
        @for (row of heatmapRows(); track $index) {
          <div>{{ row }}</div>
        }
      </div>
    </div>
    <div class="bg-surface-container border border-outline-variant p-3 flex flex-col gap-3">
      <div class="text-[9px] uppercase tracking-widest text-outline">QUICK_STATS</div>
      <div>
        <div class="text-[9px] uppercase text-outline">Total Vol</div>
        <div class="text-xl font-bold text-primary">{{ totalVolume() }}<span class="text-[9px] text-outline">kg</span></div>
      </div>
      <div>
        <div class="text-[9px] uppercase text-outline">Sessions</div>
        <div class="text-xl font-bold text-primary">{{ recentSessions().length }}</div>
      </div>
      <div>
        <div class="text-[9px] uppercase text-outline">Status</div>
        <div class="text-[9px] uppercase text-on-surface-variant">NOMINAL</div>
      </div>
    </div>
  </div>

  <!-- RECENT LOGS -->
  <div class="mb-4">
    <div class="text-[9px] uppercase tracking-widest text-outline border-b border-outline-variant pb-2 mb-2">LOG_RECORDS.EXE</div>
    @if (recentSessions().length === 0) {
      <div class="border border-outline-variant px-3 py-4 text-xs text-outline-variant">
        &gt;&gt;&gt; NO_SESSIONS_FOUND — RUN FIRST WORKOUT
      </div>
    } @else {
      <div class="border border-outline-variant">
        <div class="grid grid-cols-4 bg-surface-container-high px-3 py-2 text-[9px] uppercase tracking-widest text-outline">
          <span>Date</span><span>Session</span><span>Volume</span><span>Status</span>
        </div>
        @for (s of recentSessions(); track s.id) {
          <div class="grid grid-cols-4 px-3 py-2 border-t border-outline-variant text-xs hover:bg-surface-container">
            <span class="text-outline">{{ s.startTime | date:'MM-dd' }}</span>
            <span class="font-bold uppercase truncate">{{ s.templateName }}</span>
            <span class="text-on-surface-variant">{{ (s as any).totalVolume ?? 0 }}kg</span>
            <span class="border border-primary text-primary text-[9px] uppercase px-1 w-fit self-center">OK</span>
          </div>
        }
      </div>
    }
  </div>

  <!-- SYSTEM FOOTER -->
  <pre class="text-[9px] text-outline-variant border border-outline-variant bg-surface-container-lowest p-3 overflow-x-auto leading-relaxed">SYSTEM_KERNEL: FitnessTracker v2.0 (terminal-build)
HARDWARE_ID: {{ 'local-device' }}
BOOT: offline-first database initialized
SYNC: cloud sync engine active</pre>

</div>
```

- [ ] **Step 4: Clear the SCSS**

```scss
// All styles handled by Tailwind.
```

- [ ] **Step 5: Verify in browser**

Navigate to `/dashboard`. Verify: header, XP bar ASCII, heatmap dots, stats, log table (empty state if no sessions).

- [ ] **Step 6: Commit**

```bash
git add src/app/components/workout-list/
git commit -m "feat: redesign dashboard with ASCII heatmap, XP bar, and session log table"
```

---

## Task 8: TemplateListComponent

**Reference:** `templates_monochrome/code.html` — read this file before writing the template.

**Files:**
- Modify: `src/app/components/template-list/template-list.component.ts` (replace stub)
- Create: `src/app/components/template-list/template-list.component.html`
- Create: `src/app/components/template-list/template-list.component.spec.ts`

- [ ] **Step 1: Read source files**

Read `templates_monochrome/code.html` in full.
Read `src/app/services/database.service.ts` (briefly) to confirm the method for fetching all templates.

- [ ] **Step 2: Write the spec**

Create `src/app/components/template-list/template-list.component.spec.ts`:

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TemplateListComponent } from './template-list.component';
import { DatabaseService } from '../../services/database.service';
import { Router } from '@angular/router';

describe('TemplateListComponent', () => {
  let fixture: ComponentFixture<TemplateListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TemplateListComponent],
      providers: [
        { provide: DatabaseService, useValue: { getAllWorkoutTemplates: () => Promise.resolve([]) } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TemplateListComponent);
    fixture.detectChanges();
  });

  it('should render the breadcrumb', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('ls -la ./templates/routines/');
  });

  it('should show empty state when no templates exist', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('NO_ROUTINES_FOUND');
  });
});
```

- [ ] **Step 3: Run to confirm FAIL**

Run: `npm test` — expected FAIL (TemplateListComponent stub has no breadcrumb text).

- [ ] **Step 4: Replace the stub TypeScript**

```ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DatabaseService } from '../../services/database.service';
import { WorkoutTemplate, DifficultyLevel } from '../../models/workout.models';

@Component({
  selector: 'app-template-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './template-list.component.html',
})
export class TemplateListComponent implements OnInit {
  private db = inject(DatabaseService);
  router = inject(Router);

  templates = signal<WorkoutTemplate[]>([]);
  isLoading = signal(true);
  commandInput = signal('');

  ngOnInit() { this.load(); }

  async load() {
    try {
      this.templates.set(await this.db.getAllWorkoutTemplates());
    } catch (e) { console.error(e); }
    finally { this.isLoading.set(false); }
  }

  start(t: WorkoutTemplate) { this.router.navigate(['/workout', t.id]); }
  edit(t: WorkoutTemplate)  { this.router.navigate(['/create-workout'], { queryParams: { edit: t.id } }); }
  createNew()               { this.router.navigate(['/create-workout']); }

  statsLabel(t: WorkoutTemplate): string {
    return `[EX: ${t.exercises.length.toString().padStart(2,'0')}] [TM: ${t.estimatedDuration}M]`;
  }
}
```

- [ ] **Step 5: Create the HTML template** (based on `templates_monochrome/code.html`)

Create `src/app/components/template-list/template-list.component.html`:

```html
<div class="min-h-screen bg-background p-4 font-mono text-on-surface">

  <div class="text-[9px] uppercase tracking-widest text-outline mb-1">&gt; ls -la ./templates/routines/</div>
  <h1 class="text-4xl font-bold uppercase tracking-tighter text-primary mb-6">ROUTINES.DIR</h1>

  <!-- STAT HEADER -->
  <div class="grid grid-cols-3 gap-3 mb-6">
    <div class="bg-surface-container border border-outline-variant p-3">
      <div class="text-[9px] uppercase tracking-widest text-outline mb-1">Total Objects</div>
      <div class="text-2xl font-bold">{{ templates().length }}</div>
    </div>
    <div class="bg-surface-container border border-outline-variant p-3">
      <div class="text-[9px] uppercase tracking-widest text-outline mb-1">Est. Duration</div>
      <div class="text-2xl font-bold">—</div>
    </div>
    <div class="bg-surface-container border border-outline-variant p-3">
      <div class="text-[9px] uppercase tracking-widest text-outline mb-1">Sys Status</div>
      <div class="text-[9px] uppercase text-on-surface-variant">NOMINAL</div>
    </div>
  </div>

  <!-- TEMPLATE LIST -->
  <div class="border border-outline-variant mb-4">
    <div class="grid grid-cols-[1.5fr_2fr_1fr_auto] gap-2 bg-surface-container-high px-3 py-2 text-[9px] uppercase tracking-widest text-outline">
      <span>Permissions</span><span>Routine</span><span>Stats</span><span>Execute</span>
    </div>
    @if (isLoading()) {
      <div class="px-3 py-4 text-xs text-outline-variant">&gt;&gt;&gt; LOADING_ROUTINES...</div>
    } @else if (templates().length === 0) {
      <div class="px-3 py-4 text-xs text-outline-variant">
        &gt;&gt;&gt; NO_ROUTINES_FOUND — RUN: mkdir routine
      </div>
    } @else {
      @for (t of templates(); track t.id) {
        <div class="grid grid-cols-[1.5fr_2fr_1fr_auto] gap-2 items-center px-3 py-3 border-t border-outline-variant text-xs hover:bg-surface-container">
          <span class="text-outline-variant text-[8px] truncate">-rwxr-xr-x root</span>
          <span class="font-bold uppercase truncate">{{ t.name }}</span>
          <span class="text-outline text-[9px]">{{ statsLabel(t) }}</span>
          <div class="flex gap-2">
            <button (click)="start(t)"
              class="bg-primary text-on-primary text-[9px] uppercase px-2 py-1 font-bold hover:bg-on-surface hover:text-surface">
              [START]
            </button>
            <button (click)="edit(t)"
              class="border border-primary text-primary bg-transparent text-[9px] uppercase px-2 py-1 hover:bg-primary hover:text-on-primary">
              [EDIT]
            </button>
          </div>
        </div>
      }
    }
  </div>

  <!-- NEW ROUTINE -->
  <button (click)="createNew()"
    class="w-full border border-outline-variant text-on-surface-variant text-[9px] uppercase tracking-widest py-3 hover:border-primary hover:text-primary mb-6 text-center">
    + MKDIR NEW_ROUTINE
  </button>

  <!-- COMMAND PROMPT -->
  <div class="bg-surface-container-lowest border border-outline-variant p-3">
    <div class="flex items-center gap-2 mb-2">
      <span class="text-outline text-xs">&gt;</span>
      <input [value]="commandInput()" (input)="commandInput.set($any($event.target).value)"
        class="bg-transparent border-none outline-none text-on-surface font-mono text-xs flex-1 placeholder-outline-variant"
        placeholder="enter command..."/>
    </div>
    <div class="flex gap-2 flex-wrap">
      @for (cmd of ['help', 'mkdir routine', 'sudo su athlete']; track cmd) {
        <span class="border border-outline-variant text-outline-variant text-[9px] px-2 py-1 uppercase">{{ cmd }}</span>
      }
    </div>
  </div>
</div>
```

- [ ] **Step 6: Run specs — expect PASS**

Run: `npm test`

Expected: both `TemplateListComponent` specs PASS.

- [ ] **Step 7: Verify in browser**

Navigate to `/templates`. Verify: breadcrumb, stat header, empty state or template rows with [START]/[EDIT] buttons.

- [ ] **Step 8: Commit**

```bash
git add src/app/components/template-list/
git commit -m "feat: implement TemplateListComponent with terminal ls-la layout"
```

---

## Task 9: Active Workout Screen

**Reference:** `live_tracking_monochrome/code.html` — read this file before writing the template.

**Files:**
- Modify: `src/app/components/active-workout/active-workout.component.ts`
- Modify: `src/app/components/active-workout/active-workout.component.html`
- Modify: `src/app/components/active-workout/active-workout.component.scss`

- [ ] **Step 1: Read both source files**

Read `live_tracking_monochrome/code.html` in full.
Read `active-workout.component.ts` in full. Identify:
- `elapsedTime` signal (number, seconds)
- `currentExerciseIndex` signal
- `workoutTemplate` signal
- `completedSets` signal (number — count of completed sets, or array?)
- `currentSet` signal (`Partial<WorkoutSet>`)
- `isRestPeriod`, `restTimeRemaining` signals
- Method names: `completeSet()`, `finishWorkout()`
- Whether `router` is already injected (make it `public` if so)

- [ ] **Step 2: Add computed signals and helpers to TypeScript**

Add after existing signals (adjust `completedSets` usage based on what you find — it may be a count or an array):

```ts
currentExercise = computed(() => {
  const t = this.workoutTemplate();
  return t?.exercises[this.currentExerciseIndex()] ?? null;
});

formattedTime = computed(() => {
  const t = this.elapsedTime();
  const pad = (v: number) => v.toString().padStart(2, '0');
  return `${pad(Math.floor(t / 3600))}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}`;
});

formattedRest = computed(() => {
  const t = this.restTimeRemaining();
  return `${Math.floor(t / 60).toString().padStart(2,'0')}:${(t % 60).toString().padStart(2,'0')}`;
});

setRows = computed(() => {
  const ex = this.currentExercise();
  if (!ex) return [];
  const done = typeof this.completedSets() === 'number'
    ? this.completedSets() as number
    : (this.completedSets() as any[]).length;
  return Array.from({ length: ex.sets }, (_, i) => ({
    number: i + 1,
    completed: i < done,
    active: i === done,
  }));
});

asciiRestBar(remaining: number, total: number, width = 20): string {
  const f = total > 0 ? Math.round(((total - remaining) / total) * width) : 0;
  return '[' + '|'.repeat(f) + '.'.repeat(width - f) + ']';
}
```

Make `router` a public field:
```ts
router = inject(Router);   // change from private to public (or remove 'private')
```

- [ ] **Step 3: Rewrite the HTML** (based on `live_tracking_monochrome/code.html`)

Replace `active-workout.component.html`:

```html
<div class="min-h-screen bg-background p-4 font-mono text-on-surface">

  @if (!workoutTemplate()) {
    <div class="text-xs text-outline p-4">&gt;&gt;&gt; LOADING_SESSION...</div>
  } @else {

    <!-- TIMER -->
    <div class="bg-surface-container border border-outline-variant p-4 mb-4 text-center">
      <div class="text-[9px] uppercase tracking-widest text-outline mb-1">SYSTEM_UPTIME</div>
      <div class="text-6xl font-bold tracking-tighter text-primary tabular-nums">{{ formattedTime() }}</div>
      <div class="flex justify-center gap-4 mt-2 text-[9px] uppercase tracking-widest text-outline-variant">
        <span>[KCAL: 0]</span><span>[HR: --BPM]</span>
      </div>
    </div>

    <!-- CURRENT EXERCISE -->
    @if (currentExercise(); as ex) {
      <div class="border-l-2 border-primary pl-3 mb-4">
        <div class="text-[9px] uppercase tracking-widest text-outline mb-1">&gt;&gt; CURRENT_EXERCISE</div>
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-2xl font-bold uppercase tracking-tight truncate">{{ ex.name }}</h2>
          <span class="border border-outline-variant text-[9px] uppercase px-1 py-0.5 text-on-surface-variant shrink-0">
            LVL {{ currentExerciseIndex() + 1 }}
          </span>
        </div>
      </div>

      <!-- REST TIMER -->
      @if (isRestPeriod()) {
        <div class="bg-surface-container-high border border-outline-variant p-3 mb-4 text-center">
          <div class="text-[9px] uppercase tracking-widest text-outline mb-1">[ REST: {{ formattedRest() }} ]</div>
          <pre class="text-xs text-primary">{{ asciiRestBar(restTimeRemaining(), ex.restTime ?? 60) }}</pre>
        </div>
      }

      <!-- SET TABLE -->
      <div class="border border-outline-variant mb-4">
        <div class="grid grid-cols-3 bg-surface-container-high px-3 py-2 text-[9px] uppercase tracking-widest text-outline">
          <span>Set</span><span>Kg × Reps</span><span>Status</span>
        </div>
        @for (row of setRows(); track row.number) {
          <div class="grid grid-cols-3 items-center px-3 py-3 border-t border-outline-variant text-xs"
               [class.opacity-40]="row.completed">
            <span class="font-bold">{{ row.number.toString().padStart(2,'0') }}</span>
            @if (row.active) {
              <div class="flex items-center gap-1">
                <input type="number" [ngModel]="currentSet().weight"
                  (ngModelChange)="currentSet.set({...currentSet(), weight: $event})"
                  placeholder="kg"
                  class="w-12 bg-surface-container-lowest border-b border-secondary text-primary text-xs text-center outline-none font-mono"/>
                <span class="text-outline-variant">×</span>
                <input type="number" [ngModel]="currentSet().reps"
                  (ngModelChange)="currentSet.set({...currentSet(), reps: $event})"
                  placeholder="reps"
                  class="w-12 bg-surface-container-lowest border-b border-secondary text-primary text-xs text-center outline-none font-mono"/>
              </div>
            } @else {
              <span class="text-on-surface-variant">—</span>
            }
            @if (row.completed) {
              <span class="material-symbols-outlined text-sm text-on-surface-variant">check_circle</span>
            } @else if (row.active) {
              <button (click)="completeSet()"
                class="bg-primary text-on-primary text-[9px] uppercase px-2 py-1 font-bold tracking-widest hover:bg-on-surface hover:text-surface w-fit">
                LOG_SET
              </button>
            } @else {
              <span class="text-outline-variant text-[9px]">—</span>
            }
          </div>
        }
      </div>

      <!-- ACTIONS -->
      <div class="flex gap-3">
        <button (click)="router.navigate(['/manage-exercises'], {queryParams:{context:'workout'}})"
          class="flex-1 border border-outline-variant text-on-surface-variant text-[9px] uppercase tracking-widest py-3 hover:border-primary hover:text-primary">
          + ADD_EXERCISE
        </button>
        <button (click)="finishWorkout()"
          class="flex-2 bg-primary text-on-primary text-[9px] uppercase tracking-widest px-4 py-3 font-bold hover:bg-on-surface hover:text-surface">
          &gt; [FINISH_SESSION]
        </button>
      </div>
    }
  }
</div>
```

> The `router.navigate` call with an object literal in the template may need to be refactored to a method call instead: add `addExercise() { this.router.navigate(['/manage-exercises'], { queryParams: { context: 'workout' } }); }` to the component and call `(click)="addExercise()"` in the template.

- [ ] **Step 4: Clear SCSS**

```scss
// All styles handled by Tailwind.
```

- [ ] **Step 5: Verify in browser**

Navigate to `/templates`, start a workout. Verify: timer counts up, exercise name shown, set rows, LOG_SET marks sets complete, FINISH_SESSION navigates away.

- [ ] **Step 6: Commit**

```bash
git add src/app/components/active-workout/
git commit -m "feat: redesign active workout with terminal timer, set table, and ASCII rest bar"
```

---

## Task 10: Workout History Screen

**Files:**
- Modify: `src/app/components/workout-history/workout-history.component.ts`
- Modify: `src/app/components/workout-history/workout-history.component.html`
- Modify: `src/app/components/workout-history/workout-history.component.scss`

- [ ] **Step 1: Read the current component**

Read `workout-history.component.ts` in full. Identify the signal that holds the history list and its item type.

- [ ] **Step 2: Add computed signals**

After existing signals, add:

```ts
totalVolume = computed(() =>
  this.workoutHistory().reduce((acc: number, s: any) => acc + (s.totalVolume ?? 0), 0)
);

currentStreak = computed(() => {
  const dates = new Set(
    this.workoutHistory().map((s: any) => {
      const d = new Date(s.startTime);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (dates.has(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)) streak++;
    else if (i > 0) break;
  }
  return streak;
});
```

> Replace `this.workoutHistory()` with the actual signal name found in Step 1.

- [ ] **Step 3: Rewrite the HTML**

Replace `workout-history.component.html`:

```html
<div class="min-h-screen bg-background p-4 font-mono text-on-surface">

  <h1 class="text-4xl font-bold uppercase tracking-tighter text-primary mb-1">HISTORY.LOG</h1>
  <p class="text-[9px] uppercase tracking-widest text-outline mb-6">cat /var/log/sessions/* | sort -r</p>

  <!-- STATS ROW -->
  <div class="grid grid-cols-3 gap-3 mb-6">
    <div class="bg-surface-container border border-outline-variant p-4">
      <div class="text-[9px] uppercase tracking-widest text-outline mb-1">Total Vol</div>
      <div class="text-2xl font-bold">{{ totalVolume() }}<span class="text-[9px] text-outline">kg</span></div>
    </div>
    <div class="bg-surface-container border border-outline-variant p-4">
      <div class="text-[9px] uppercase tracking-widest text-outline mb-1">Sessions</div>
      <div class="text-2xl font-bold">{{ workoutHistory().length }}</div>
    </div>
    <div class="bg-surface-container border border-outline-variant p-4">
      <div class="text-[9px] uppercase tracking-widest text-outline mb-1">Streak</div>
      <div class="text-2xl font-bold">{{ currentStreak() }}<span class="text-[9px] text-outline">d</span></div>
    </div>
  </div>

  <!-- SESSION TABLE -->
  <div class="border border-outline-variant">
    <div class="grid grid-cols-4 bg-surface-container-high px-3 py-2 text-[9px] uppercase tracking-widest text-outline">
      <span>Date</span><span>Session</span><span>Volume</span><span>Status</span>
    </div>
    @if (workoutHistory().length === 0) {
      <div class="px-3 py-4 text-xs text-outline-variant">&gt;&gt;&gt; NO_SESSIONS_RECORDED</div>
    } @else {
      @for (s of workoutHistory(); track s.id) {
        <div class="grid grid-cols-4 px-3 py-3 border-t border-outline-variant text-xs hover:bg-surface-container">
          <span class="text-outline">{{ s.startTime | date:'MM-dd' }}</span>
          <span class="font-bold uppercase truncate">{{ s.templateName }}</span>
          <span class="text-on-surface-variant">{{ (s as any).totalVolume ?? 0 }}kg</span>
          <span class="border border-primary text-primary text-[9px] uppercase px-1 w-fit self-center">OK</span>
        </div>
      }
    }
  </div>

</div>
```

> Replace `workoutHistory()` with the actual signal name. Ensure `s.startTime` and `s.templateName` match the actual model fields.

- [ ] **Step 4: Clear SCSS and verify in browser**

Navigate to `/history`. Verify stats row, session table, empty state.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/workout-history/
git commit -m "feat: redesign workout history with terminal stats and log table"
```

---

## Task 11: SyncStatusComponent (full page)

**Reference:** `sync_status_monochrome/code.html` — read this file before writing the template.

**Files:**
- Modify: `src/app/components/sync-status/sync-status.component.ts` (replace stub)
- Create: `src/app/components/sync-status/sync-status.component.html`
- Create: `src/app/components/sync-status/sync-status.component.spec.ts`

- [ ] **Step 1: Read all relevant source files**

Read:
- `sync_status_monochrome/code.html`
- `src/app/services/sync-manager.service.ts` — find: `isSyncing()` signal, sync trigger method name (`syncNow()` or `triggerSync()` or similar)
- `src/app/services/sync-queue.service.ts` — find: pending count method/signal
- `src/app/services/connectivity.service.ts` — find: `isOnline()` signal
- `src/app/services/sync-diagnostics.service.ts` — find: `getReport()` or `operations()` or log signal
- `src/app/app.component.ts` — copy the `onExport()` and `onImport()` implementations before they are deleted

- [ ] **Step 2: Write the spec**

Create `src/app/components/sync-status/sync-status.component.spec.ts`:

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SyncStatusComponent } from './sync-status.component';
import { SyncManagerService } from '../../services/sync-manager.service';
import { SyncQueueService } from '../../services/sync-queue.service';
import { ConnectivityService } from '../../services/connectivity.service';
import { SyncDiagnosticsService } from '../../services/sync-diagnostics.service';
import { signal } from '@angular/core';

describe('SyncStatusComponent', () => {
  let fixture: ComponentFixture<SyncStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SyncStatusComponent],
      providers: [
        { provide: SyncManagerService,   useValue: { isSyncing: signal(false) } },
        { provide: SyncQueueService,     useValue: {} },
        { provide: ConnectivityService,  useValue: { isOnline: signal(true) } },
        // Adjust this mock to match the actual SyncDiagnosticsService API found in Step 1
        // (either { operations: signal([]) } or { getReport: () => null } depending on the service)
        { provide: SyncDiagnosticsService, useValue: { operations: signal([]), getReport: () => null } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SyncStatusComponent);
    fixture.detectChanges();
  });

  it('should render the sync log heading', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('SYNC_DAEMON');
  });
});
```

> Adjust mock shapes based on what you find in the actual services in Step 1.

- [ ] **Step 3: Build the full component TypeScript**

Replace the stub. Key signals to wire (use actual method names from Step 1):

```ts
import { Component, inject, signal, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SyncManagerService } from '../../services/sync-manager.service';
import { SyncQueueService } from '../../services/sync-queue.service';
import { ConnectivityService } from '../../services/connectivity.service';
import { SyncDiagnosticsService } from '../../services/sync-diagnostics.service';

@Component({
  selector: 'app-sync-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sync-status.component.html',
})
export class SyncStatusComponent implements OnInit, AfterViewChecked {
  private syncManager = inject(SyncManagerService);
  private syncQueue   = inject(SyncQueueService);
  private connectivity = inject(ConnectivityService);
  private diagnostics  = inject(SyncDiagnosticsService);

  @ViewChild('logPane') logPane?: ElementRef<HTMLDivElement>;

  isOnline  = this.connectivity.isOnline;
  isSyncing = this.syncManager.isSyncing;
  pendingCount = signal(0);
  logLines     = signal<string[]>([]);
  private needsScroll = false;

  ngOnInit() {
    this.loadPending();
    this.loadLogs();
  }

  ngAfterViewChecked() {
    if (this.needsScroll && this.logPane) {
      this.logPane.nativeElement.scrollTop = this.logPane.nativeElement.scrollHeight;
      this.needsScroll = false;
    }
  }

  async loadPending() {
    // Adjust to whatever SyncQueueService exposes
    try {
      const count = await (this.syncQueue as any).getPendingCount?.() ?? 0;
      this.pendingCount.set(count);
    } catch {}
  }

  loadLogs() {
    // After reading SyncDiagnosticsService in Step 1, replace this with the correct typed call.
    // The spec says to bind to SyncDiagnosticsService.operations() (a signal of SyncOperation[]).
    // If the service exposes an `operations` signal, use:
    //   const ops = this.diagnostics.operations();
    //   this.logLines.set(ops.slice(-50).map(op => `[${formatTime(op.timestamp)}] ${op.type} ${op.status}`));
    // If it exposes getReport() instead, use that and format accordingly.
    // Do NOT leave any (service as any) casts in the final implementation — use typed calls.
    try {
      const lines: string[] = [];
      this.logLines.set(lines);
    } catch {}
    this.needsScroll = true;
  }

  triggerSync() {
    // Use actual method name from SyncManagerService
    (this.syncManager as any).syncNow?.() ?? (this.syncManager as any).triggerSync?.();
  }

  // Moved from app.component.ts
  // REQUIRED: paste the onExport() and onImport() implementations saved in Task 5 Step 2 here.
  // Do not leave these as empty stubs — the [ EXPORT_DATA ] and [ IMPORT_DATA ] buttons on
  // the /sync page call these directly.
  async onExport() { /* PASTE from app.component.ts */ }
  async onImport() { /* PASTE from app.component.ts */ }
}
```

- [ ] **Step 4: Create the HTML** (based on `sync_status_monochrome/code.html`)

Create `src/app/components/sync-status/sync-status.component.html`:

```html
<div class="min-h-screen bg-background p-4 font-mono text-on-surface">

  <h1 class="text-4xl font-bold uppercase tracking-tighter text-primary mb-6">SYNC_DAEMON</h1>

  <!-- STATUS GRID -->
  <div class="grid grid-cols-3 gap-3 mb-6">
    <div class="bg-surface-container border border-outline-variant p-3">
      <div class="text-[9px] uppercase tracking-widest text-outline mb-2">Network</div>
      <div class="text-xs font-bold" [class.text-primary]="isOnline()" [class.text-error]="!isOnline()">
        {{ isOnline() ? 'PING... [OK]' : '[OFFLINE]' }}
      </div>
    </div>
    <div class="bg-surface-container border border-outline-variant p-3">
      <div class="text-[9px] uppercase tracking-widest text-outline mb-2">Local Repo</div>
      <div class="text-xs font-bold">{{ pendingCount() }} pending</div>
    </div>
    <div class="bg-surface-container border border-outline-variant p-3">
      <div class="text-[9px] uppercase tracking-widest text-outline mb-2">Daemon</div>
      <div class="text-xs font-bold" [class.text-on-surface-variant]="isSyncing()">
        {{ isSyncing() ? 'SYNCING...' : 'IDLE' }}
      </div>
    </div>
  </div>

  <!-- LOG PANE -->
  <div class="border border-outline-variant mb-6">
    <div class="bg-surface-container-high px-3 py-2 text-[9px] uppercase tracking-widest text-outline border-b border-outline-variant">
      /var/log/fitness.sync.log
    </div>
    <div #logPane class="bg-surface-container-lowest p-3 h-48 overflow-y-auto">
      @for (line of logLines(); track $index) {
        <div class="text-[9px] text-on-surface-variant leading-relaxed">{{ line }}</div>
      }
      @if (logLines().length === 0) {
        <div class="text-[9px] text-outline-variant">&gt;&gt;&gt; NO_LOG_ENTRIES</div>
      }
    </div>
  </div>

  <!-- SYNC BUTTON -->
  <button (click)="triggerSync()" [disabled]="isSyncing()"
    class="w-full bg-primary text-on-primary text-[9px] uppercase tracking-widest py-4 font-bold hover:bg-on-surface hover:text-surface mb-6 disabled:opacity-50">
    {{ isSyncing() ? '[ SYNCING... ]' : '[ EXECUTE_SYNC ]' }}
  </button>

  <!-- NETWORK TOPOLOGY + DAEMON STATS -->
  <div class="grid grid-cols-2 gap-3 mb-6">
    <div class="bg-surface-container border border-outline-variant p-3">
      <div class="text-[9px] uppercase tracking-widest text-outline mb-2">Network Topology</div>
      <pre class="text-[8px] text-on-surface-variant leading-snug">[CLIENT]
   |
[LOCAL_DB]
   |
[SYNC_QUEUE]
   |
[SUPABASE]</pre>
    </div>
    <div class="bg-surface-container border border-outline-variant p-3">
      <div class="text-[9px] uppercase tracking-widest text-outline mb-2">Queue Fill</div>
      <pre class="text-xs text-primary">{{ '[' + ('|'.repeat(Math.min(pendingCount(), 20))) + ('.'.repeat(Math.max(0, 20 - pendingCount()))) + ']' }}</pre>
    </div>
  </div>

  <!-- EXPORT / IMPORT -->
  <div class="flex gap-3">
    <button (click)="onExport()"
      class="flex-1 border border-outline-variant text-on-surface-variant text-[9px] uppercase tracking-widest py-3 hover:border-primary hover:text-primary">
      [ EXPORT_DATA ]
    </button>
    <button (click)="onImport()"
      class="flex-1 border border-outline-variant text-on-surface-variant text-[9px] uppercase tracking-widest py-3 hover:border-primary hover:text-primary">
      [ IMPORT_DATA ]
    </button>
  </div>

</div>
```

- [ ] **Step 5: Run tests — expect PASS**

Run: `npm test`. Expected: `SyncStatusComponent` spec passes.

- [ ] **Step 6: Verify in browser**

Navigate to `/sync`. Verify status grid, log pane, sync button, export/import buttons.

- [ ] **Step 7: Commit**

```bash
git add src/app/components/sync-status/
git commit -m "feat: implement SyncStatusComponent with terminal sync dashboard"
```

---

## Task 12: Manage Exercises Screen

**Files:**
- Modify: `src/app/components/manage-exercises/manage-exercises.component.ts`
- Modify: `src/app/components/manage-exercises/manage-exercises.component.html`
- Modify: `src/app/components/manage-exercises/manage-exercises.component.scss`

- [ ] **Step 1: Read the current component**

Read `manage-exercises.component.ts` in full. Identify: exercise list signal name, delete method name, existing undo logic, whether `router` is injected.

- [ ] **Step 2: Add signals**

Add after existing signals:

```ts
filterQuery    = signal('');
confirmDeleteId = signal<string | null>(null);

filteredExercises = computed(() => {
  const q = this.filterQuery().toLowerCase();
  const all = this.exercises(); // adjust to actual signal name
  return q ? all.filter((e: any) =>
    e.name.toLowerCase().includes(q) || (e.category ?? '').toLowerCase().includes(q)
  ) : all;
});
```

Make `router` public if it is private.

- [ ] **Step 3: Add `confirmDelete` method**

```ts
async confirmDelete(id: string) {
  this.confirmDeleteId.set(null);
  await this.deleteExercise(id); // replace with actual delete method name
}
```

- [ ] **Step 4: Rewrite the HTML**

Replace `manage-exercises.component.html`:

```html
<div class="min-h-screen bg-background p-4 font-mono text-on-surface">

  <div class="flex items-start justify-between mb-4">
    <div>
      <h1 class="text-4xl font-bold uppercase tracking-tighter text-primary">EXERCISES.DB</h1>
      <p class="text-[9px] uppercase tracking-widest text-outline mt-1">ls -la ./exercises/</p>
    </div>
    <button (click)="router.navigate(['/add-exercise'])"
      class="bg-primary text-on-primary text-[9px] uppercase px-3 py-2 font-bold hover:bg-on-surface hover:text-surface shrink-0">
      + NEW
    </button>
  </div>

  <!-- FILTER -->
  <div class="flex items-center gap-2 border-b border-secondary mb-4 pb-1">
    <span class="text-outline text-xs">&gt;</span>
    <input [value]="filterQuery()" (input)="filterQuery.set($any($event.target).value)"
      class="bg-transparent border-none outline-none text-on-surface font-mono text-xs flex-1 placeholder-outline-variant"
      placeholder="filter exercises..."/>
  </div>

  <!-- TABLE -->
  <div class="border border-outline-variant">
    <div class="grid grid-cols-[2fr_1fr_auto] bg-surface-container-high px-3 py-2 text-[9px] uppercase tracking-widest text-outline">
      <span>Exercise</span><span>Category</span><span>Actions</span>
    </div>
    @if (filteredExercises().length === 0) {
      <div class="px-3 py-4 text-xs text-outline-variant">&gt;&gt;&gt; NO_EXERCISES_FOUND</div>
    } @else {
      @for (ex of filteredExercises(); track ex.id) {
        <div class="grid grid-cols-[2fr_1fr_auto] items-center px-3 py-3 border-t border-outline-variant text-xs hover:bg-surface-container gap-2">
          <div>
            <div class="font-bold uppercase">{{ ex.name }}</div>
            <div class="text-[9px] text-outline-variant">{{ ex.muscleGroup ?? ex.category }}</div>
          </div>
          <span class="border border-outline-variant text-[9px] uppercase px-1 py-0.5 text-on-surface-variant w-fit">{{ ex.category }}</span>
          @if (confirmDeleteId() === ex.id) {
            <div class="flex gap-2">
              <button (click)="confirmDelete(ex.id)"
                class="bg-error-container text-on-error-container text-[9px] uppercase px-2 py-1 font-bold">
                CONFIRM_DEL
              </button>
              <button (click)="confirmDeleteId.set(null)"
                class="border border-outline-variant text-[9px] uppercase px-2 py-1">
                ABORT
              </button>
            </div>
          } @else {
            <div class="flex gap-2">
              <button (click)="router.navigate(['/add-exercise'], {queryParams:{id:ex.id}})"
                class="border border-outline-variant text-[9px] uppercase px-2 py-1 hover:border-primary hover:text-primary">
                EDIT
              </button>
              <button (click)="confirmDeleteId.set(ex.id)"
                class="border border-error-container text-error text-[9px] uppercase px-2 py-1 hover:bg-error-container">
                DEL
              </button>
            </div>
          }
        </div>
      }
    }
  </div>

</div>
```

> `router.navigate` with object literal in template is valid but may cause TS strict mode errors. Prefer moving the navigation into a method: `editExercise(id: string) { this.router.navigate(['/add-exercise'], { queryParams: { id } }); }`.

- [ ] **Step 5: Clear SCSS and verify in browser**

Navigate to `/manage-exercises`. Verify filter input, table, DEL → inline confirm flow.

- [ ] **Step 6: Commit**

```bash
git add src/app/components/manage-exercises/
git commit -m "feat: redesign manage exercises with terminal table and inline delete confirm"
```

---

## Task 13: Add Exercise Screen

**Files:**
- Modify: `src/app/components/add-exercise/add-exercise.component.ts`
- Modify: `src/app/components/add-exercise/add-exercise.component.html`
- Modify: `src/app/components/add-exercise/add-exercise.component.scss`

- [ ] **Step 1: Read the current component**

Read `add-exercise.component.ts` in full. Identify: form model fields, save/cancel methods, edit mode detection (`ActivatedRoute` query params).

- [ ] **Step 2: Add chip-select signals**

```ts
readonly CATEGORIES = ['PUSH', 'PULL', 'LEGS', 'CORE', 'CARDIO'] as const;
readonly EQUIPMENT  = ['BARBELL', 'DUMBBELL', 'MACHINE', 'BODYWEIGHT', 'CABLE', 'RESISTANCE_BAND'] as const;

selectedCategory  = signal('');
selectedEquipment = signal('');
isEditMode        = signal(false);
```

Wire `selectedCategory` and `selectedEquipment` into the existing save method.

- [ ] **Step 3: Rewrite the HTML**

Replace `add-exercise.component.html`:

```html
<div class="min-h-screen bg-background p-4 font-mono text-on-surface">

  <h1 class="text-4xl font-bold uppercase tracking-tighter text-primary mb-1">MKDIR EXERCISE</h1>
  <p class="text-[9px] uppercase tracking-widest text-outline mb-6">&gt; sudo create-exercise --type=strength</p>

  <!-- NAME -->
  <div class="mb-5">
    <div class="text-[9px] uppercase tracking-widest text-outline mb-2">Exercise Name</div>
    <div class="flex items-center gap-2 border-b border-secondary bg-surface-container-lowest px-3 py-2 focus-within:bg-surface-container-highest">
      <span class="text-outline">&gt;</span>
      <input type="text" [(ngModel)]="exerciseName"
        class="bg-transparent border-none outline-none text-on-surface font-mono text-xs flex-1 placeholder-outline-variant uppercase"
        placeholder="e.g. INCLINE_PRESS"/>
    </div>
  </div>

  <!-- CATEGORY CHIPS -->
  <div class="mb-5">
    <div class="text-[9px] uppercase tracking-widest text-outline mb-2">Category</div>
    <div class="flex gap-2 flex-wrap">
      @for (cat of CATEGORIES; track cat) {
        <button (click)="selectedCategory.set(cat)"
          class="border text-[9px] uppercase tracking-widest px-2 py-1 transition-none"
          [class.border-primary]="selectedCategory() === cat"
          [class.text-primary]="selectedCategory() === cat"
          [class.border-outline-variant]="selectedCategory() !== cat"
          [class.text-on-surface-variant]="selectedCategory() !== cat">
          {{ cat }}
        </button>
      }
    </div>
  </div>

  <!-- EQUIPMENT CHIPS -->
  <div class="mb-5">
    <div class="text-[9px] uppercase tracking-widest text-outline mb-2">Equipment</div>
    <div class="flex gap-2 flex-wrap">
      @for (eq of EQUIPMENT; track eq) {
        <button (click)="selectedEquipment.set(eq)"
          class="border text-[9px] uppercase tracking-widest px-2 py-1 transition-none"
          [class.border-primary]="selectedEquipment() === eq"
          [class.text-primary]="selectedEquipment() === eq"
          [class.border-outline-variant]="selectedEquipment() !== eq"
          [class.text-on-surface-variant]="selectedEquipment() !== eq">
          {{ eq }}
        </button>
      }
    </div>
  </div>

  <!-- MUSCLE GROUP -->
  <div class="mb-8">
    <div class="text-[9px] uppercase tracking-widest text-outline mb-2">Muscle Group</div>
    <div class="flex items-center gap-2 border-b border-secondary bg-surface-container-lowest px-3 py-2 focus-within:bg-surface-container-highest">
      <span class="text-outline">&gt;</span>
      <input type="text" [(ngModel)]="muscleGroup"
        class="bg-transparent border-none outline-none text-on-surface font-mono text-xs flex-1 placeholder-outline-variant"
        placeholder="e.g. CHEST, TRICEPS"/>
    </div>
  </div>

  <!-- ACTIONS -->
  <div class="flex gap-3">
    <button (click)="cancel()"
      class="flex-1 border border-outline-variant text-on-surface-variant text-[9px] uppercase tracking-widest py-4 hover:border-primary hover:text-primary">
      [ CANCEL ]
    </button>
    <button (click)="save()"
      class="flex-2 bg-primary text-on-primary text-[9px] uppercase tracking-widest px-6 py-4 font-bold hover:bg-on-surface hover:text-surface">
      {{ isEditMode() ? '[ UPDATE_RECORD ]' : '[ WRITE_TO_DB ]' }}
    </button>
  </div>

</div>
```

> `exerciseName`, `muscleGroup`, `cancel()`, `save()` — use the actual names from the component. `FormsModule` must be in the imports array.

- [ ] **Step 4: Clear SCSS and verify in browser**

Navigate to `/add-exercise`. Verify chip selectors toggle, inputs have terminal style, save works.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/add-exercise/
git commit -m "feat: redesign add exercise with terminal chip selectors and prompt inputs"
```

---

## Task 14: Create Workout Screen

**Files:**
- Modify: `src/app/components/create-workout/create-workout.component.ts`
- Modify: `src/app/components/create-workout/create-workout.component.html`
- Modify: `src/app/components/create-workout/create-workout.component.scss`

- [ ] **Step 1: Read the current component**

Read `create-workout.component.ts` in full. Identify: workout name field, difficulty/category bindings, exercise list signal, add/remove exercise methods, save/discard methods.

- [ ] **Step 2: Expose new enum values in the component**

Add or confirm these public properties:

```ts
readonly DifficultyLevel   = DifficultyLevel;
readonly WorkoutCategory   = WorkoutCategory;
readonly difficultyOptions = Object.values(DifficultyLevel);
readonly categoryOptions   = Object.values(WorkoutCategory);
```

- [ ] **Step 3: Rewrite the HTML**

Replace `create-workout.component.html`:

```html
<div class="min-h-screen bg-background p-4 font-mono text-on-surface">

  <h1 class="text-4xl font-bold uppercase tracking-tighter text-primary mb-1">COMPILE ROUTINE</h1>
  <p class="text-[9px] uppercase tracking-widest text-outline mb-6">&gt; vim ./templates/new_routine.json</p>

  <!-- NAME -->
  <div class="mb-5">
    <div class="text-[9px] uppercase tracking-widest text-outline mb-2">Routine Name</div>
    <div class="flex items-center gap-2 border-b border-secondary bg-surface-container-lowest px-3 py-2 focus-within:bg-surface-container-highest">
      <span class="text-outline">&gt;</span>
      <input type="text" [(ngModel)]="workoutName"
        class="bg-transparent border-none outline-none text-on-surface font-mono text-xs flex-1 placeholder-outline-variant uppercase"
        placeholder="e.g. PUSH_DAY_V2"/>
    </div>
  </div>

  <!-- META ROW -->
  <div class="grid grid-cols-2 gap-3 mb-5">
    <div>
      <div class="text-[9px] uppercase tracking-widest text-outline mb-2">Difficulty</div>
      <select [(ngModel)]="selectedDifficulty"
        class="w-full bg-surface-container-lowest border-b border-outline-variant text-on-surface font-mono text-xs px-3 py-2 uppercase outline-none appearance-none">
        @for (opt of difficultyOptions; track opt) {
          <option [value]="opt">[ {{ opt.toUpperCase() }} ]</option>
        }
      </select>
    </div>
    <div>
      <div class="text-[9px] uppercase tracking-widest text-outline mb-2">Category</div>
      <select [(ngModel)]="selectedCategory"
        class="w-full bg-surface-container-lowest border-b border-outline-variant text-on-surface font-mono text-xs px-3 py-2 uppercase outline-none appearance-none">
        @for (opt of categoryOptions; track opt) {
          <option [value]="opt">[ {{ opt.toUpperCase() }} ]</option>
        }
      </select>
    </div>
  </div>

  <!-- EXERCISE QUEUE -->
  <div class="mb-5">
    <div class="text-[9px] uppercase tracking-widest text-outline mb-2">Exercise Queue</div>
    <div class="border border-outline-variant">
      <div class="grid grid-cols-[2rem_1fr_auto] bg-surface-container-high px-3 py-2 text-[9px] uppercase tracking-widest text-outline">
        <span>#</span><span class="pl-2">Exercise</span><span>Sets×Reps</span>
      </div>
      @for (ex of selectedExercises(); track ex.id; let i = $index) {
        <div class="grid grid-cols-[2rem_1fr_auto] items-center px-3 py-3 border-t border-outline-variant text-xs hover:bg-surface-container">
          <span class="text-outline-variant">{{ (i + 1).toString().padStart(2, '0') }}</span>
          <span class="pl-2 font-bold uppercase truncate">{{ ex.name }}</span>
          <span class="text-outline text-[9px]">{{ ex.sets }}×{{ ex.reps ?? '—' }}</span>
        </div>
      }
      <button (click)="addExercise()"
        class="w-full border-t border-outline-variant text-outline-variant text-[9px] uppercase tracking-widest py-3 hover:bg-surface-container hover:text-primary text-center">
        [ ADD_EXERCISE_TO_QUEUE ]
      </button>
    </div>
  </div>

  <!-- ACTIONS -->
  <div class="flex gap-3">
    <button (click)="discard()"
      class="flex-1 border border-outline-variant text-on-surface-variant text-[9px] uppercase tracking-widest py-4 hover:border-primary hover:text-primary">
      [ DISCARD ]
    </button>
    <button (click)="saveWorkout()"
      class="flex-2 bg-primary text-on-primary text-[9px] uppercase tracking-widest px-6 py-4 font-bold hover:bg-on-surface hover:text-surface">
      [ SAVE_ROUTINE ]
    </button>
  </div>

</div>
```

> Replace `workoutName`, `selectedDifficulty`, `selectedCategory`, `selectedExercises()`, `addExercise()`, `discard()`, `saveWorkout()` with the actual names from the component.

- [ ] **Step 4: Clear SCSS and verify in browser**

Navigate to `/create-workout`. Verify name input, dropdowns list all 6 difficulty levels, exercise queue, save button.

- [ ] **Step 5: Run full test suite**

Run: `npm test`

Expected: all specs pass with no new failures.

- [ ] **Step 6: Run production build**

Run: `npm run build`

Expected: exits with code 0. Resolve any TypeScript compilation errors before proceeding.

- [ ] **Step 7: Final commit**

```bash
git add src/app/components/create-workout/
git commit -m "feat: redesign create workout with terminal compile-routine layout"
```

---

## Final Verification Checklist

After all 14 tasks complete, verify:

- [ ] All 8 screens load without JavaScript errors in the browser console
- [ ] Font is JetBrains Mono — no serif or system sans-serif visible
- [ ] No border radius on any element — all corners are sharp
- [ ] Background is `#131313` — no white or light backgrounds
- [ ] Bottom nav: 5 tabs, active = white bg / black text, inactive = grey text
- [ ] Top bar: brand text + live clock updating every second
- [ ] `~/actv` tab navigates to active workout if one exists, otherwise `/templates`
- [ ] `/sync` page: sync button triggers sync, export/import buttons work
- [ ] Heatmap on dashboard shows ASCII characters
- [ ] XP bar shows ASCII `[|||....]` style
- [ ] Empty states render correctly for dashboard, templates, history, exercises
- [ ] No `zinc-*` Tailwind classes remain in any file
- [ ] `npm test` — all specs pass
- [ ] `npm run build` — exits with code 0
