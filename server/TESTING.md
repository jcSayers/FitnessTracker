# Testing the Sync Server

This document provides examples for testing the Sync Server API endpoints.

## Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "development"
}
```

## Sync All Data

Complete sync with templates, instances, and logs:

```bash
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "workoutTemplates": [
      {
        "id": "tmpl-001",
        "name": "Push Day",
        "description": "Chest and triceps workout",
        "exercises": [
          {
            "id": "ex-001",
            "name": "Bench Press",
            "sets": 4,
            "reps": 8,
            "weight": 135,
            "restTime": 120,
            "category": "strength"
          }
        ],
        "estimatedDuration": 60,
        "difficulty": "intermediate",
        "category": "strength",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z",
        "isActive": true
      }
    ],
    "workoutInstances": [
      {
        "id": "inst-001",
        "templateId": "tmpl-001",
        "templateName": "Push Day",
        "startTime": "2024-01-15T08:00:00Z",
        "endTime": "2024-01-15T09:00:00Z",
        "totalDuration": 60,
        "sets": [
          {
            "exerciseId": "ex-001",
            "setNumber": 1,
            "reps": 8,
            "weight": 135,
            "completed": true,
            "completedAt": "2024-01-15T08:05:00Z"
          }
        ],
        "status": "completed",
        "completedExercises": 1,
        "totalExercises": 1,
        "createdAt": "2024-01-15T08:00:00Z",
        "updatedAt": "2024-01-15T09:00:00Z"
      }
    ],
    "exerciseLogs": [
      {
        "id": "log-001",
        "exerciseId": "ex-001",
        "exerciseName": "Bench Press",
        "date": "2024-01-15T08:00:00Z",
        "sets": [
          {
            "exerciseId": "ex-001",
            "setNumber": 1,
            "reps": 8,
            "weight": 135,
            "completed": true
          }
        ],
        "personalRecord": {
          "weight": 135
        },
        "createdAt": "2024-01-15T08:00:00Z",
        "updatedAt": "2024-01-15T08:00:00Z"
      }
    ]
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Synced 1 templates, 1 instances, 1 logs",
  "data": {
    "workoutTemplates": [/* ... */],
    "workoutInstances": [/* ... */],
    "exerciseLogs": [/* ... */]
  }
}
```

## Get User Data

Retrieve all synced data for a user:

```bash
curl http://localhost:3000/api/sync/123e4567-e89b-12d3-a456-426614174000
```

Expected response:
```json
{
  "success": true,
  "message": "User data retrieved successfully",
  "data": {
    "workoutTemplates": [/* ... */],
    "workoutInstances": [/* ... */],
    "exerciseLogs": [/* ... */]
  }
}
```

## Sync Only Templates

```bash
curl -X POST http://localhost:3000/api/sync/123e4567-e89b-12d3-a456-426614174000/templates \
  -H "Content-Type: application/json" \
  -d '{
    "templates": [
      {
        "id": "tmpl-002",
        "name": "Pull Day",
        "description": "Back and biceps workout",
        "exercises": [
          {
            "id": "ex-002",
            "name": "Deadlift",
            "sets": 5,
            "reps": 5,
            "weight": 225,
            "restTime": 180,
            "category": "strength"
          }
        ],
        "estimatedDuration": 75,
        "difficulty": "advanced",
        "category": "strength",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z",
        "isActive": true
      }
    ]
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Synced 1 templates"
}
```

## Sync Only Workout Instances

```bash
curl -X POST http://localhost:3000/api/sync/123e4567-e89b-12d3-a456-426614174000/instances \
  -H "Content-Type: application/json" \
  -d '{
    "instances": [
      {
        "id": "inst-002",
        "templateId": "tmpl-002",
        "templateName": "Pull Day",
        "startTime": "2024-01-16T08:00:00Z",
        "endTime": "2024-01-16T09:15:00Z",
        "totalDuration": 75,
        "sets": [
          {
            "exerciseId": "ex-002",
            "setNumber": 1,
            "reps": 5,
            "weight": 225,
            "completed": true,
            "completedAt": "2024-01-16T08:10:00Z"
          }
        ],
        "status": "completed",
        "completedExercises": 1,
        "totalExercises": 1,
        "createdAt": "2024-01-16T08:00:00Z",
        "updatedAt": "2024-01-16T09:15:00Z"
      }
    ]
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Synced 1 instances"
}
```

## Sync Only Exercise Logs

```bash
curl -X POST http://localhost:3000/api/sync/123e4567-e89b-12d3-a456-426614174000/logs \
  -H "Content-Type: application/json" \
  -d '{
    "logs": [
      {
        "exerciseId": "ex-002",
        "exerciseName": "Deadlift",
        "date": "2024-01-16T08:00:00Z",
        "sets": [
          {
            "exerciseId": "ex-002",
            "setNumber": 1,
            "reps": 5,
            "weight": 225,
            "completed": true
          }
        ],
        "personalRecord": {
          "weight": 225,
          "reps": 5
        },
        "createdAt": "2024-01-16T08:00:00Z",
        "updatedAt": "2024-01-16T08:00:00Z"
      }
    ]
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Synced 1 logs"
}
```

## Get Sync Status

```bash
curl http://localhost:3000/api/sync/123e4567-e89b-12d3-a456-426614174000/status
```

Expected response:
```json
{
  "success": true,
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "lastSyncTime": "2024-01-16T10:30:00.000Z"
}
```

## Delete User Data

```bash
curl -X DELETE http://localhost:3000/api/sync/123e4567-e89b-12d3-a456-426614174000
```

Expected response:
```json
{
  "success": true,
  "message": "Deleted all data for user 123e4567-e89b-12d3-a456-426614174000"
}
```

## Using Postman

### 1. Import Collection

Create a new Postman collection and add these requests:

#### Health Check
- **Method**: GET
- **URL**: `http://localhost:3000/health`

