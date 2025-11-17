# Get Started with Sync Server - 10 Minute Setup

## What's Ready

A complete Node.js/Express API server for syncing your Fitness Tracker data to Supabase has been created. Everything is configured and ready to use.

## Quick Start (3 steps)

### Step 1: Install Dependencies (2 minutes)
```bash
cd server
npm install
```

### Step 2: Configure Supabase (5 minutes)

1. Go to https://supabase.com and create a free project
2. Get your **Project URL** and **Anon Key** from Settings > API
3. Create `.env` file:
   ```bash
   cp .env.example .env
   ```
4. Edit `.env` and add your credentials:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   PORT=3000
   CORS_ORIGIN=http://localhost:4200
   ```

5. In Supabase, run this SQL (copy entire block at once):
   ```sql
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

### Step 3: Start Server (30 seconds)
```bash
npm run dev
```

Server is running at `http://localhost:3000` ✓

## Test It Works (1 minute)

Open a new terminal and run:

```bash
# Health check
curl http://localhost:3000/health
```

You should see:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "development"
}
```

## Integrate with Your Angular App (5 minutes)

### 1. Add HTTP Client (if not already there)
```typescript
// src/main.ts
import { HttpClientModule } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    HttpClientModule,
    // ... other providers
  ]
};
```

### 2. Create Sync Service
Create file: `src/app/services/supabase-sync.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SupabaseSyncService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  syncAllData(userId: string, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/sync`, { userId, ...data });
  }

  getUserData(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/sync/${userId}`);
  }

  syncTemplates(userId: string, templates: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/sync/${userId}/templates`, { templates });
  }

  syncInstances(userId: string, instances: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/sync/${userId}/instances`, { instances });
  }

  syncLogs(userId: string, logs: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/sync/${userId}/logs`, { logs });
  }
}
```

### 3. Use in Your Component
```typescript
import { SupabaseSyncService } from './services/supabase-sync.service';

export class SomeComponent {
  constructor(private syncService: SupabaseSyncService) { }

  syncToCloud() {
    const userId = 'user-123'; // Get from your auth system

    this.syncService.syncAllData(userId, {
      workoutTemplates: [], // Your data here
      workoutInstances: [],
      exerciseLogs: []
    }).subscribe({
      next: (response) => {
        console.log('Sync successful!', response);
      },
      error: (error) => {
        console.error('Sync failed:', error);
      }
    });
  }
}
```

## API Endpoints Available

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Server health check |
| `/api/sync` | POST | Sync all data |
| `/api/sync/:userId` | GET | Get user's data |
| `/api/sync/:userId/templates` | POST | Sync templates only |
| `/api/sync/:userId/instances` | POST | Sync workout sessions |
| `/api/sync/:userId/logs` | POST | Sync exercise logs |
| `/api/sync/:userId/status` | GET | Get sync status |
| `/api/sync/:userId` | DELETE | Delete user data |

## File Structure

```
server/
├── src/
│   ├── config/         # Configuration
│   ├── routes/         # API endpoints
│   ├── services/       # Business logic
│   ├── types/          # TypeScript types
│   └── index.ts        # Main server
├── .env.example        # Config template
├── package.json        # Dependencies
├── README.md           # Full docs
└── QUICK_REFERENCE.md  # Quick reference
```

## NPM Scripts

From the `server` directory:
```bash
npm run dev          # Start in development
npm run dev:watch    # Start with auto-reload
npm run build        # Compile for production
npm run start        # Run production version
```

From the project root:
```bash
npm run server:dev     # Start server
npm run dev:full       # Run Angular + server together
```

## Troubleshooting

### "Port 3000 already in use"
Edit `server/.env` and change `PORT=3001`

### "Supabase connection error"
- Check your `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`
- Verify Supabase tables are created in dashboard

### "CORS error from Angular"
- Make sure `CORS_ORIGIN` in `.env` matches your Angular app's origin
- For local dev: `http://localhost:4200`

### "Tables don't exist"
- Make sure you ran the SQL script in Supabase SQL editor
- Check Supabase dashboard under Tables

## Documentation

- **Full docs**: [server/README.md](server/README.md) (700+ lines)
- **Testing**: [server/TESTING.md](server/TESTING.md)
- **Quick ref**: [server/QUICK_REFERENCE.md](server/QUICK_REFERENCE.md)
- **Setup guide**: [SYNC_SERVER_SETUP.md](SYNC_SERVER_SETUP.md)
- **What's created**: [SERVER_CREATION_SUMMARY.md](SERVER_CREATION_SUMMARY.md)

## Next Steps

1. ✅ Install dependencies: `npm install` (in server/)
2. ✅ Setup Supabase (free account at supabase.com)
3. ✅ Create `.env` file with credentials
4. ✅ Create database tables (SQL script above)
5. ✅ Start server: `npm run dev`
6. ✅ Test: `curl http://localhost:3000/health`
7. ✅ Add sync service to Angular app
8. ✅ Call sync methods from your components
9. ✅ Deploy to production

## That's It!

You now have a complete cloud sync system for your Fitness Tracker app. All your workout data can be stored in Supabase and synced across devices.

### Questions?

- Check [server/QUICK_REFERENCE.md](server/QUICK_REFERENCE.md) for quick answers
- See [server/README.md](server/README.md) for detailed documentation
- Review [server/TESTING.md](server/TESTING.md) for API examples

**Happy syncing!** 🚀
