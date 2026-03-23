# FitnessTracker — Frontend UI Design Specification

## Design System

### Theme: Dark Glass-Morphism
- **Background**: #000000 (pure black)
- **Surface**: #0a0a0a (near-black)
- **Primary**: #0888ff (bright blue)
- **Accent/Success**: #11d16c (green)
- **Secondary text**: #94a3b8 (slate gray)
- **Error**: #ef4444 (red)
- **Warning**: #ff9800 (amber)
- **Text**: #ffffff (white)

### Glass-Morphism Effects
- **Card backgrounds**: rgba(18, 18, 18, 0.95) with 20px backdrop-blur
- **Glass accent**: rgba(8, 136, 255, 0.12) bg, rgba(8, 136, 255, 0.3) border
- **Glass shadow**: 0 8px 32px rgba(8, 136, 255, 0.15)
- **Success glass**: rgba(17, 209, 108, 0.12) bg

### Typography
- **Font**: Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto
- **Rendering**: antialiased
- **Monospace numbers**: font-variant-numeric: tabular-nums (for timers)

### Spacing & Rounding
- Cards: 12–16px padding, border-radius 12px
- Buttons: 12px vertical / 24px horizontal padding, border-radius 8px
- Inputs: 12px padding, border-radius 8px
- Page padding: 16px horizontal

### Animations
- fadeIn: opacity 0→1 over 0.3s
- slideUp: translateY(20px)→0 + fade over 0.3s
- slideIn/slideOut: translateX(400px)↔0 from right over 0.3s
- pulse: scale 1→1.05→1, opacity 1→0.9→1 over 2s (infinite, for active states)
- spin: rotate 360° over 2s (infinite, for loading)
- All interactive transitions: 0.2s ease

---

## Data Models (shapes displayed in the UI)

```
Exercise {
  name: string
  category: STRENGTH | CARDIO | FLEXIBILITY | SPORTS
  sets: number
  reps?: number
  weight?: number (lbs)
  duration?: number (seconds)
  restTime?: number (seconds)
  notes?: string
}

WorkoutTemplate {
  name: string
  description?: string
  exercises: Exercise[]
  estimatedDuration: number (minutes)
  difficulty: BEGINNER | INTERMEDIATE | ADVANCED
  category: STRENGTH | CARDIO | HIIT | YOGA | SPORTS | MIXED
}

WorkoutInstance {
  templateName: string
  startTime: Date
  endTime?: Date
  totalDuration?: number
  sets: WorkoutSet[]
  status: IN_PROGRESS | COMPLETED | PAUSED | CANCELLED
  completedExercises: number
  totalExercises: number
}

WorkoutSet {
  exerciseId: string
  setNumber: number
  reps?: number
  weight?: number
  duration?: number
  completed: boolean
}

WorkoutStats {
  totalWorkouts: number
  totalDuration: number
  averageDuration: number
  currentStreak: number
  longestStreak: number
  weeklyGoal: number
  weeklyProgress: number
}
```

---

## Icon System

SVG icons rendered inline at 4 sizes: sm (16px), md (24px), lg (32px), xl (48px).

Available icons: dashboard, history, add_circle, edit, delete, add, save, refresh, arrow_back, arrow_forward, arrow_upward, arrow_downward, check_circle, play_circle, pause_circle, cancel, check, close, fitness_center, note, play, pause, stop, info, visibility

---

## Shared UI Components

### Custom Input
- Floating label that animates up on focus or when filled
- Optional suffix text aligned right inside the field (e.g., "lbs", "sec", "minutes")
- Error state: red border + red error message below
- Focus state: blue ring glow (0 0 0 3px rgba(0,123,255,0.1))
- Disabled state: gray background
- Dark input background: rgba(255,255,255,0.05), border rgba(60,60,67,0.3)

### Custom Select
- Dropdown button with chevron indicator that rotates 180° when open
- Options in scrollable container (max 250px height)
- Selected option highlighted with blue background
- Keyboard accessible: ArrowDown/Up to open, Escape to close
- Placeholder: "Select an option" when empty

### Custom Modal
- Fixed centered overlay with rgba(0,0,0,0.5) backdrop
- Max width 500px, max height 90vh with scroll
- Header with title + close button (×)
- Content area (flexible, supports custom content)
- Action buttons row: styles "primary" (blue), "danger" (red), "default" (gray)
- Enter animation: backdrop fadeIn + content slideUp

### Custom Toast
- Slides in from right edge of screen
- Glass-morphism: rgba(40,40,50,0.98) bg with 20px blur
- Left border colored by type: success (green), error (red), warning (yellow), info (blue)
- Icon + message + optional action button + close button
- Min 300px, max 500px width
- Auto-dismiss with slide-out animation

---

## Navigation

