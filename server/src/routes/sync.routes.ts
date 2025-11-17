import { Router, Request, Response } from 'express';
import { SyncService } from '../services/sync.service.js';
import { SyncRequest, SyncResponse, WorkoutTemplate, WorkoutInstance, ExerciseLog } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const syncService = new SyncService();

/**
 * @swagger
 * /sync:
 *   post:
 *     tags:
 *       - Sync
 *     summary: Sync all data to Supabase
 *     description: Syncs workout templates, instances, and exercise logs to Supabase in a single request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SyncRequest'
 *           example:
 *             userId: "550e8400-e29b-41d4-a716-446655440000"
 *             workoutTemplates:
 *               - id: "550e8400-e29b-41d4-a716-446655440001"
 *                 userId: "550e8400-e29b-41d4-a716-446655440000"
 *                 name: "Upper Body Workout"
 *                 description: "Chest, back, shoulders and arms"
 *                 exercises: []
 *                 estimatedDuration: 60
 *                 difficulty: "intermediate"
 *                 category: "Strength"
 *             workoutInstances: []
 *             exerciseLogs: []
 *     responses:
 *       '200':
 *         description: Data synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       '400':
 *         description: Missing userId field
 *       '500':
 *         description: Server error during sync
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const syncRequest: SyncRequest = req.body;
    const { userId, workoutTemplates, workoutInstances, exerciseLogs } = syncRequest;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    let syncedTemplates = 0;
    let syncedInstances = 0;
    let syncedLogs = 0;
    const errors: string[] = [];

    // Sync templates
    if (workoutTemplates && workoutTemplates.length > 0) {
      const templatesWithDefaults = workoutTemplates.map(t => ({
        ...t,
        userId,
        createdAt: t.createdAt || new Date(),
        updatedAt: t.updatedAt || new Date()
      }));

      const result = await syncService.syncWorkoutTemplates(userId, templatesWithDefaults);
      if (result.success) {
        syncedTemplates = result.count;
      } else {
        errors.push(`Templates: ${result.error}`);
      }
    }

    // Sync instances
    if (workoutInstances && workoutInstances.length > 0) {
      const instancesWithDefaults = workoutInstances.map(i => ({
        ...i,
        userId,
        createdAt: i.createdAt || new Date(),
        updatedAt: i.updatedAt || new Date()
      }));

      const result = await syncService.syncWorkoutInstances(userId, instancesWithDefaults);
      if (result.success) {
        syncedInstances = result.count;
      } else {
        errors.push(`Instances: ${result.error}`);
      }
    }

    // Sync logs
    if (exerciseLogs && exerciseLogs.length > 0) {
      const logsWithDefaults = exerciseLogs.map(l => ({
        ...l,
        userId,
        id: l.id || uuidv4(),
        createdAt: l.createdAt || new Date(),
        updatedAt: l.updatedAt || new Date()
      }));

      const result = await syncService.syncExerciseLogs(userId, logsWithDefaults);
      if (result.success) {
        syncedLogs = result.count;
      } else {
        errors.push(`Logs: ${result.error}`);
      }
    }

    // Update sync status
    const hasErrors = errors.length > 0;
    await syncService.updateSyncStatus(
      userId,
      hasErrors ? 'error' : 'success',
      syncedTemplates,
      syncedInstances,
      syncedLogs
    );

    const response: SyncResponse = {
      success: !hasErrors,
      message: `Synced ${syncedTemplates} templates, ${syncedInstances} instances, ${syncedLogs} logs`,
      data: {
        workoutTemplates: workoutTemplates || [],
        workoutInstances: workoutInstances || [],
        exerciseLogs: exerciseLogs || []
      }
    };

    if (errors.length > 0) {
      response.error = errors.join('; ');
    }

    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sync error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to sync data',
      error: errorMessage
    });
  }
});

/**
 * @swagger
 * /sync/{userId}:
 *   get:
 *     tags:
 *       - Sync
 *     summary: Get user data
 *     description: Retrieves all synced workout data (templates, instances, logs) for a specific user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the user
 *     responses:
 *       '200':
 *         description: User data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       '400':
 *         description: Missing userId parameter
 *       '500':
 *         description: Server error retrieving user data
 */
router.get('/sync/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const data = await syncService.getUserData(userId);

    const response: SyncResponse = {
      success: true,
      message: 'User data retrieved successfully',
      data: {
        workoutTemplates: data.templates,
        workoutInstances: data.instances,
        exerciseLogs: data.logs
      }
    };

    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get user data error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user data',
      error: errorMessage
    });
  }
});

