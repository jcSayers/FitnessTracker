# FitnessTracker — Project Status Update

**Date:** 2026-03-23

## Overview

FitnessTracker is a full-stack, multi-platform fitness workout management application with offline-first cloud synchronization. It enables users to create workout templates, track live workouts, review history, and sync data across devices.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 19 (standalone components) + Tailwind CSS |
| Backend | Node.js / Express + TypeScript |
| Local Database | Dexie.js (IndexedDB) |
| Cloud Database | PostgreSQL via Supabase + Drizzle ORM |
| Desktop | Electron 30 |
| Mobile | Capacitor 6 (Android / iOS) |
| API Docs | Swagger / OpenAPI |
| Testing | Karma + Jasmine |

## Feature Status

### Complete

- **Workout Templates** — Create, edit, delete reusable workout plans with exercises, difficulty levels, and categories
- **Live Workout Tracking** — Execute workouts with real-time set/rep logging and completion tracking
- **Workout History & Analytics** — View past workouts with performance statistics
- **Calendar Heatmap** — Visual activity calendar showing workout frequency
- **Exercise Management** — Full CRUD for custom exercises with undo support
- **Rest Timer** — Built-in countdown timer for rest periods between sets
- **Offline-First Local Database** — All data stored locally in IndexedDB via Dexie.js; app works fully offline
- **Cloud Sync** — Two-way sync with Supabase (push local changes, pull cloud data)
- **Sync Queue & Safeguards** — Automatic change detection and queuing with:
  - 2-second debounce between auto-sync attempts
  - 1-second rate limiting between any sync attempts
  - 1,000-item queue cap (blocks if exceeded)
  - 3 consecutive failure limit before stopping retries
  - 2-minute stuck sync detection
  - Duplicate detection and anomaly alerts
- **Sync Diagnostics** — Console APIs for monitoring and debugging (`window.syncDiagnostics.report()`, `.status()`, `.anomalies()`, etc.)
- **Garmin FIT Import** — Parse and import Garmin fitness device files with heart rate, cadence, GPS, distance, and calorie metrics
- **Data Export/Import** — Full JSON export with safety backups; desktop file dialog integration
- **Electron Desktop App** — Cross-platform desktop builds with native menu bar and file dialogs
- **Capacitor Mobile Builds** — Android and iOS deployment from the same codebase
- **Swagger API Documentation** — Interactive API docs at `/api-docs`

### Gaps / Areas for Improvement

- **Test coverage is minimal** — 6 spec files with basic unit tests; no end-to-end tests configured
- **No CI/CD pipeline** — No GitHub Actions or equivalent automation
- **No user authentication UI** — User ID is assumed/configured, not behind a login flow
- **README is boilerplate** — The root README is default Angular CLI output despite 20+ detailed markdown guides existing in the repo

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/sync` | Full sync (templates, instances, logs) |
| GET | `/api/sync/:userId` | Get user's synced data |
| POST | `/api/sync/:userId/templates` | Sync templates only |
| POST | `/api/sync/:userId/instances` | Sync instances only |
| POST | `/api/sync/:userId/logs` | Sync logs only |
| GET | `/api/sync/:userId/status` | Get last sync timestamp |
| DELETE | `/api/sync/:userId` | Delete all user data |
| POST | `/api/import/fit` | Import Garmin FIT file |

## Database Schema

**Server (PostgreSQL — 5 tables):**
- `users` — User accounts (UUID primary key)
- `workout_templates` — Templates with exercises (JSONB), metadata, user FK
- `workout_instances` — Completed workouts with optional Garmin metrics
- `exercise_logs` — Individual exercise performance logs with optional GPS data
- `sync_status` — Per-user sync timestamps and counts

**Local (IndexedDB — 2 databases):**
- `FitnessTrackerDB` — workoutTemplates, workoutInstances, exerciseLogs
- `FitnessTrackerSyncQueue` — Pending sync operations

## Frontend Routes

| Route | Component | Purpose |
|---|---|---|
| `/dashboard` | WorkoutListComponent | Home view with templates and stats |
| `/create-workout` | CreateWorkoutComponent | Build workout templates |
| `/manage-exercises` | ManageExercisesComponent | Exercise CRUD |
| `/add-exercise` | AddExerciseComponent | Create a new exercise |
| `/workout/:id` | ActiveWorkoutComponent | Live workout tracking |
| `/history` | WorkoutHistoryComponent | Past workouts and analytics |

## Architecture

The app follows an **offline-first** pattern:

1. All data operations write to the local Dexie.js database first
2. Changes are automatically queued in the sync queue (IndexedDB)
3. When connectivity is detected, the SyncManagerService batches and pushes changes to the server
4. The server processes changes via Drizzle ORM into Supabase/PostgreSQL
5. Cloud-to-local ID mappings are returned and applied locally
6. SyncDiagnosticsService monitors all operations for anomalies

## Available Commands

```bash
# Development
npm start              # Angular dev server (:4200)
npm run server:dev     # Node.js server (:3000)
npm run dev:full       # Both simultaneously

# Build
npm run build          # Angular production build
npm run server:build   # Compile server TypeScript
npm run electron:build # Electron production build

# Database
npm run db:migrate     # Run Drizzle migrations
npm run db:studio      # Drizzle GUI

# Testing
npm test               # Karma unit tests
```

## Summary

FitnessTracker is a **feature-complete, well-architected** fitness application with robust sync infrastructure and multi-platform support. The primary areas for improvement are test coverage, CI/CD automation, and user authentication.
