# Garmin Integration Plan & Platform Gap Analysis

**Date:** 2026-03-24
**Author:** Engineering Analysis
**Scope:** (A) Garmin API integration strategy for FitnessTracker; (B) Feature gap analysis against major fitness apps

---

## Part A: Garmin Integration Plan

### Current State Assessment

The codebase already has a meaningful head start on Garmin integration:

- `server/src/services/garmin-fit.service.ts` — A `GarminFitParser` class using `@garmin/fitsdk` to decode binary `.FIT` files into a typed `GarminFitData` structure, capturing GPS tracks, heart rate, cadence, power, elevation, laps, and device info.
- `server/src/services/fit-transformer.ts` — A `FitTransformer` class that maps parsed FIT data to the app's `WorkoutInstance` / `ExerciseLog` shape, including an `externalSource: 'garmin'` marker and `externalId`.
- `server/src/routes/import.routes.ts` — A live `POST /api/import/fit` endpoint that accepts a multipart-uploaded `.FIT` file, parses, transforms, and persists it via `SyncService`.
- `server/src/db/schema.ts` — The Supabase/Drizzle schema already has columns for `heart_rate_avg`, `heart_rate_max`, `cadence_avg`, `distance`, `elevation_gain`, `calories`, `external_source`, `external_id`, `gps_data`, `power_avg`, `power_max`, and `external_data` on both `workout_instances` and `exercise_logs`.

**In other words:** the manual FIT file import path is functionally complete. What is missing is automated / zero-friction sync — the Garmin Health API webhook flow — and a few model gaps described below.

---

### A1. Which Garmin API to Use

There are three distinct Garmin integration surfaces:

| API | What It Is | Requires | Best For |
|---|---|---|---|
| **Garmin Health API** (formerly Garmin Connect API — Health) | Server-side REST + OAuth 2.0 + push webhooks. Garmin cloud pushes activity summaries, daily summaries, epoch data, heart rate, stress, body composition, and more to your server webhook URL. | Developer account, approved app registration, HTTPS webhook endpoint | Automated background sync of any activity recorded on any Garmin device/app |
| **Connect IQ SDK** | On-device app development for Garmin watches. Build data fields, watch faces, activities, widgets in Monkey C. | Garmin watch hardware for testing | Custom watch faces or data screens showing FitnessTracker data on the wrist |
| **Garmin Connect API (unofficial)** | Reverse-engineered private API used by third-party tools | No official support; subject to breakage; violates ToS | Not recommended |

**Recommendation: Garmin Health API (primary) + FIT file upload (fallback/legacy)**

Rationale:
1. The Health API is Garmin's official, partner-facing integration — it will not break without notice.
2. It pushes data to your server rather than you polling, which eliminates the need for scheduled jobs or the user to remember to export files.
3. It covers the full activity catalogue (running, cycling, swimming, strength, golf, sleep, stress, HRV) via a unified webhook, not just what the user manually exports.
4. The FIT file endpoint already built can remain as a "manual import" escape hatch for users who do not connect their Garmin account, or for bulk historic imports.
5. Connect IQ SDK is only worthwhile if the product roadmap includes building a companion watch app — a nice-to-have (P2), not needed for the core integration.

**Note on access:** The Garmin Health API requires applying for a developer partnership through the Garmin Health Developer Program (`developer.garmin.com/health-api`). Approval typically takes 1-4 weeks. The key OAuth base URL is `https://connectapi.garmin.com` and the webhook registration URL is `https://healthapi.garmin.com`.

---

### A2. Data Flow Architecture

#### Full flow: Garmin device → FitnessTracker PWA

```
[Garmin Watch/Device]
        |  (activity recorded on watch)
        v
[Garmin Connect Mobile App / Garmin Express]
        |  (syncs over Bluetooth / WiFi to Garmin cloud)
        v
[Garmin Cloud / Garmin Health API]
        |  (HTTP POST webhook push, JSON payload)
        v
[FitnessTracker Express Server  ←  new: /api/garmin/webhook]
        |  (verify OAuth signature, parse payload, transform to models)
        v
[Supabase PostgreSQL]
        |  (upsert workout_instances + exercise_logs with external_source='garmin')
        v
[FitnessTracker PWA  ←  existing SyncManagerService.pullFromCloud()]
        |  (GET /api/sync/:userId on next app open or background sync)
        v
[Dexie.js IndexedDB  ←  existing DatabaseService.applyCloudData()]
```

#### OAuth 2.0 handshake for user account linking

