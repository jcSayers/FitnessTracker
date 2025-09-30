# Fitness Tracker

Angular 19 mobile-first fitness tracking application with offline-first data persistence.

## Architecture

- **Framework**: Angular 19 (standalone components)
- **UI**: Angular Material + TailwindCSS
- **Database**: Dexie (IndexedDB wrapper)
- **Mobile**: Capacitor for iOS/Android deployment
- **State**: Service-based architecture with RxJS

## Core Features

- **Workout Templates**: Create and manage exercise routines
- **Active Workouts**: Real-time workout tracking with timers
- **History**: Completed workout logs and statistics
- **Offline-First**: Local data storage with future sync capability

## Key Components

- `workout-list`: Dashboard showing available templates
- `create-workout`: Template creation and editing
- `active-workout`: Live workout execution
- `workout-history`: Historical data and statistics

## Data Models

- `WorkoutTemplate`: Exercise routines with sets/reps/duration
- `WorkoutInstance`: Executed workout sessions with progress
- `ExerciseLog`: Individual exercise performance tracking
- `WorkoutStats`: Analytics and streak calculations

## Development

```bash
npm start          # Development server
npm run build      # Production build
npm run cap:sync   # Sync with mobile platforms
```