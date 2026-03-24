# Workout Complete Animation — Design Spec

**Date:** 2026-03-24
**Status:** Approved
**Branch:** feature/terminal-redesign

---

## Overview

When a user finishes a workout, display a fullscreen terminal-style overlay animation before navigating to `/history`. The overlay is minimal, retro-game / Linux terminal in aesthetic, consistent with the existing monochrome JetBrains Mono design system.

---

## Visual Design

Fullscreen dark overlay (`bg-background` / `#131313`) centered vertically.

**Sequence (elements that appear):**

1. One boot log line: `> committing session... done` (dim grey + white "done")
2. A hard-edged bordered box (`border border-primary`) containing:
   - **DONE** — large, bold, wide letter-spacing
   - Two stats side by side: **TIME** (formatted `MM:SS`) and **SETS** (count of completed sets)
3. Blinking cursor: `$ exit 0 _`
4. A 2px countdown bar along the bottom edge, draining left→right over 3 seconds

Subtle CSS scanline texture overlay (repeating-linear-gradient, ~8% opacity) across the full screen.

**Reference mockup:** `.superpowers/brainstorm/1726-1774326436/animation-minimal.html`
**Extended version (for later reference):** `.superpowers/brainstorm/1726-1774326436/animation-detail.html`

---

## Animation Timing

| Time | Event |
|------|-------|
| 0ms | Overlay fades in (`opacity: 0 → 1`, ~200ms) |
| 250ms | Boot log line types in (one character at a time, ~30ms/char) |
| 600ms | Bordered DONE box fades + scales in (`scale(0.95) → scale(1)`, 200ms) |
| 800ms | Stats revealed |
| 900ms | Cursor appears, blink animation starts (500ms interval) |
| 900ms | Countdown bar begins draining (3000ms linear) |
| 3900ms | Auto-dismiss: overlay fades out, navigate to `/history` |
| any click | Instant dismiss, navigate to `/history` |

---

## Component Architecture

### New component: `WorkoutCompleteOverlayComponent`

- **Location:** `src/app/components/workout-complete-overlay/`
- **Type:** Standalone Angular component
- **Inputs:**
  - `elapsedSeconds: number` — raw elapsed time in seconds; the overlay formats it as `MM:SS` internally (strips hours for display brevity)
  - `sets: number` — count of completed sets
  - `visible: boolean` — controls overlay display
- **Outputs:**
  - `dismissed: EventEmitter<void>` — emitted when overlay is dismissed (by timer or click)
- **No external animation libraries** — pure CSS transitions + `setTimeout` sequencing via Angular signals

### State machine (internal signals)

```
idle → showing-log → showing-box → showing-cursor → counting-down → dismissed
```

Each state transition scheduled with `setTimeout`. Clicking the overlay at any state jumps directly to `dismissed`.

### Integration into `ActiveWorkoutComponent`

- `finishWorkout()` saves the workout instance to DB, then sets `showCompleteOverlay = true` (signal)
- Overlay is rendered via `@if (showCompleteOverlay())` in the template
- On `(dismissed)` output: navigate to `/history`
- **Does not** navigate to `/history` directly anymore — the overlay handles that

---

## Temporary Test Button

A `[DEV] TEST_OVERLAY` button added to the active workout template, only rendered in development mode (`!environment.production`). Triggers `showCompleteOverlay = true` with mock data. To be removed before merging to main.

---

## Styles

All styles via Tailwind utility classes. No new SCSS files needed.

Key tokens used:
- `bg-background` / `#131313` — overlay background
- `border-primary` / `#ffffff` — box border
- `text-primary` / `#ffffff` — primary text
- `text-outline` / `#919191` — dim text
- `font-mono` / JetBrains Mono — all text
- 0px border radius (already global)

---

## Files Changed

| File | Change |
|------|--------|
| `src/app/components/workout-complete-overlay/workout-complete-overlay.component.ts` | **New** |
| `src/app/components/workout-complete-overlay/workout-complete-overlay.component.html` | **New** |
| `src/app/components/active-workout/active-workout.component.ts` | Add overlay signal + modify `finishWorkout()` |
| `src/app/components/active-workout/active-workout.component.html` | Add overlay element + dev test button |
| `src/environments/environment.ts` | Read `production` flag (already exists) |
