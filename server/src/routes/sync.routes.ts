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

    console.log('[Sync] Received sync request for user:', userId);
    console.log('[Sync] Templates:', workoutTemplates?.length || 0);
    console.log('[Sync] Instances:', workoutInstances?.length || 0);
    console.log('[Sync] Logs:', exerciseLogs?.length || 0);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    // Resolve user ID (from email to UUID if needed)
    let resolvedUserId: string;
    try {
      resolvedUserId = await syncService.resolveUserId(userId);
      console.log('[Sync] Resolved user ID:', resolvedUserId);
    } catch (error) {
      console.error('[Sync] Error resolving user ID:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to resolve user',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    let syncedTemplates = 0;
    let syncedInstances = 0;
    let syncedLogs = 0;
    const errors: string[] = [];

    // Store UUID mappings for client to update local database
    const templateMappings: Array<{id: string; localId: string}> = [];
    const instanceMappings: Array<{id: string; localId: string}> = [];
    const logMappings: Array<{id: string; localId: string}> = [];

    // Sync templates
    if (workoutTemplates && workoutTemplates.length > 0) {
      try {
        const templatesWithDefaults = workoutTemplates.map(t => ({
          ...t,
          userId: resolvedUserId,
          createdAt: t.createdAt || new Date(),
          updatedAt: t.updatedAt || new Date()
        }));

        console.log('[Sync] Syncing templates:', templatesWithDefaults.length);
        const result = await syncService.syncWorkoutTemplates(resolvedUserId, templatesWithDefaults);
        if (result.success) {
          syncedTemplates = result.count;
          if (result.data) {
            templateMappings.push(...result.data);
          }
          console.log('[Sync] Templates synced:', syncedTemplates);
        } else {
          errors.push(`Templates: ${result.error}`);
          console.error('[Sync] Templates sync failed:', result.error);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Templates: ${errorMsg}`);
        console.error('[Sync] Templates sync error:', error);
      }
    }

    // Sync instances
    if (workoutInstances && workoutInstances.length > 0) {
      try {
        // Map local template IDs to cloud UUIDs for foreign key references
        const templateIdMap = new Map<string, string>();
        for (const mapping of templateMappings) {
          templateIdMap.set(mapping.localId, mapping.id);
        }

        const instancesWithDefaults = workoutInstances.map(i => {
          // Replace local template ID with cloud UUID if available
          const cloudTemplateId = i.templateId ? templateIdMap.get(i.templateId) : undefined;

          return {
            ...i,
            templateId: cloudTemplateId || i.templateId, // Use cloud UUID if available, otherwise keep original
            userId: resolvedUserId,
            createdAt: i.createdAt || new Date(),
            updatedAt: i.updatedAt || new Date()
          };
        });

        console.log('[Sync] Syncing instances:', instancesWithDefaults.length);
        console.log('[Sync] Template ID mappings available:', templateIdMap.size);
        const result = await syncService.syncWorkoutInstances(resolvedUserId, instancesWithDefaults);
        if (result.success) {
          syncedInstances = result.count;
          if (result.data) {
            instanceMappings.push(...result.data);
          }
          console.log('[Sync] Instances synced:', syncedInstances);
        } else {
          errors.push(`Instances: ${result.error}`);
          console.error('[Sync] Instances sync failed:', result.error);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Instances: ${errorMsg}`);
        console.error('[Sync] Instances sync error:', error);
      }
    }

    // Sync logs
    if (exerciseLogs && exerciseLogs.length > 0) {
      try {
        const logsWithDefaults = exerciseLogs.map(l => ({
          ...l,
          userId: resolvedUserId,
          id: l.id || uuidv4(),
          createdAt: l.createdAt || new Date(),
          updatedAt: l.updatedAt || new Date()
        }));

        console.log('[Sync] Syncing logs:', logsWithDefaults.length);
        const result = await syncService.syncExerciseLogs(resolvedUserId, logsWithDefaults);
        if (result.success) {
          syncedLogs = result.count;
          if (result.data) {
            logMappings.push(...result.data);
          }
          console.log('[Sync] Logs synced:', syncedLogs);
        } else {
          errors.push(`Logs: ${result.error}`);
          console.error('[Sync] Logs sync failed:', result.error);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Logs: ${errorMsg}`);
        console.error('[Sync] Logs sync error:', error);
      }
    }

    // Update sync status
    const hasErrors = errors.length > 0;
    await syncService.updateSyncStatus(
      resolvedUserId,
      hasErrors ? 'error' : 'success',
      syncedTemplates,
      syncedInstances,
      syncedLogs
    );

    const response: SyncResponse = {
      success: !hasErrors,
      message: `Synced ${syncedTemplates} templates, ${syncedInstances} instances, ${syncedLogs} logs`,
      data: {
        workoutTemplates: templateMappings,
        workoutInstances: instanceMappings,
        exerciseLogs: logMappings
      } as any
    };

    if (errors.length > 0) {
      response.error = errors.join('; ');
    }

    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[Sync] Unhandled error:', error);
    console.error('[Sync] Error stack:', errorStack);

    res.status(500).json({
      success: false,
      message: 'Failed to sync data',
      error: errorMessage,
      details: errorStack
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

    // Resolve user ID (from email to UUID if needed)
    const resolvedUserId = await syncService.resolveUserId(userId);
    const data = await syncService.getUserData(resolvedUserId);

    const response: SyncResponse = {
      success: true,
      message: 'User data retrieved successfully',
      data: {
        workoutTemplates: data.templates?.map(t => ({ id: t.id, localId: t.localId || '' })),
        workoutInstances: data.instances?.map(i => ({ id: i.id, localId: i.localId || '' })),
        exerciseLogs: data.logs?.map(l => ({ id: l.id, localId: l.localId || '' }))
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

    // Resolve user ID (from email to UUID if needed)
    const resolvedUserId = await syncService.resolveUserId(userId);
    const lastSyncTime = await syncService.getLastSyncTime(resolvedUserId);

    res.json({
      success: true,
      userId: resolvedUserId,
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

    // Resolve user ID (from email to UUID if needed)
    const resolvedUserId = await syncService.resolveUserId(userId);
    const result = await syncService.deleteUserData(resolvedUserId);

    if (result.success) {
      res.json({
        success: true,
        message: `Deleted all data for user ${resolvedUserId}`
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