### Bottom Navigation Bar (mobile-first, always visible)
- Fixed at screen bottom, z-index 1000
- Background: rgba(10, 10, 10, 0.95) with 20px backdrop-blur
- Top border: 1px solid rgba(255,255,255,0.08)
- Shadow: 0 -4px 24px rgba(0,0,0,0.3)
- 3 tabs equally spaced:
  1. **Dashboard** (grid icon) → /dashboard
  2. **Create** (plus-circle icon) → /create-workout
  3. **History** (clock icon) → /history
- Active tab: blue text + icon; Inactive: gray
- Red badge dot on Dashboard when an active workout exists
- Hidden on /workout/:id screens (active workout)

### Sync Status Bar (top of app, conditional)
- Shows when: offline, syncing, or pending changes exist
- Offline: red icon + "Offline" text
- Syncing: spinner + status message
- Pending: up-arrow icon + count of pending items

### Desktop Header (Electron only)
- White toolbar with "Fitness Tracker" title on left
- Three-dot menu button on right → dropdown menu:
  - Export Workouts
  - Import Workouts
  - Separator line
  - About

---

## Pages

### 1. Dashboard (/dashboard)

**Stats Header** — glass-card at top
- 3-column grid showing: Total Workouts, Day Streak, Avg Duration
- Each stat: large number + small label below
- Weekly Goal: progress bar (blue fill) + "N / goal" text

**Quick Actions** — 2-column button grid
- "View History" button (blue outline/text)
- "Create Workout" button (purple filled)

**Workout Template Cards** — vertical list
- Each card is a glass-card with hover lift effect (translateY -4px)
- Card header: workout name (bold) + exercise count + duration + category icon
- Optional description text (gray, truncated)
- Difficulty chip: Beginner (green), Intermediate (yellow/amber), Advanced (red)
- Category chip: light gray background
- Action row: "Edit" text button (blue) + "Start" filled button (blue with play icon)

**Loading State**: animated progress bar + "Loading workouts..."
**Empty State**: large fitness icon + "No workouts yet" + "Create your first workout" CTA button

**FAB** (Floating Action Button): fixed bottom-right (above nav), purple circle with + icon

---

### 2. Create Workout (/create-workout)

**Header**: back arrow + "Create Workout" title

**Form** in a glass-card section:
- Workout Name — text input, required, min 3 chars, placeholder "e.g., Upper Body Strength"
- Description — textarea, 3 rows, placeholder "Describe your workout..."
- Category — dropdown (Strength, Cardio, HIIT, Yoga, Sports, Mixed)
- Difficulty — dropdown (Beginner, Intermediate, Advanced)
- Estimated Duration — number input with "minutes" suffix, range 5–300

**Actions row**:
- Cancel (gray text button)
- Next (blue filled button with arrow-forward icon)

Validation: inline red error messages below each field on touch

---

### 3. Add/Edit Exercise (/add-exercise)

**Header**: Cancel (left, text) + "Create Exercise" or "Edit Exercise" title + Done (right, blue, disabled if invalid)

**Form sections** in glass-card:
- Exercise Name — text input, placeholder changes by category
  - Strength: "e.g., Bench Press, Squats"
  - Cardio: "e.g., Running, Cycling"
  - Flexibility: "e.g., Stretching, Yoga"
  - Sports: "e.g., Basketball, Soccer"
- Category — select dropdown
- Sets (1–20) + Reps (1–100) — side-by-side 2-column grid
- Weight (0–1000 lbs) + Duration (1–3600 sec) — side-by-side 2-column grid, each with suffix
- Rest Time (0–600 sec) — with "seconds" suffix
- Notes — textarea, 3 rows, placeholder "Form cues, modifications, etc."

---

### 4. Manage Exercises (/manage-exercises)

**Header**: back arrow + workout name (title) + optional description (subtitle)

**Exercise List Section**:
- Section header: "Exercises (N)" + "Add Exercise" blue button with + icon
- Each exercise card:
  - Left: blue numbered circle (32px, white text)
  - Center: exercise name (bold) + description string ("3 sets • 12 reps • 150 lbs • 60s rest")
  - Notes line (if exists): note icon + text
  - Right action buttons: Move Up ↑, Move Down ↓, Edit (blue), Delete (red)
  - Move buttons disabled at list boundaries

**Empty State**: large fitness icon + "No exercises yet" + "Add exercises to build your workout" + "Add First Exercise" button

**Bottom Actions** (fixed):
- Back (gray outlined button)
- Save Workout (blue filled, disabled if 0 exercises, shows spinner while saving)

---

### 5. Active Workout (/workout/:id)

#### Pre-Workout View
- "Ready to start?" heading
- Numbered exercise list preview:
  - Blue circle number + exercise name + detail string ("3×12 150lb" or "3×45s")
- Large "Start Workout" button (blue, full width)

#### Active Workout View

