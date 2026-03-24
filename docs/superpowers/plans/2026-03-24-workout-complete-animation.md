# Workout Complete Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fullscreen terminal-style "MISSION ACCOMPLISHED" overlay animation that plays when a workout is finished, auto-dismisses after 3 seconds, and navigates to `/history`.

**Architecture:** A new standalone `WorkoutCompleteOverlayComponent` encapsulates all animation logic. It receives `elapsedSeconds` and `sets` as inputs, emits `dismissed` when done. `ActiveWorkoutComponent` renders it conditionally and triggers it from `finishWorkout()` instead of navigating directly.

**Tech Stack:** Angular 17 standalone components, signals, CSS transitions, Tailwind utility classes, `setTimeout` for sequencing. No animation libraries.

**Spec:** `docs/superpowers/specs/2026-03-24-workout-complete-animation-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/app/components/workout-complete-overlay/workout-complete-overlay.component.ts` | Create | Animation state machine, timing, dismiss logic |
| `src/app/components/workout-complete-overlay/workout-complete-overlay.component.html` | Create | Overlay template — boot line, DONE box, cursor, countdown bar |
| `src/app/components/active-workout/active-workout.component.ts` | Modify | Add `showCompleteOverlay` signal, `overlayElapsedSeconds`/`overlaySets`, modify `finishWorkout()`, add `onOverlayDismissed()` |
| `src/app/components/active-workout/active-workout.component.html` | Modify | Add overlay element, add DEV test button |

---

## Task 1: Create the overlay component shell

**Files:**
- Create: `src/app/components/workout-complete-overlay/workout-complete-overlay.component.ts`
- Create: `src/app/components/workout-complete-overlay/workout-complete-overlay.component.html`

- [ ] **Step 1: Create the component TypeScript file**

```typescript
// src/app/components/workout-complete-overlay/workout-complete-overlay.component.ts
import {
  Component, Input, Output, EventEmitter, OnChanges,
  SimpleChanges, OnDestroy, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';

type AnimState = 'idle' | 'showing-log' | 'showing-box' | 'showing-cursor' | 'counting-down' | 'dismissed';

@Component({
  selector: 'app-workout-complete-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './workout-complete-overlay.component.html',
})
export class WorkoutCompleteOverlayComponent implements OnChanges, OnDestroy {
  @Input() elapsedSeconds = 0;
  @Input() sets = 0;
  @Input() visible = false;
  @Output() dismissed = new EventEmitter<void>();

  animState = signal<AnimState>('idle');
  logText = signal('');
  cursorVisible = signal(false);
  countdownWidth = signal(100);

  private timers: ReturnType<typeof setTimeout>[] = [];
  private typewriterInterval?: ReturnType<typeof setInterval>;
  private cursorInterval?: ReturnType<typeof setInterval>;
  private drainInterval?: ReturnType<typeof setInterval>;

  readonly LOG_FULL = '> committing session... done';
  readonly DISMISS_DELAY = 3000;

  formattedTime = computed(() => {
    const s = this.elapsedSeconds;
    const mins = Math.floor(s / 60).toString().padStart(2, '0');
    const secs = (s % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  });

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']) {
      if (this.visible) {
        this.startSequence();
      } else {
        this.reset();
      }
    }
  }

  ngOnDestroy() {
    this.clearAll();
  }

  onOverlayClick() {
    this.dismiss();
  }

  private startSequence() {
    this.animState.set('showing-log');

    // Typewriter for boot line
    const full = this.LOG_FULL;
    let i = 0;
    this.typewriterInterval = setInterval(() => {
      this.logText.set(full.slice(0, ++i));
      if (i >= full.length) {
        clearInterval(this.typewriterInterval!);
        this.typewriterInterval = undefined;
      }
    }, 30);

    // Show box at 600ms
    this.timers.push(setTimeout(() => this.animState.set('showing-box'), 600));

    // Show cursor at 900ms + start blink
    this.timers.push(setTimeout(() => {
      this.animState.set('showing-cursor');
      this.cursorVisible.set(true);
      this.cursorInterval = setInterval(() => {
        this.cursorVisible.update(v => !v);
      }, 500);

      // Start countdown drain: from 100 → 0 over DISMISS_DELAY
      const start = Date.now();
      const drain = setInterval(() => {
        const elapsed = Date.now() - start;
        const pct = Math.max(0, 100 - (elapsed / this.DISMISS_DELAY) * 100);
        this.countdownWidth.set(pct);
        if (pct <= 0) clearInterval(drain);
      }, 16);
      this.drainInterval = drain;

      this.animState.set('counting-down');
    }, 900));

    // Auto-dismiss at 900 + DISMISS_DELAY
    this.timers.push(setTimeout(() => this.dismiss(), 900 + this.DISMISS_DELAY));
  }

  private dismiss() {
    if (this.animState() === 'dismissed') return;
    this.animState.set('dismissed');
    this.clearAll();
    this.dismissed.emit();
  }

  private reset() {
    this.clearAll();
    this.animState.set('idle');
    this.logText.set('');
    this.cursorVisible.set(false);
    this.countdownWidth.set(100);
  }

  private clearAll() {
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = undefined;
    }
    if (this.cursorInterval) {
      clearInterval(this.cursorInterval);
      this.cursorInterval = undefined;
    }
    if (this.drainInterval) {
      clearInterval(this.drainInterval);
      this.drainInterval = undefined;
    }
  }
}
```