/**
 * @swagger
 * /sync/{userId}/templates:
 *   post:
 *     tags:
 *       - Sync
 *     summary: Sync workout templates
 *     description: Syncs only workout templates for a specific user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               templates:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/WorkoutTemplate'
 *             required:
 *               - templates
 *     responses:
 *       '200':
 *         description: Templates synced successfully
 *       '400':
 *         description: Missing required fields
 *       '500':
 *         description: Server error during sync
 */
router.post('/sync/:userId/templates', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { templates } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    if (!templates || !Array.isArray(templates)) {
      return res.status(400).json({
        success: false,
        error: 'templates array is required'
      });
    }

    const templatesWithDefaults = templates.map((t: any) => ({
      ...t,
      userId,
      createdAt: t.createdAt || new Date(),
      updatedAt: t.updatedAt || new Date()
    }));

    const result = await syncService.syncWorkoutTemplates(userId, templatesWithDefaults);

    if (result.success) {
      await syncService.updateSyncStatus(userId, 'success', result.count, 0, 0);
      return res.json({
        success: true,
        message: `Synced ${result.count} templates`
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sync templates error:', error);

    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

/**
 * @swagger
 * /sync/{userId}/instances:
 *   post:
 *     tags:
 *       - Sync
 *     summary: Sync workout instances
 *     description: Syncs only workout instances (completed workouts) for a specific user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               instances:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/WorkoutInstance'
 *             required:
 *               - instances
 *     responses:
 *       '200':
 *         description: Instances synced successfully
 *       '400':
 *         description: Missing required fields
 *       '500':
 *         description: Server error during sync
 */
router.post('/sync/:userId/instances', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { instances } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    if (!instances || !Array.isArray(instances)) {
      return res.status(400).json({
        success: false,
        error: 'instances array is required'
      });
    }

    const instancesWithDefaults = instances.map((i: any) => ({
      ...i,
      userId,
      createdAt: i.createdAt || new Date(),
      updatedAt: i.updatedAt || new Date()
    }));

    const result = await syncService.syncWorkoutInstances(userId, instancesWithDefaults);

    if (result.success) {
      await syncService.updateSyncStatus(userId, 'success', 0, result.count, 0);
      return res.json({
        success: true,
        message: `Synced ${result.count} instances`
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sync instances error:', error);

    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

/**
 * @swagger
 * /sync/{userId}/logs:
 *   post:
 *     tags:
 *       - Sync
 *     summary: Sync exercise logs
 *     description: Syncs only exercise logs for a specific user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               logs:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ExerciseLog'
 *             required:
 *               - logs
 *     responses:
 *       '200':
 *         description: Logs synced successfully
 *       '400':
 *         description: Missing required fields
 *       '500':
 *         description: Server error during sync
 */
router.post('/sync/:userId/logs', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { logs } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({
        success: false,
        error: 'logs array is required'
      });
    }

    const logsWithDefaults = logs.map((l: any) => ({
      ...l,
      userId,
      id: l.id || uuidv4(),
      createdAt: l.createdAt || new Date(),
      updatedAt: l.updatedAt || new Date()
    }));

    const result = await syncService.syncExerciseLogs(userId, logsWithDefaults);

    if (result.success) {
      await syncService.updateSyncStatus(userId, 'success', 0, 0, result.count);
      return res.json({
        success: true,
        message: `Synced ${result.count} logs`
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sync logs error:', error);

    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

/**
 * @swagger
 * /sync/{userId}/status:
 *   get:
 *     tags:
 *       - Sync
 *     summary: Get sync status
 *     description: Retrieves the last sync timestamp and status information for a user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the user
 *     responses:
 *       '200':
 *         description: Sync status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SyncStatus'
 *       '400':
 *         description: Missing userId parameter
 *       '500':
 *         description: Server error retrieving sync status
 */
router.get('/sync/:userId/status', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const lastSyncTime = await syncService.getLastSyncTime(userId);

    res.json({
      success: true,
      userId,
      lastSyncTime: lastSyncTime || 'Never synced'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get sync status error:', error);

    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

/**
 * @swagger
 * /sync/{userId}:
 *   delete:
 *     tags:
 *       - Sync
 *     summary: Delete user data
 *     description: Permanently deletes all workout data (templates, instances, logs) for a specific user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the user
 *     responses:
 *       '200':
 *         description: User data deleted successfully
 *       '400':
 *         description: Missing userId parameter
 *       '500':
 *         description: Server error during deletion
 */
router.delete('/sync/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const result = await syncService.deleteUserData(userId);

    if (result.success) {
      res.json({
        success: true,
        message: `Deleted all data for user ${userId}`
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Delete user data error:', error);

    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

export default router;