```
[User taps "Connect Garmin" in PWA settings]
        |
        v
[PWA redirects to Garmin OAuth endpoint]
  GET https://connect.garmin.com/oauthConfirm
      ?oauth_token=<request_token>
        |
        v
[User authorises on Garmin Connect]
        |
        v
[Garmin redirects to our callback URL]
  GET https://app.fitnesstracker.com/api/garmin/callback
      ?oauth_token=<token>&oauth_verifier=<verifier>
        |
        v
[Server exchanges for access token, stores in users table]
  POST https://connectapi.garmin.com/oauth-service/oauth/access_token
```

Note: The Garmin Health API uses OAuth 1.0a (not 2.0 despite branding). The `oauth` npm package handles the HMAC-SHA1 signing required.

#### Key Garmin Health API endpoints

```
# User registration / deregistration webhooks (sent by Garmin)
POST /api/garmin/webhook/activity-details
POST /api/garmin/webhook/daily-summaries
POST /api/garmin/webhook/epoch-summaries
POST /api/garmin/webhook/sleep

# Your server pulls backfill on first connect
GET  https://healthapi.garmin.com/wellness-api/rest/activities
     ?uploadStartTimeInSeconds=<unix>&uploadEndTimeInSeconds=<unix>
     Authorization: OAuth realm="..."

# Individual activity detail (includes FIT file download URL)
GET  https://healthapi.garmin.com/wellness-api/rest/activities/{activityId}

# Body composition (weight, body fat)
GET  https://healthapi.garmin.com/wellness-api/rest/bodyComps
     ?startDate=<YYYY-MM-DD>&endDate=<YYYY-MM-DD>

# Daily summaries (steps, calories, active time, intensity minutes)
GET  https://healthapi.garmin.com/wellness-api/rest/dailies
     ?startDate=<YYYY-MM-DD>&endDate=<YYYY-MM-DD>

# Heart rate variability (HRV) summary
GET  https://healthapi.garmin.com/wellness-api/rest/hrv
     ?startDate=<YYYY-MM-DD>&endDate=<YYYY-MM-DD>

# Stress summary
GET  https://healthapi.garmin.com/wellness-api/rest/stressDetails
     ?startDate=<YYYY-MM-DD>&endDate=<YYYY-MM-DD>
```

#### Webhook payload example — activity details push

```json
{
  "activities": [
    {
      "userId": "abc123",
      "userAccessToken": "token_xyz",
      "summaryId": "garmin_act_789",
      "activityType": "RUNNING",
      "startTimeInSeconds": 1742688000,
      "startTimeOffsetInSeconds": 3600,
      "durationInSeconds": 3240,
      "distanceInMeters": 8050.4,
      "averageSpeedInMetersPerSecond": 2.48,
      "maxSpeedInMetersPerSecond": 3.12,
      "averageHeartRateInBeatsPerMinute": 155,
      "maxHeartRateInBeatsPerMinute": 178,
      "activeKilocalories": 620,
      "totalElevationGainInMeters": 85.0,
      "totalElevationLossInMeters": 82.0,
      "averageRunCadenceInStepsPerMinute": 168,
      "vo2MaxPreciseValue": 52.3
    }
  ]
}
```

#### Integration with existing SyncManagerService / SyncQueueService

The existing sync architecture is push-from-client centric. The Garmin integration introduces a pull-from-server pattern that the existing `pullFromCloud()` method in `SyncManagerService` already supports. The integration touches the server only and requires no changes to the Angular sync services for the happy path.

**Server-side additions needed:**

1. New route file: `server/src/routes/garmin.routes.ts`
   - `GET /api/garmin/auth` — initiate OAuth flow, return redirect URL
   - `GET /api/garmin/callback` — exchange verifier for access token, store in DB
   - `POST /api/garmin/webhook` — receive Garmin push, validate HMAC signature, enqueue for processing
   - `DELETE /api/garmin/disconnect` — revoke token, deregister user from Garmin webhooks

2. New service: `server/src/services/garmin-health-api.service.ts`
   - OAuth 1.0a request signing
   - Backfill fetch on first connect (last 90 days)
   - Activity detail fetch (to get FIT file download URL for full GPS track)
   - Body composition fetch
   - HRV / stress summary fetch

3. New DB table: `garmin_connections` (store userId, garminUserId, accessToken, accessTokenSecret, connectedAt, lastWebhookAt)

4. New DB table (optional): `garmin_activity_cache` (raw webhook payloads before processing, for idempotency)

**PWA-side additions needed:**

1. New route `/settings/integrations` — "Connect Garmin" button that initiates the OAuth flow.
2. No changes to `SyncManagerService` needed — Garmin-imported activities appear in the database and are returned by the existing `GET /api/sync/:userId` pull endpoint, which `pullFromCloud()` already calls.

---

### A3. Data Mapping

#### Garmin Health API activity summary → FitnessTracker models

