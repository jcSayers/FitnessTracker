# Fitness Tracker Sync Server

A Node.js/Express API server for syncing Fitness Tracker data to Supabase. This server provides endpoints for syncing workout templates, workout instances, and exercise logs.

## Features

- ✅ Sync workout templates to Supabase
- ✅ Sync workout instances (completed workouts) to Supabase
- ✅ Sync exercise logs to Supabase
- ✅ Retrieve synced data from Supabase
- ✅ Track sync status and timestamps
- ✅ Delete user data
- ✅ CORS support for cross-origin requests
- ✅ TypeScript support
- ✅ Environment-based configuration

## Prerequisites

- Node.js 16+
- npm or yarn
- Supabase project with the following tables:
  - `workout_templates`
  - `workout_instances`
  - `exercise_logs`
  - `sync_status`

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Fill in your Supabase credentials in `.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3000
CORS_ORIGIN=http://localhost:4200
```

## Setting Up Supabase Tables

Run these SQL queries in your Supabase SQL editor to create the required tables:

```sql
-- Workout Templates Table
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

-- Workout Instances Table
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
CREATE INDEX idx_workout_instances_status ON workout_instances(status);

-- Exercise Logs Table
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
CREATE INDEX idx_exercise_logs_date ON exercise_logs(date);

-- Sync Status Table
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

## Running the Server

### Development Mode
```bash
npm run dev
```

### Watch Mode (with auto-reload)
```bash
npm run dev:watch
```

### Production Mode
```bash
npm run build
npm run start
```

## API Endpoints

### Health Check
```
GET /health
```

### Full Sync
```
POST /api/sync
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
GET /api/sync/:userId
```

### Sync Templates Only
```
POST /api/sync/:userId/templates
Content-Type: application/json

{
  "templates": [...]
}
```

### Sync Instances Only
```
POST /api/sync/:userId/instances
Content-Type: application/json

{
  "instances": [...]
}
```

### Sync Exercise Logs Only
```
POST /api/sync/:userId/logs
Content-Type: application/json

{
  "logs": [...]
}
```

### Get Sync Status
```
GET /api/sync/:userId/status
```

### Delete User Data
```
DELETE /api/sync/:userId
```

## Example Usage

### Using curl:

```bash
# Health check
curl http://localhost:3000/health

# Get user data
curl http://localhost:3000/api/sync/user-123

# Sync data
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "workoutTemplates": [
      {
        "id": "template-1",
        "name": "Push Day",
        "description": "Chest and triceps",
        "exercises": [],
        "estimatedDuration": 60,
        "difficulty": "intermediate",
        "category": "strength",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z",
        "isActive": true
      }
    ],
    "workoutInstances": [],
    "exerciseLogs": []
  }'
```

### Using TypeScript/JavaScript:

```typescript
const apiUrl = 'http://localhost:3000/api';

// Sync data
async function syncData(userId: string, data: any) {
  const response = await fetch(`${apiUrl}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      ...data
    })
  });
  return response.json();
}

// Get user data
async function getUserData(userId: string) {
  const response = await fetch(`${apiUrl}/sync/${userId}`);
  return response.json();
}

// Get sync status
async function getSyncStatus(userId: string) {
  const response = await fetch(`${apiUrl}/sync/${userId}/status`);
  return response.json();
}
```

## Response Format

All endpoints return a standardized response format:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "workoutTemplates": [...],
    "workoutInstances": [...],
    "exerciseLogs": [...]
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Operation failed",
  "error": "Detailed error message"
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Service role key for admin operations |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Environment (development/production) |
| `CORS_ORIGIN` | No | Allowed CORS origin (default: http://localhost:4200) |

## File Structure

```
server/
├── src/
│   ├── config/
│   │   ├── env.ts          # Environment configuration
│   │   └── supabase.ts     # Supabase client initialization
│   ├── routes/
│   │   └── sync.routes.ts  # API endpoints
│   ├── services/
│   │   └── sync.service.ts # Business logic for syncing
│   ├── types/
│   │   └── index.ts        # TypeScript interfaces and types
│   └── index.ts            # Express app setup
├── dist/                   # Compiled JavaScript
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Development

### Adding New Endpoints

1. Add route handler in `src/routes/sync.routes.ts`
2. Add service method in `src/services/sync.service.ts`
3. Add types in `src/types/index.ts`

### Building for Production

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

## Troubleshooting

### "Missing required environment variables"
Make sure you have created a `.env` file with all required variables from `.env.example`.

### "Failed to initialize Supabase"
Check that your `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct in your `.env` file.

### "CORS error"
Make sure the `CORS_ORIGIN` environment variable matches your client's origin, or set it to `*` for development (not recommended for production).

### "Connection refused"
Ensure the server is running and accessible at the configured host and port.

## Integration with Fitness Tracker App

To integrate this server with your Angular Fitness Tracker application:

1. Create a service in your Angular app to call these endpoints
2. Import the exported types from `src/types/index.ts` into your Angular models
3. Use the sync endpoints to push and pull data from Supabase

Example Angular service:

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class SupabaseSyncService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  syncData(userId: string, data: any) {
    return this.http.post(`${this.apiUrl}/sync`, {
      userId,
      ...data
    });
  }

  getUserData(userId: string) {
    return this.http.get(`${this.apiUrl}/sync/${userId}`);
  }

  getSyncStatus(userId: string) {
    return this.http.get(`${this.apiUrl}/sync/${userId}/status`);
  }

  deleteUserData(userId: string) {
    return this.http.delete(`${this.apiUrl}/sync/${userId}`);
  }
}
```

## License

MIT