#### Sync All Data
- **Method**: POST
- **URL**: `http://localhost:3000/api/sync`
- **Headers**: `Content-Type: application/json`
- **Body**: (use raw JSON from examples above)

#### Get User Data
- **Method**: GET
- **URL**: `http://localhost:3000/api/sync/{{userId}}`
- Set `{{userId}}` as a Postman variable

#### Sync Templates
- **Method**: POST
- **URL**: `http://localhost:3000/api/sync/{{userId}}/templates`
- **Headers**: `Content-Type: application/json`
- **Body**: (use raw JSON from examples above)

#### Sync Instances
- **Method**: POST
- **URL**: `http://localhost:3000/api/sync/{{userId}}/instances`
- **Headers**: `Content-Type: application/json`
- **Body**: (use raw JSON from examples above)

#### Sync Logs
- **Method**: POST
- **URL**: `http://localhost:3000/api/sync/{{userId}}/logs`
- **Headers**: `Content-Type: application/json`
- **Body**: (use raw JSON from examples above)

#### Get Sync Status
- **Method**: GET
- **URL**: `http://localhost:3000/api/sync/{{userId}}/status`

#### Delete User Data
- **Method**: DELETE
- **URL**: `http://localhost:3000/api/sync/{{userId}}`

## Automated Testing with Jest

Install testing dependencies:
```bash
npm install --save-dev jest @types/jest ts-jest
```

Example test file (`src/__tests__/sync.test.ts`):
```typescript
import { SyncService } from '../services/sync.service';

describe('SyncService', () => {
  let syncService: SyncService;

  beforeEach(() => {
    syncService = new SyncService();
  });

  it('should sync workout templates', async () => {
    const userId = 'test-user-123';
    const templates = [
      {
        id: 'tmpl-001',
        userId,
        name: 'Test Workout',
        exercises: [],
        estimatedDuration: 30,
        difficulty: 'beginner',
        category: 'strength',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      }
    ];

    const result = await syncService.syncWorkoutTemplates(userId, templates);
    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
  });
});
```

## Tips for Testing

1. **Use a test user ID**: Create a UUID for testing
   ```bash
   node -e "console.log(require('uuid').v4())"
   ```

2. **Monitor Supabase**: Check the Supabase dashboard to verify data is being written

3. **Check Server Logs**: Watch for detailed error messages in your terminal

4. **Test with Empty Data**: Verify the API handles empty arrays correctly

5. **Test Error Cases**: Try invalid user IDs, malformed JSON, etc.

## Performance Testing

For load testing, use Apache Bench or similar tools:

```bash
# Install Apache Bench (macOS)
brew install httpd

# Run load test (100 requests, 10 concurrent)
ab -n 100 -c 10 http://localhost:3000/health
```

## Debugging

Enable detailed logging by setting `NODE_ENV` to `development` in your `.env` file.

Watch the server logs for:
- Connection errors
- SQL errors
- Validation errors
- Performance issues
