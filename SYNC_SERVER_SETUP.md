# Fitness Tracker Supabase Sync Server - Setup Guide

## Overview

A complete Node.js/Express API server has been created in the `server/` directory for syncing your Fitness Tracker data to Supabase. This guide will walk you through setup and usage.

## What Was Created

### Server Directory Structure
```
server/
├── src/
│   ├── config/
│   │   ├── env.ts              # Environment configuration
│   │   └── supabase.ts         # Supabase client setup
│   ├── routes/
│   │   └── sync.routes.ts      # API endpoints
│   ├── services/
│   │   └── sync.service.ts     # Sync business logic
│   ├── types/
│   │   └── index.ts            # TypeScript types
│   └── index.ts                # Express server
├── .env.example                # Environment template
├── .gitignore                  # Git ignore rules
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
└── README.md                   # Full documentation
```

## Quick Start

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Set Up Supabase

#### Create a Supabase Project
1. Go to https://supabase.com
2. Create a new project
3. Copy your project URL and API keys from Settings > API

#### Create Database Tables
Run this SQL in your Supabase SQL editor:

```sql
-- Workout Templates
CREATE TABLE IF NOT EXISTS workout_templates (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name VARCHAR NOT NULL,
  description TEXT,
  exercises JSONB NOT NULL,
  estimated_duration INTEGER,
  difficulty VARCHAR,
  category VARCHAR,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_workout_templates_user_id ON workout_templates(user_id);

-- Workout Instances
CREATE TABLE IF NOT EXISTS workout_instances (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  template_id UUID,
  template_name VARCHAR,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  total_duration INTEGER,
  sets JSONB,
  status VARCHAR,
  notes TEXT,
  location VARCHAR,
  completed_exercises INTEGER,
  total_exercises INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_workout_instances_user_id ON workout_instances(user_id);

-- Exercise Logs
CREATE TABLE IF NOT EXISTS exercise_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  exercise_id UUID,
  exercise_name VARCHAR,
  date TIMESTAMPTZ,
  sets JSONB,
  personal_record JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_exercise_logs_user_id ON exercise_logs(user_id);

-- Sync Status
CREATE TABLE IF NOT EXISTS sync_status (
  user_id UUID PRIMARY KEY,
  last_sync_time TIMESTAMPTZ,
  synced_templates INTEGER DEFAULT 0,
  synced_instances INTEGER DEFAULT 0,
  synced_logs INTEGER DEFAULT 0,
  status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3. Configure Environment Variables
```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your Supabase credentials
nano .env
```

Fill in your `.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:4200
```

### 4. Run the Server

Development mode (with hot reload):
```bash
npm run dev
```

Or with watch mode:
```bash
npm run dev:watch
```

The server will start at `http://localhost:3000`

## API Endpoints

### Health Check
```
GET http://localhost:3000/health
```

### Sync All Data
```
POST http://localhost:3000/api/sync
Content-Type: application/json

{
  "userId": "user-uuid",
  "workoutTemplates": [...],
  "workoutInstances": [...],
  "exerciseLogs": [...]
}
```

### Get User Data
```
GET http://localhost:3000/api/sync/user-uuid
```

### Sync Only Templates
```
POST http://localhost:3000/api/sync/user-uuid/templates
Content-Type: application/json

{
  "templates": [...]
}
```

### Sync Only Instances
```
POST http://localhost:3000/api/sync/user-uuid/instances
Content-Type: application/json

{
  "instances": [...]
}
```

### Sync Only Logs
```
POST http://localhost:3000/api/sync/user-uuid/logs
Content-Type: application/json

{
  "logs": [...]
}
```

### Get Sync Status
```
GET http://localhost:3000/api/sync/user-uuid/status
```

### Delete User Data
```
DELETE http://localhost:3000/api/sync/user-uuid
```

## Integration with Your Angular App

### 1. Install HttpClientModule (if not already)
```typescript
// In app.config.ts or main.ts
import { HttpClientModule } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    HttpClientModule,
    // ... other providers
  ]
};
```

### 2. Create a Supabase Sync Service
```typescript
// src/app/services/supabase-sync.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SupabaseSyncService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  syncAllData(userId: string, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/sync`, {
      userId,
      ...data
    });
  }

  getUserData(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/sync/${userId}`);
  }

  syncTemplates(userId: string, templates: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/sync/${userId}/templates`, {
      templates
    });
  }

  syncInstances(userId: string, instances: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/sync/${userId}/instances`, {
      instances
    });
  }

  syncLogs(userId: string, logs: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/sync/${userId}/logs`, {
      logs
    });
  }

  getSyncStatus(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/sync/${userId}/status`);
  }

  deleteUserData(userId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/sync/${userId}`);
  }
}
```

### 3. Use in Your Components
```typescript
export class SomeComponent implements OnInit {
  constructor(private syncService: SupabaseSyncService) { }

  syncToSupabase() {
    const userId = 'your-user-id';
    const allData = {
      workoutTemplates: [],
      workoutInstances: [],
      exerciseLogs: []
    };

    this.syncService.syncAllData(userId, allData).subscribe({
      next: (response) => {
        console.log('Sync successful:', response);
      },
      error: (error) => {
        console.error('Sync failed:', error);
      }
    });
  }
}
```

## Key Features

✅ **Full Data Sync** - Sync templates, instances, and logs together or separately
✅ **Upsert Operations** - Automatically updates existing records or creates new ones
✅ **User Isolation** - All data is tied to userId for multi-user support
✅ **Sync Status Tracking** - Track when and what was synced
✅ **Error Handling** - Comprehensive error responses
✅ **CORS Support** - Pre-configured for your Angular app
✅ **TypeScript** - Full type safety
✅ **Scalable** - Ready for production deployment

## Data Models

### WorkoutTemplate
```typescript
{
  id: string;
  userId: string;
  name: string;
  description?: string;
  exercises: Exercise[];
  estimatedDuration: number;
  difficulty: DifficultyLevel;
  category: WorkoutCategory;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}
```

### WorkoutInstance
```typescript
{
  id: string;
  userId: string;
  templateId: string;
  templateName: string;
  startTime: Date;
  endTime?: Date;
  totalDuration?: number;
  sets: WorkoutSet[];
  status: WorkoutStatus;
  notes?: string;
  location?: string;
  completedExercises: number;
  totalExercises: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### ExerciseLog
```typescript
{
  id: string;
  userId: string;
  exerciseId: string;
  exerciseName: string;
  date: Date;
  sets: WorkoutSet[];
  personalRecord?: { weight?: number; reps?: number; duration?: number };
  createdAt: Date;
  updatedAt: Date;
}
```

## Troubleshooting

### Port Already in Use
```bash
# Change port in .env
PORT=3001
```

### Supabase Connection Error
- Check your SUPABASE_URL and SUPABASE_ANON_KEY
- Make sure Supabase tables are created
- Verify network connectivity

### CORS Errors
- Update CORS_ORIGIN in .env to match your Angular app's origin
- For local development, typically `http://localhost:4200`

### "Tables don't exist" Error
- Run the SQL table creation scripts in your Supabase SQL editor
- Verify the tables exist in Supabase dashboard

## Next Steps

1. ✅ Set up the server and install dependencies
2. ✅ Create Supabase project and configure
3. ✅ Create database tables with provided SQL
4. ✅ Configure environment variables
5. ✅ Start the server
6. ✅ Create a sync service in your Angular app
7. ✅ Integrate sync calls in your app logic

For detailed documentation, see [server/README.md](server/README.md)