- [ ] **Step 2: Create the component HTML template**

```html
<!-- src/app/components/workout-complete-overlay/workout-complete-overlay.component.html -->
@if (animState() !== 'idle') {
  <div
    class="fixed inset-0 z-50 bg-background flex flex-col justify-center font-mono cursor-pointer"
    (click)="onOverlayClick()"
    style="animation: overlayFadeIn 200ms ease forwards;">

    <!-- Scanlines -->
    <div class="absolute inset-0 pointer-events-none"
         style="background: repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px);">
    </div>

    <div class="relative z-10 px-6 py-10 max-w-sm w-full mx-auto">

      <!-- Boot log line -->
      <div class="text-outline text-[10px] mb-6 min-h-[16px]">
        {{ logText() }}<span
          class="inline-block w-[6px] h-[10px] bg-on-surface align-middle ml-[1px]"
          [class.opacity-0]="logText().length < LOG_FULL.length"></span>
      </div>

      <!-- DONE box -->
      @if (animState() === 'showing-box' || animState() === 'showing-cursor' || animState() === 'counting-down') {
        <div class="border border-primary p-5 text-center mb-6"
             style="animation: boxReveal 200ms ease forwards;">

          <div class="text-[22px] font-black tracking-[6px] text-primary mb-4">DONE</div>

          <div class="flex justify-center gap-8 text-[10px]">
            <div class="text-center">
              <div class="text-outline text-[9px] mb-1 tracking-widest">TIME</div>
              <div class="text-[16px] font-bold text-primary">{{ formattedTime() }}</div>
            </div>
            <div class="text-center">
              <div class="text-outline text-[9px] mb-1 tracking-widest">SETS</div>
              <div class="text-[16px] font-bold text-primary">{{ sets }}</div>
            </div>
          </div>

        </div>
      }

      <!-- Blinking cursor -->
      @if (animState() === 'showing-cursor' || animState() === 'counting-down') {
        <div class="text-outline text-[10px]">
          $ exit 0&nbsp;<span
            class="inline-block w-[7px] h-[11px] bg-on-surface-variant align-middle"
            [class.opacity-0]="!cursorVisible()"></span>
        </div>
      }

    </div>

    <!-- Countdown drain bar -->
    @if (animState() === 'counting-down') {
      <div class="absolute bottom-0 left-0 right-0">
        <div class="bg-outline-variant h-[2px]">
          <div class="bg-primary h-[2px] transition-none"
               [style.width.%]="countdownWidth()"></div>
        </div>
        <div class="text-center text-outline-variant text-[9px] tracking-[3px] py-1">
          TAP TO DISMISS
        </div>
      </div>
    }

  </div>
}

<style>
  @keyframes overlayFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes boxReveal {
    from { opacity: 0; transform: scale(0.95); }
    to   { opacity: 1; transform: scale(1); }
  }
</style>
```

- [ ] **Step 3: Commit the new component**

```bash
git add src/app/components/workout-complete-overlay/
git commit -m "feat: add WorkoutCompleteOverlayComponent shell"
```

---

## Task 2: Integrate overlay into ActiveWorkoutComponent

**Files:**
- Modify: `src/app/components/active-workout/active-workout.component.ts`
- Modify: `src/app/components/active-workout/active-workout.component.html`

- [ ] **Step 1: Add import and signals to the TS file**

In `active-workout.component.ts`, add the import at the top:

