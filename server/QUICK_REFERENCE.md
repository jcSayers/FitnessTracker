# Sync Server Quick Reference

## Installation & Setup (5 minutes)

```bash
# 1. Navigate to server directory
cd server

# 2. Install dependencies
npm install

# 3. Create .env from template
cp .env.example .env

# 4. Edit .env with your Supabase credentials
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_ANON_KEY=your-key-here
```

## Running the Server

```bash
# Development mode (recommended)
npm run dev

# Development with auto-reload
npm run dev:watch

# Production build
npm run build
npm run start
```

Server runs at: `http://localhost:3000`

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Health check |
| POST | `/api/sync` | Sync all data |
| GET | `/api/sync/:userId` | Get user data |
| POST | `/api/sync/:userId/templates` | Sync templates |
| POST | `/api/sync/:userId/instances` | Sync instances |
| POST | `/api/sync/:userId/logs` | Sync logs |
| GET | `/api/sync/:userId/status` | Get sync status |
| DELETE | `/api/sync/:userId` | Delete user data |

## Quick Curl Examples

```bash
# Health check
curl http://localhost:3000/health

# Get user data
curl http://localhost:3000/api/sync/user-123

# Sync templates
curl -X POST http://localhost:3000/api/sync/user-123/templates \
  -H "Content-Type: application/json" \
  -d '{"templates": []}'

# Delete user data
curl -X DELETE http://localhost:3000/api/sync/user-123
```

## Environment Variables

```env
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=optional-service-key
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:4200
```

## Required Supabase Tables (SQL)

```sql
-- Run all of this in Supabase SQL editor

CREATE TABLE workout_templates (
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

CREATE TABLE workout_instances (
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

CREATE TABLE exercise_logs (
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

CREATE TABLE sync_status (
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

## Angular Integration

### 1. Import HttpClientModule

```typescript
// app.config.ts
import { HttpClientModule } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    HttpClientModule,
    // ... other providers
  ]
};
```

### 2. Create Service

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class SupabaseSyncService {
  private url = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  syncAll(userId: string, data: any) {
    return this.http.post(`${this.url}/sync`, { userId, ...data });
  }

  getUserData(userId: string) {
    return this.http.get(`${this.url}/sync/${userId}`);
  }
}
```

### 3. Use in Component

```typescript
export class YourComponent {
  constructor(private sync: SupabaseSyncService) { }

  onSync() {
    this.sync.syncAll('user-123', {
      workoutTemplates: [],
      workoutInstances: [],
      exerciseLogs: []
    }).subscribe(res => console.log(res));
  }
}
```

## Data Models Quick Reference

```typescript
// Workout Template
{
  id: string;
  name: string;
  description?: string;
  exercises: Exercise[];
  estimatedDuration: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

// Workout Instance
{
  id: string;
  templateId: string;
  templateName: string;
  startTime: Date;
  endTime?: Date;
  totalDuration?: number;
  sets: WorkoutSet[];
  status: 'in_progress' | 'completed' | 'paused' | 'cancelled';
  notes?: string;
  location?: string;
  completedExercises: number;
  totalExercises: number;
}

// Exercise Log
{
  id: string;
  exerciseId: string;
  exerciseName: string;
  date: Date;
  sets: WorkoutSet[];
  personalRecord?: { weight?: number; reps?: number };
}
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "CORS error" | Update `CORS_ORIGIN` in `.env` to match your app URL |
| "Connection refused" | Make sure server is running with `npm run dev` |
| "Tables don't exist" | Run the SQL table creation scripts in Supabase |
| "Port 3000 in use" | Change `PORT` in `.env` or kill existing process |
| "Missing credentials" | Check `.env` file has `SUPABASE_URL` and `SUPABASE_ANON_KEY` |

## File Structure

```
server/
├── src/
│   ├── config/       # Configuration files
│   ├── routes/       # API endpoints
│   ├── services/     # Business logic
│   ├── types/        # TypeScript interfaces
│   └── index.ts      # Server entry point
├── dist/             # Compiled output
├── .env              # Environment variables (create from .env.example)
├── package.json      # Dependencies
└── tsconfig.json     # TypeScript config
```

## Development Tips

1. **Use Postman** to test endpoints before integrating with Angular
2. **Check Supabase Dashboard** to verify data is being saved
3. **Watch Server Logs** for detailed error messages
4. **Test with Sample Data** before syncing real data
5. **Use userId as UUID** for consistency: `123e4567-e89b-12d3-a456-426614174000`

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Configure `.env` with Supabase credentials
3. ✅ Run SQL table creation in Supabase
4. ✅ Start server: `npm run dev`
5. ✅ Test endpoints with curl or Postman
6. ✅ Integrate with Angular app using the service above

## Resources

- Full documentation: [README.md](README.md)
- Testing guide: [TESTING.md](TESTING.md)
- Setup guide: [../SYNC_SERVER_SETUP.md](../SYNC_SERVER_SETUP.md)
- Supabase docs: https://supabase.com/docs
- Express docs: https://expressjs.com/

## Support

Check the README.md for detailed information on:
- All API endpoints
- Data model schemas
- Deployment instructions
- Troubleshooting guide