**Sticky Header**: back arrow + workout name + live timer (HH:MM:SS, large blue text, tabular-nums)

**Exercise Cards** (vertical list):
- Exercise header: name + detail format
- **Set Circles Row** (flex-wrap):
  - Each set is a 48px circle
  - Inactive: rgba(60,60,67,0.3) bg, dim text
  - Completed: blue glass effect + glow shadow
  - Current: blue border, rgba(8,136,255,0.15) bg, pulse animation
- **Set Input Section** (only visible for current exercise, not during rest):
  - Responsive grid (auto-fit, min 120px):
    - Reps input (if applicable)
    - Weight input with "lbs" suffix (if applicable)
    - Duration input with "sec" suffix (if applicable)
  - Notes callout: blue background strip with note icon + text
  - "Complete Set" button (blue, full width)

**Rest Timer Overlay** (appears between sets):
- Container: rgba(0,0,0,0.85) bg, 12px radius, min 280px wide
- Timer display: large MM:SS text + "Rest 1m0s" label
- Dismiss button (X icon, top right)
- Progress bar: blue gradient fill that depletes over rest duration
- Auto-starts, emits event on complete or dismiss

**Floating Controls** (fixed bottom-right, above nav):
- Play/Pause toggle FAB (blue when play, gray when pause)
- Stop FAB (red)

#### Workout Complete View
- Large green check icon
- "Workout Complete!" heading
- Stats grid: Duration + Sets Completed
- "Finish Workout" button (blue)

---

### 6. Workout History (/history)

**Header**: back arrow + "Workout History" title

**Stats Overview** — glass-card:
- "Your Stats" heading
- 4-column grid: Total Workouts, Current Streak, Best Streak, Avg Duration
- Weekly progress: progress bar + "N / goal workouts"

**History List** — grouped by date:
- Date header: "Today" / "Yesterday" / "Mon, Jan 15" + "N workouts" badge
- Workout cards within each group:
  - Header: workout name + time ("2:45 PM • 45m") + status icon (colored by status)
  - Status colors: Completed (green ✓), In Progress (blue ▶), Paused (yellow ⏸), Cancelled (red ✕)
  - Completed: exercise count icon + set count icon + optional notes
  - Incomplete: progress bar showing "N / M exercises" with percentage
  - Status chip (colored pill)
  - Action buttons: Resume (blue, for in-progress/paused) + Details (gray)

**Calendar Heatmap** — at bottom:
- "Workout Calendar" heading
- Legend: "Less" → 4 gradient boxes (empty → low → medium → high) → "More"
- Monthly grids showing past months:
  - Month/year label
  - Weekday headers (S M T W T F S)
  - Day cells:
    - 0 workouts: transparent with faint border
    - 1 workout: light blue (intensity-low)
    - 2 workouts: medium blue (intensity-medium)
    - 3+ workouts: dark blue (intensity-high)
    - Today: extra border indicator
    - Non-current-month days: dimmed
    - Tooltip on hover: "MM/DD/YYYY - N workout(s)"

**Loading State**: animated progress bar + "Loading workout history..."
**Empty State**: large history icon + "No workout history" + CTA button

---

## Responsive Behavior

**Breakpoint**: 768px

### Mobile (< 768px)
- All cards: full width, reduced padding
- Stats grids: tighter spacing (columns stay)
- Action buttons: stack to single column
- Workout card actions: flex-direction column
- Set circles: 44px, flex-wrap
- Input grids: single column
- FAB: bottom 84px, right 12px
- Main content: padding-bottom 80px (nav clearance)

### Desktop (≥ 768px)
- Optional top toolbar header (Electron)
- Cards maintain max-width constraints
- Side-by-side form fields preserved
- Larger touch targets not needed

---

## Interaction Patterns

### Form Behavior
- Reactive validation on field touch/blur
- Inline red error messages below invalid fields
- Submit buttons disabled when form is invalid
- Loading spinners replace button text during async operations

### Workout Flow
1. Dashboard → tap template → "Start Workout" → pre-workout preview
2. Pre-workout → "Start Workout" → timer begins, first exercise active
3. Fill in set values → "Complete Set" → set circle fills blue
4. Rest timer auto-appears → counts down → auto-dismisses or tap to skip
5. All sets done → auto-advance to next exercise
6. All exercises done → "Workout Complete!" screen with stats
7. "Finish Workout" → returns to dashboard

### Card Interactions
- Cards lift on hover (translateY -4px, enhanced shadow)
- Buttons have color transitions on hover (0.2s)
- Delete actions use confirmation modals
- Undo support for exercise deletion (toast with undo action)

### Sync Indicator
- Online: green pulsing dot + "Online"
- Offline: red dot + "Offline"
- Syncing: progress bar with percentage + status text
- Pending: spinning gear + "N pending"
- Error: warning icon + error message
- Manual sync: refresh button (when online and idle)