```typescript
import { WorkoutCompleteOverlayComponent } from '../workout-complete-overlay/workout-complete-overlay.component';
import { environment } from '../../../environments/environment';
```

Add `WorkoutCompleteOverlayComponent` to the `imports` array in `@Component`:

```typescript
imports: [
  CommonModule,
  FormsModule,
  WorkoutCompleteOverlayComponent,
],
```

Add these signals after the existing signal declarations (around line 50):

```typescript
showCompleteOverlay = signal(false);
overlayElapsedSeconds = signal(0);
overlaySets = signal(0);
readonly isDev = !environment.production;
```

- [ ] **Step 2: Modify `finishWorkout()` to show overlay instead of navigating**

Replace the existing `finishWorkout()` method body. Find:

```typescript
this.stopTimer();
this.stopRestTimer();

this.toastService.success('Workout completed! Great job!', 3000);
this.router.navigate(['/history']);
```

Replace with (note: the toast is intentionally removed — the overlay replaces it as completion feedback):

```typescript
this.stopTimer();
this.stopRestTimer();

this.overlayElapsedSeconds.set(this.elapsedTime());
this.overlaySets.set(this.completedSets());
this.showCompleteOverlay.set(true);
```

- [ ] **Step 3: Add `onOverlayDismissed()` method**

Add this method after `finishWorkout()`:

```typescript
onOverlayDismissed() {
  this.showCompleteOverlay.set(false);
  this.router.navigate(['/history']);
}
```

- [ ] **Step 4: Add overlay and dev test button to the HTML template**

At the very end of `active-workout.component.html`, just before the closing `</div>`, add:

```html
  <!-- Workout complete overlay -->
  <app-workout-complete-overlay
    [visible]="showCompleteOverlay()"
    [elapsedSeconds]="overlayElapsedSeconds()"
    [sets]="overlaySets()"
    (dismissed)="onOverlayDismissed()">
  </app-workout-complete-overlay>

  <!-- DEV: test button — remove before merging to main -->
  @if (isDev) {
    <div class="fixed bottom-16 right-4 z-40">
      <button
        (click)="overlayElapsedSeconds.set(2842); overlaySets.set(12); showCompleteOverlay.set(true)"
        class="bg-surface-container border border-outline-variant text-on-surface-variant text-[9px] uppercase tracking-widest px-3 py-2 hover:border-primary hover:text-primary">
        [DEV] TEST_OVERLAY
      </button>
    </div>
  }
```

- [ ] **Step 5: Commit integration**

```bash
git add src/app/components/active-workout/active-workout.component.ts
git add src/app/components/active-workout/active-workout.component.html
git commit -m "feat: integrate workout complete overlay into active-workout"
```

---

## Task 3: Manual verification

- [ ] **Step 1: Start the dev server**

```bash
npm start
```

- [ ] **Step 2: Verify the DEV button appears**

Navigate to any active workout (`/workout/:id`). Confirm `[DEV] TEST_OVERLAY` button appears in the bottom-right corner.

- [ ] **Step 3: Test via DEV button**

Click `[DEV] TEST_OVERLAY`. Confirm:
- Overlay fades in over the screen
- `> committing session... done` types in character by character
- `DONE` box appears with `47:22` time and `12` sets
- `$ exit 0 _` cursor appears and blinks
- Bottom bar drains from right to left over ~3 seconds
- After ~3 seconds, overlay dismisses and page navigates to `/history`

- [ ] **Step 4: Test click-to-dismiss**

Trigger the overlay again, click anywhere on it before auto-dismiss. Confirm it navigates to `/history` immediately.

- [ ] **Step 5: Test real workout completion**

Start a workout, complete all sets, press `[FINISH_SESSION]`. Confirm the overlay plays and then navigates to `/history`.

- [ ] **Step 6: Commit verification checkpoint**

```bash
git commit --allow-empty -m "chore: manual verification complete — overlay working"
```

---

## Notes

- The `<style>` block in the overlay HTML defines `@keyframes` locally. This is acceptable since the component is standalone and the animations are not reused elsewhere.
- The countdown bar uses `[style.width.%]` binding updated every 16ms (rAF-like). This is intentional — CSS `transition` alone can't drive a reactive countdown without a signal driving width.
- The `[DEV] TEST_OVERLAY` button passes hardcoded values (`2842` seconds = `47:22`, `12` sets) for predictable testing.
- Remove the `@if (isDev)` test button block from `active-workout.component.html` before merging to `main`.
