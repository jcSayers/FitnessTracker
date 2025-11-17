import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Fitness Tracker Sync API',
      version: '1.0.0',
      description: 'RESTful API for syncing fitness tracker data (templates, instances, logs) to Supabase',
      contact: {
        name: 'Fitness Tracker Team',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.fitnesstrack.app',
        description: 'Production server (update with your domain)',
      },
    ],
    components: {
      schemas: {
        WorkoutTemplate: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            exercises: { type: 'array', items: { type: 'object' } },
            estimatedDuration: { type: 'integer' },
            difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
            category: { type: 'string' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        WorkoutInstance: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            templateId: { type: 'string', format: 'uuid' },
            templateName: { type: 'string' },
            startTime: { type: 'string', format: 'date-time' },
            endTime: { type: 'string', format: 'date-time' },
            totalDuration: { type: 'integer' },
            sets: { type: 'array', items: { type: 'object' } },
            status: { type: 'string', enum: ['in_progress', 'completed', 'paused', 'cancelled'] },
            notes: { type: 'string' },
            location: { type: 'string' },
            completedExercises: { type: 'integer' },
            totalExercises: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        ExerciseLog: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            exerciseId: { type: 'string', format: 'uuid' },
            exerciseName: { type: 'string' },
            date: { type: 'string', format: 'date-time' },
            sets: { type: 'array', items: { type: 'object' } },
            personalRecord: { type: 'object', properties: { weight: { type: 'number' }, reps: { type: 'number' } } },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        SyncStatus: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
            lastSyncTime: { type: 'string', format: 'date-time' },
            syncedTemplates: { type: 'integer' },
            syncedInstances: { type: 'integer' },
            syncedLogs: { type: 'integer' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'failed'] },
          },
        },
        SyncRequest: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string', format: 'uuid', description: 'User ID for sync operation' },
            workoutTemplates: { type: 'array', items: { $ref: '#/components/schemas/WorkoutTemplate' } },
            workoutInstances: { type: 'array', items: { $ref: '#/components/schemas/WorkoutInstance' } },
            exerciseLogs: { type: 'array', items: { $ref: '#/components/schemas/ExerciseLog' } },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
            error: { type: 'string' },
          },
        },
      },
    },
    tags: [
      {
        name: 'Health',
        description: 'Server health check',
      },
      {
        name: 'Sync',
        description: 'Data synchronization endpoints',
      },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