| Garmin Field | Type | Maps To | Notes |
|---|---|---|---|
| `activityType` | string | `WorkoutInstance.templateName` prefix / `WorkoutCategory` | via existing `GarminFitParser.mapActivityType()` |
| `startTimeInSeconds` | Unix | `WorkoutInstance.startTime` | multiply × 1000 |
| `durationInSeconds` | number | `WorkoutInstance.totalDuration` | already in seconds in DB schema |
| `distanceInMeters` | number | `workout_instances.distance` | already in schema |
| `activeKilocalories` | number | `workout_instances.calories` | already in schema |
| `averageHeartRateInBeatsPerMinute` | number | `workout_instances.heart_rate_avg` | already in schema |
| `maxHeartRateInBeatsPerMinute` | number | `workout_instances.heart_rate_max` | already in schema |
| `averageRunCadenceInStepsPerMinute` | number | `workout_instances.cadence_avg` | already in schema |
| `totalElevationGainInMeters` | number | `workout_instances.elevation_gain` | already in schema |
| `summaryId` | string | `workout_instances.external_id` | already in schema |

#### Fields with no current model equivalent — GAPS requiring model extension

| Garmin Field | Source | Gap | Proposed Extension |
|---|---|---|---|
| `vo2MaxPreciseValue` | Activity summary | No VO2 max field anywhere | Add `vo2_max FLOAT` to `workout_instances`; add `vo2Max?: number` to `WorkoutInstance` model |
| `averagePowerInWatts` / `maxPowerInWatts` | Activity summary (cycling) | `exercise_logs` has `power_avg`/`power_max` but `workout_instances` does not | Add `power_avg INT`, `power_max INT` to `workout_instances` DB schema |
| Heart rate zones (time in zone 1-5) | Activity summary | No HR zone concept anywhere in model | Add `hr_zones JSONB` to `workout_instances` — `{ z1: seconds, z2: seconds, ... }` |
| `trainingEffect` / `aerobicTrainingEffect` | Activity summary | No training effect / load concept | Add `training_load JSONB` to `workout_instances` |
| `stressLevelValue` (0-100) | Daily summary | No stress field | New table `daily_metrics` (see below) |
| `totalSleepTimeInSeconds` / `deepSleepDurationInSeconds` | Sleep summary | No sleep data model | New table `sleep_records` |
| `hrvWeeklyAverage` / `lastNight5MinHigh` | HRV summary | No HRV concept | New table `hrv_records` |
| Body weight, body fat %, BMI | Body composition | No body metrics model | New table `body_metrics` |
| Training readiness score | Daily summary (Garmin premium) | No readiness concept | Add to `daily_metrics` |
| GPS polyline for `WorkoutInstance` | FIT file / GPS track | GPS is stored on `exercise_logs.gps_data` but not linked to `workout_instances` | Add `gps_summary_id` FK or duplicate key array on `workout_instances` |

#### Proposed new DB tables (migrations)

```sql
-- Daily metrics (steps, stress, active minutes from Garmin daily summaries)
CREATE TABLE daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'garmin',
  steps INTEGER,
  active_calories INTEGER,
  total_calories INTEGER,
  active_time_seconds INTEGER,
  moderate_intensity_minutes INTEGER,
  vigorous_intensity_minutes INTEGER,
  resting_heart_rate INTEGER,
  stress_avg INTEGER,
  stress_max INTEGER,
  body_battery_high INTEGER,
  body_battery_low INTEGER,
  training_readiness_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, source)
);

-- Sleep records
CREATE TABLE sleep_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'garmin',
  sleep_start TIMESTAMPTZ,
  sleep_end TIMESTAMPTZ,
  total_sleep_seconds INTEGER,
  deep_sleep_seconds INTEGER,
  light_sleep_seconds INTEGER,
  rem_sleep_seconds INTEGER,
  awake_seconds INTEGER,
  sleep_score INTEGER,
  external_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, source)
);

-- HRV records
CREATE TABLE hrv_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'garmin',
  hrv_weekly_avg FLOAT,
  hrv_last_night_5min_high FLOAT,
  hrv_last_night_avg FLOAT,
  hrv_status VARCHAR(50), -- 'balanced', 'unbalanced', 'low'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, source)
);

-- Body metrics
CREATE TABLE body_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'manual',
  weight_kg FLOAT,
  body_fat_percentage FLOAT,
  muscle_mass_kg FLOAT,
  bmi FLOAT,
  bone_mass_kg FLOAT,
  hydration_percentage FLOAT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garmin OAuth connections
CREATE TABLE garmin_connections (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  garmin_user_id VARCHAR(255) NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  access_token_secret TEXT NOT NULL,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_webhook_at TIMESTAMPTZ,
  backfill_completed BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE
);
```

#### Angular model extensions needed

In `src/app/models/workout.models.ts`, the `WorkoutInstance` interface needs extension fields for Garmin-sourced activities. These are all optional to remain backwards-compatible:

```typescript
// Additions to WorkoutInstance interface
heartRateAvg?: number;       // bpm
heartRateMax?: number;       // bpm
hrZones?: {                  // seconds in each HR zone
  z1: number; z2: number; z3: number; z4: number; z5: number;
};
distance?: number;           // metres
calories?: number;           // kcal
cadenceAvg?: number;
elevationGain?: number;      // metres
powerAvg?: number;           // watts
powerMax?: number;           // watts
vo2Max?: number;
trainingLoad?: number;
externalSource?: 'garmin' | 'strava' | 'apple_health' | 'manual';
externalId?: string;
```

A new `BodyMetrics` interface and `DailyMetrics` interface are needed in a new file `src/app/models/health.models.ts`.

---

### A4. Implementation Tasks

Tasks are ordered by dependency. Each task references the file(s) to create or modify.

#### Phase 1: OAuth & Account Linking (prerequisite for webhook flow)

**Task 1.1 — Garmin Developer Portal registration**
- Apply at `developer.garmin.com/health-api/overview/`
- Obtain `GARMIN_CONSUMER_KEY` and `GARMIN_CONSUMER_SECRET`
- Register webhook callback URL: `https://<your-domain>/api/garmin/webhook`
- Files: none (external process) — add secrets to `server/src/config/env.ts`

**Task 1.2 — DB migration: `garmin_connections` table**
- File: `server/src/db/migrations/` (new migration file)
- File: `server/src/db/schema.ts` (add `garminConnections` table definition)

**Task 1.3 — Garmin Health API service (OAuth 1.0a)**
- File: `server/src/services/garmin-health-api.service.ts` (new)
- Implement: `getRequestToken()`, `getAccessToken(verifier)`, `signedRequest(method, url, params)`, `revokeToken(token)`
- Dependency: `oauth` npm package (`npm install oauth @types/oauth`)

**Task 1.4 — Garmin OAuth routes**
- File: `server/src/routes/garmin.routes.ts` (new)
- Endpoints: `GET /api/garmin/auth`, `GET /api/garmin/callback`, `DELETE /api/garmin/disconnect`
- File: `server/src/index.ts` (register new router)

**Task 1.5 — PWA: Integrations settings page**
- File: `src/app/components/settings/integrations/integrations.component.ts` (new)
- File: `src/app/app.routes.ts` (add `/settings/integrations` route)
- Shows connected status, "Connect Garmin" / "Disconnect" button
- Initiates OAuth by navigating to `GET /api/garmin/auth` server redirect

#### Phase 2: Webhook Receiver & Activity Import

**Task 2.1 — Webhook endpoint**
- File: `server/src/routes/garmin.routes.ts` (extend)
- Endpoint: `POST /api/garmin/webhook`
- Validate Garmin HMAC signature header (`X-Garmin-Signature`)
- Route payload type (`activities`, `dailies`, `epochs`, `sleeps`, `bodyComps`, `hrv`) to appropriate handler
- Return HTTP 200 immediately (Garmin retries on non-200)

**Task 2.2 — Activity webhook handler**
- File: `server/src/services/garmin-health-api.service.ts` (extend)
- Method: `handleActivityWebhook(payload)` — for each activity in push payload:
  1. Check `workout_instances` for existing `external_id` to prevent duplicates
  2. Fetch full activity detail from Health API (to get FIT download URL)
  3. Download FIT file, pass to existing `GarminFitParser.parse()` and `FitTransformer.transform()`
  4. Upsert to `workout_instances` and `exercise_logs` via `SyncService`
- Dependency on Tasks 1.2, 1.3, and the existing `GarminFitParser` / `FitTransformer`

**Task 2.3 — Daily summary webhook handler**
- File: `server/src/services/garmin-health-api.service.ts` (extend)
- Method: `handleDailySummaryWebhook(payload)` — upsert to new `daily_metrics` table
- Requires Task DB migration for `daily_metrics`

**Task 2.4 — Body composition webhook handler**
- File: `server/src/services/garmin-health-api.service.ts` (extend)
- Method: `handleBodyCompWebhook(payload)` — upsert to new `body_metrics` table

**Task 2.5 — Sleep / HRV webhook handlers**
- File: `server/src/services/garmin-health-api.service.ts` (extend)
- Methods: `handleSleepWebhook()`, `handleHrvWebhook()`

#### Phase 3: DB Schema Extensions

**Task 3.1 — Add VO2 max, HR zones, power, training load to `workout_instances`**
- File: `server/src/db/schema.ts`
- File: `server/src/db/migrations/` (new migration)

**Task 3.2 — Create `daily_metrics`, `sleep_records`, `hrv_records`, `body_metrics` tables**
- File: `server/src/db/schema.ts`
- File: `server/src/db/migrations/` (new migration)

#### Phase 4: PWA Model & UI Updates

**Task 4.1 — Extend WorkoutInstance model**
- File: `src/app/models/workout.models.ts` — add optional fields listed in A3

**Task 4.2 — New health models file**
- File: `src/app/models/health.models.ts` (new) — `BodyMetrics`, `DailyMetrics`, `SleepRecord`, `HrvRecord`

**Task 4.3 — Extend DatabaseService / Dexie schema**
- File: `src/app/services/database.service.ts`
- Add `bodyMetrics`, `dailyMetrics`, `sleepRecords`, `hrvRecords` Dexie tables (new DB version)

**Task 4.4 — Extend SyncManagerService pull logic**
- File: `src/app/services/sync-manager.service.ts`
- Extend `applyCloudData()` and `SyncPayload` / `SyncResponse` interfaces to handle the four new entity types

**Task 4.5 — Extend server sync endpoint**
- File: `server/src/routes/sync.routes.ts`
- `GET /api/sync/:userId` should return new entity types in `data` response

#### Phase 5: Backfill on First Connect

**Task 5.1 — Backfill job on initial OAuth connection**
- File: `server/src/services/garmin-health-api.service.ts`
- On successful `getAccessToken()`, trigger background backfill:
  - Fetch last 90 days of activities from Health API
  - Fetch last 90 days of dailies, body comp, sleep, HRV
  - Mark `garmin_connections.backfill_completed = true`

#### Estimated effort summary

| Phase | Tasks | Estimated Dev Days |
|---|---|---|
| Phase 1: OAuth | 1.1–1.5 | 3 days |
| Phase 2: Webhooks | 2.1–2.5 | 4 days |
| Phase 3: DB migrations | 3.1–3.2 | 1 day |
| Phase 4: PWA model & sync | 4.1–4.5 | 3 days |
| Phase 5: Backfill | 5.1 | 1 day |
| **Total** | | **~12 dev days** |

---

## Part B: Platform Gap Analysis

### Methodology

The analysis compares FitnessTracker's current confirmed capabilities (derived from codebase inspection) against the feature sets of six reference apps: **Strong**, **Garmin Connect**, **Strava**, **Whoop**, **MyFitnessPal**, and **Apple Fitness+**.

**Current confirmed capabilities of FitnessTracker:**
- Workout template creation and management (push/pull/HIIT/yoga/sports/mixed)
- Active workout logging with sets, reps, weight, duration per exercise
- Superset and dropset support in exercise model
- Workout history with completion status
- Basic stats: total workouts, total duration, average duration, current/longest streak, weekly progress vs goal
- Offline-first via Dexie.js IndexedDB with sync queue
- Cloud sync via Supabase (push + pull)
- Manual Garmin FIT file import (server endpoint live)
- Sync diagnostics and anomaly detection

**Notably absent from routes:** analytics/progress charts, body metrics, nutrition, social features, rest timer, notifications, discovery/programs.

---

### B1. Gap Analysis by Category

#### 1. Analytics & Progress Tracking

| Feature | Strong | Garmin Connect | Strava | FitnessTracker | Priority |
|---|---|---|---|---|---|
| Per-exercise volume chart over time | Yes | Partial | No | No | **P0** |
| 1RM progression chart | Yes | No | No | No | **P0** |
| Automatic PR detection & badge | Yes | No | No | Partial (field in model, no UI) | **P0** |
| Weekly/monthly training volume (sets × reps × kg) | Yes | Yes | Yes | No | **P0** |
| Muscle group frequency heatmap | Yes | No | No | No | **P1** |
| Performance trends (pace, power over time) | No | Yes | Yes | No | **P1** |
| Estimated 1RM calculator (Epley/Brzycki) | Yes | No | No | No | **P1** |
| Workout density / intensity score | No | Yes | No | No | **P2** |
| Year-in-review / milestone summaries | No | Yes | Yes | No | **P2** |

**Assessment:** The `ExerciseLog.personalRecord` field exists in the model but there is no UI that surfaces it, no chart routes, and `getWorkoutStats()` in `DatabaseService` only computes 6 aggregate numbers. This is the highest-impact gap relative to the nearest competitor (Strong). Users logging strength workouts have no feedback on whether they are progressing.

---

#### 2. Body Metrics

| Feature | Garmin Connect | MyFitnessPal | Whoop | FitnessTracker | Priority |
|---|---|---|---|---|---|
| Manual weight entry + trend line | Yes | Yes | No | No | **P0** |
| Body fat % tracking | Yes | Yes | No | No | **P1** |
| Measurements (waist, hip, chest) | No | Yes | No | No | **P1** |
| BMI calculation | Yes | Yes | No | No | **P2** |
| Garmin body comp import (Garmin Index scale) | Yes | No | No | No | **P1** |

**Assessment:** There is no `body_metrics` table in the current schema. This is a table-stakes gap — users who care about body composition have no reason to open FitnessTracker outside of logging workouts, limiting daily engagement.

---

#### 3. Nutrition

| Feature | MyFitnessPal | Garmin Connect | Apple Fitness+ | FitnessTracker | Priority |
|---|---|---|---|---|---|
| Calorie goal setting | Yes | Partial | Yes | No | **P1** |
| Macro tracking (protein, carbs, fat) | Yes | No | No | No | **P1** |
| Food diary / barcode scanner | Yes | No | No | No | **P2** |
| Calorie burn vs calorie intake dashboard | Yes | Yes | No | No | **P2** |
| Integration with MyFitnessPal API | N/A | No | No | No | **P2** |

**Assessment:** Full nutrition tracking is a large feature surface owned by dedicated apps (MFP, Cronometer). The P1 value is in calorie goal + calorie expenditure display (using Garmin's `activeKilocalories` from daily summaries), not in building a full food diary. A "calories burned today" card on the dashboard is a quick P1 win once Garmin daily sync is live.

---

#### 4. Recovery

| Feature | Whoop | Garmin Connect | Strava | FitnessTracker | Priority |
|---|---|---|---|---|---|
| HRV tracking | Yes | Yes (with HR strap) | No | No | **P1** |
| Sleep quality score | Yes | Yes | No | No | **P1** |
| Recovery score / readiness | Yes | Yes | No | No | **P1** |
| Rest day recommendations | Yes | Partial | No | No | **P2** |
| Strain/load score | Yes | Yes | Relative Effort | No | **P2** |
| Consecutive days warning | No | Yes | No | No | **P2** |

**Assessment:** Once Garmin HRV/sleep webhook handlers are built (Phase 2 of the integration plan), the data will be in the database. The recovery gap is primarily a UI/display gap, not a data gap. A "Recovery" dashboard card showing last night's sleep and HRV status is a P1 feature achievable quickly after Phase 2.

---

#### 5. Social

| Feature | Strava | Strong (limited) | Garmin Connect | FitnessTracker | Priority |
|---|---|---|---|---|---|
| Share workout as image/card | Strava | Basic | No | No | **P1** |
| Follow friends / activity feed | Yes | No | Yes | No | **P2** |
| Segments / leaderboards | Yes (running) | No | Yes | No | **P2** |
| Challenges | Yes | No | Yes | No | **P2** |
| Comment / kudos on activities | Yes | No | No | No | **P2** |

**Assessment:** Social is a significant Strava differentiator but requires a substantial backend investment (follow graph, feed, notifications). The quick P1 win is shareable workout cards — a generated image of a completed workout (exercise list, PR achieved, duration) that users can post to Instagram/X. No social graph required.

---

#### 6. Wearable Integrations

| Integration | FitnessTracker Current | Priority |
|---|---|---|
| Garmin FIT file upload | Live | — |
| Garmin Health API (automated webhook) | Planned (this doc) | **P0** |
| Apple Health (HealthKit) | Not started | **P1** |
| Google Fit / Health Connect (Android) | Not started | **P1** |
| Fitbit Web API | Not started | **P2** |
| Polar Flow API | Not started | **P2** |
| Wahoo Fitness API | Not started | **P2** |

**Assessment:** The Garmin FIT manual import path is live. Apple HealthKit and Google Health Connect together cover the majority of non-Garmin wearable users. Both are web/PWA-hostile — HealthKit requires a native iOS app; Health Connect requires a native Android app or Android WebView. For a PWA, the practical path is: encourage FIT file export from any device and allow import, plus Garmin Health API for Garmin users. A long-term React Native / Capacitor wrapper would unlock HealthKit and Health Connect.

---

#### 7. Workout Discovery & Programs

| Feature | Strong | Apple Fitness+ | FitnessTracker | Priority |
|---|---|---|---|---|
| Pre-built workout templates library | Yes (community) | Yes (video) | 2 sample templates only | **P0** |
| Structured training programs (e.g. 5/3/1, PPL) | Partial | No | No | **P1** |
| Progressive overload automation | No | No | No | **P1** |
| AI workout suggestions based on history | No | No | No | **P2** |
| Exercise video tutorials | No | Yes | No | **P2** |

**Assessment:** The app ships with 2 hardcoded sample templates (Push Day, HIIT Cardio). Users must build all their own routines from scratch. A curated library of 20-30 community templates (squat programs, PPL splits, beginner bodyweight) would dramatically reduce time-to-value for new users and is primarily a content/data task, not an engineering task.

---

#### 8. Notifications

| Feature | Strong | Strava | FitnessTracker | Priority |
|---|---|---|---|---|
| In-session rest timer with audio/vibration alert | Yes | No | No | **P0** |
| Push notification: "Time to work out" (scheduled reminder) | Yes | No | No | **P1** |
| PR notification / achievement badge | Yes | Yes | No | **P1** |
| Workout streak reminder | No | No | No | **P2** |

**Assessment:** The `restTime` field exists on both `Exercise` and `WorkoutSet` models, but there is no rest timer in the `ActiveWorkoutComponent` route. This is a table-stakes gap for any strength training app. The Web Notifications API and Web Audio API are both available in PWA context and can be implemented without a native wrapper. A service worker with a countdown timer and audio chime is the correct implementation path.

---

#### 9. Offline-First Robustness

| Aspect | Assessment | Priority |
|---|---|---|
| Local-first storage (Dexie.js IndexedDB) | Implemented and functional | — |
| Sync queue with retry and deduplication | Implemented (`SyncQueueService`, `SyncManagerService`) | — |
| Conflict resolution (last-write-wins) | Implemented (server data wins on pull) | — |
| Safeguards (queue overflow, consecutive failures) | Implemented (`checkSafeguards()`) | — |
| Soft deletes | Implemented (`isActive: false` on templates) | — |
| Delete operations in sync queue | **Gap:** `syncBatch()` skips delete operations (`if (item.operation === 'delete') continue`) | **P1** |
| Background sync (Service Worker Sync API) | **Gap:** no Service Worker background sync registration | **P1** |
| PWA install prompt / manifest | Unknown — not visible in inspected files | **P1** |
| Offline indicator in UI | Unknown — `ConnectivityService` exists but no UI component confirmed | **P1** |
| IndexedDB version migration strategy | **Gap:** Dexie `version(1)` only — no migration path for schema changes | **P1** |

**Assessment:** The offline-first foundations are genuinely solid. The most actionable gaps are: (a) delete operations are silently skipped during sync — deleted templates will reappear after a pull, which is a data consistency bug; (b) there is no Dexie migration strategy beyond version 1, which will be required once the new health model tables are added; (c) no Service Worker background sync means data only syncs when the app is in the foreground.

---

#### 10. Export & Sharing

| Feature | Strava | Garmin Connect | Strong | FitnessTracker | Priority |
|---|---|---|---|---|---|
| GPX export | Yes | Yes | No | No | **P1** |
| TCX export | Yes | Yes | No | No | **P2** |
| CSV export of workout history | No | Yes | Yes | No | **P1** |
| FIT file export | No | Yes | No | No | **P2** |
| PDF training log | No | No | Partial | No | **P2** |
| Share to Strava | No | No | No | No | **P2** |

**Assessment:** The server already parses FIT files but cannot generate them. GPX and CSV exports are achievable entirely in the Angular PWA using the existing data in Dexie/Supabase. A CSV export of `WorkoutInstance` + `ExerciseLog` data is a single-file, ~100-line feature. GPX export is meaningful only for GPS-tracked activities (Garmin imports), so it unlocks once the webhook integration is live.

---

### B2. Prioritised Feature Backlog

The following table consolidates all identified gaps into a single ordered backlog.

| # | Feature | Category | Priority | Competitor Reference | Effort Est. | Dependencies |
|---|---|---|---|---|---|---|
| 1 | Rest timer in active workout (audio + visual countdown) | Notifications | **P0** | Strong | 1 day | None |
| 2 | Per-exercise volume & 1RM progression charts | Analytics | **P0** | Strong | 3 days | None |
| 3 | Automatic PR detection with UI badge | Analytics | **P0** | Strong | 1 day | None |
| 4 | Pre-built workout template library (20-30 templates) | Discovery | **P0** | Strong | 2 days (content) | None |
| 5 | Garmin Health API automated webhook sync | Integrations | **P0** | Garmin Connect | 12 days | Developer portal access |
| 6 | Fix: delete operations not sent to server during sync | Offline | **P0** | — | 0.5 days | None |
| 7 | Manual body weight entry + trend chart | Body Metrics | **P0** | MFP / Garmin | 2 days | `body_metrics` table |
| 8 | Weekly training volume chart (sets, tonnage) | Analytics | **P0** | Strong / Garmin | 2 days | None |
| 9 | Dexie multi-version migration strategy | Offline | **P1** | — | 1 day | None |
| 10 | Service Worker background sync registration | Offline | **P1** | — | 1 day | None |
| 11 | Scheduled workout reminder (push notification) | Notifications | **P1** | Strong | 2 days | SW registration |
| 12 | PR achievement push notification | Notifications | **P1** | Strong / Strava | 0.5 days | PR detection (#3) |
| 13 | Body fat % and measurements tracking | Body Metrics | **P1** | MFP | 1 day | `body_metrics` table |
| 14 | Garmin body composition import (Index scale) | Body Metrics | **P1** | Garmin Connect | 1 day | Garmin webhook (#5) |
| 15 | Recovery dashboard (HRV + sleep card) | Recovery | **P1** | Whoop / Garmin | 2 days | Garmin HRV/sleep webhook (#5) |
| 16 | Calorie burn today card (Garmin daily summary) | Recovery | **P1** | Garmin Connect | 1 day | Garmin daily webhook (#5) |
| 17 | Apple Health / Google Health Connect integration | Integrations | **P1** | Apple Fitness+ | 15 days | Native wrapper (Capacitor) |
| 18 | CSV export of workout history | Export | **P1** | Strong / Garmin | 1 day | None |
| 19 | GPX export of GPS activities | Export | **P1** | Strava / Garmin | 1 day | Garmin integration (#5) |
| 20 | Muscle group frequency heatmap | Analytics | **P1** | Strong | 2 days | Exercise category tags |
| 21 | Structured training programs (PPL, 5/3/1) | Discovery | **P1** | Strong | 5 days | Template library (#4) |
| 22 | Progressive overload suggestion | Discovery | **P1** | — | 3 days | Volume charts (#2) |
| 23 | Shareable workout card (image export) | Social | **P1** | Strava / Strong | 2 days | None |
| 24 | Estimated 1RM calculator widget | Analytics | **P1** | Strong | 0.5 days | None |
| 25 | Offline connectivity indicator in UI | Offline | **P1** | — | 0.5 days | `ConnectivityService` exists |
| 26 | Rest day / overtraining warning | Recovery | **P2** | Whoop | 2 days | Load tracking (#5) |
| 27 | Streak reminder push notification | Notifications | **P2** | — | 0.5 days | SW registration |
| 28 | Year-in-review summary | Analytics | **P2** | Garmin / Strava | 2 days | Volume charts (#2) |
| 29 | Activity / workout sharing to Strava | Social | **P2** | Strava | 4 days | Strava OAuth |
| 30 | Follow friends / activity feed | Social | **P2** | Strava | 10 days | User graph |
| 31 | TCX / FIT file export | Export | **P2** | Garmin / Strava | 2 days | Garmin integration |
| 32 | Exercise video tutorials | Discovery | **P2** | Apple Fitness+ | 5 days | Content/CDN |
| 33 | AI workout suggestion | Discovery | **P2** | — | 8 days | History data, LLM API |
| 34 | Fitbit API integration | Integrations | **P2** | — | 5 days | Fitbit dev account |

---

### B3. Quick Wins (Under 1 Day Each, High Impact)

These can be shipped in a single sprint to demonstrate momentum before larger features land:

1. **Fix silent delete-skip in syncBatch** — `src/app/services/sync-manager.service.ts` line ~494. Remove the `continue` guard and implement server-side soft delete handling. This is a correctness bug, not a feature.

2. **Rest timer** — Add a countdown timer component inside `ActiveWorkoutComponent`. Uses `setInterval`, `navigator.vibrate()`, and a simple beep via Web Audio API. The `restTime` data is already on the `WorkoutSet` model.

3. **PR detection** — In `DatabaseService.addExerciseLog()`, compare new log's max weight × reps against historical `personalRecord`. The `personalRecord` field is already in the model and schema.

4. **Estimated 1RM calculator** — A pure-function util using the Epley formula: `1RM = weight × (1 + reps / 30)`. Display on the exercise history screen.

5. **CSV export** — A client-side Angular service that fetches `getAllWorkoutInstances()` and `db.exerciseLogs.toArray()` and triggers a `Blob` download. Zero server involvement.

6. **Offline indicator** — `ConnectivityService.isOnline` signal already exists. Wire it to a status bar component in `app.component.ts`.

---

### B4. Strategic Prioritisation Narrative

**Immediate focus (next 4 weeks):** Close the P0 gaps that make the app usable as a daily strength training logger independent of Garmin integration. Rest timer, PR tracking, volume charts, and the template library directly address why a user would choose FitnessTracker over Strong. These features require no new backend infrastructure.

**Medium-term focus (4-12 weeks):** Complete the Garmin Health API integration (Part A of this document). This unlocks the recovery and body metrics features, enables GPX export, and differentiates FitnessTracker from Strong by bringing in cardio + wearable data.

**Longer-term focus (3-6 months):** Social sharing (shareable cards, eventually Strava integration), structured programs with progressive overload, and a Capacitor wrapper for Apple Health / Google Health Connect access. These require larger investments but open the app to a broader audience.

**What to defer:** A full social graph (follow, feed, challenges) and full nutrition tracking (food diary, barcode scanner). Both are large enough to be products in themselves and would dilute focus. The right move is to integrate with MyFitnessPal via their API rather than rebuild nutrition from scratch.
