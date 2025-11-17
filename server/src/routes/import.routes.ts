import { Router, Request, Response } from "express";
import { SyncService } from "../services/sync.service.js";
import { GarminFitParser } from "../services/garmin-fit.service.js";
import { FitTransformer } from "../services/fit-transformer.js";
import { WorkoutStatus } from "../types/index.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();
const syncService = new SyncService();

/**
 * POST /api/import/fit
 * Import a Garmin FIT file and sync to database
 *
 * Expected request:
 * - Content-Type: multipart/form-data
 * - Fields:
 *   - userId: string (required)
 *   - file: binary (required) - FIT file
 *
 * Returns: {
 *   success: boolean,
 *   message: string,
 *   data: {
 *     workoutInstance: object,
 *     exerciseLogs: object[],
 *     syncedInstanceId: string,
 *     syncedLogIds: string[]
 *   }
 * }
 */
router.post("/fit", async (req: Request, res: Response) => {
  try {
    // Check if file is present
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "FIT file is required",
      });
    }

    const userId = req.body.userId || req.query.userId;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "userId is required",
      });
    }

    // Validate FIT file
    const fileBuffer = req.file.buffer;
    const validation = GarminFitParser.validate(fileBuffer);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    // Parse FIT file
    const fitData = GarminFitParser.parse(fileBuffer);

    // Transform to FitnessTracker models
    const transformed = FitTransformer.transform(fitData, userId);

    // Create workout instance
    const workoutInstanceId = uuidv4();
    const workoutInstance = {
      id: workoutInstanceId,
      ...transformed.workoutInstance,
      userId,
      templateId: null as any,
      sets: [],
      status: WorkoutStatus.COMPLETED,
      completedExercises: 1,
      totalExercises: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Create exercise logs with IDs
    const exerciseLogs = transformed.exerciseLogs.map((log) => ({
      id: uuidv4(),
      ...log,
      userId,
      exerciseId: uuidv4(),
      personalRecord: {
        duration: fitData.totalDuration,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Sync workout instance to database
    const instanceResult = await syncService.syncWorkoutInstances(userId, [
      workoutInstance,
    ]);

    if (!instanceResult.success) {
      return res.status(500).json({
        success: false,
        error: `Failed to sync workout instance: ${instanceResult.error}`,
      });
    }

    // Sync exercise logs to database
    const logsResult = await syncService.syncExerciseLogs(userId, exerciseLogs);

    if (!logsResult.success) {
      return res.status(500).json({
        success: false,
        error: `Failed to sync exercise logs: ${logsResult.error}`,
      });
    }

    // Update sync status
    await syncService.updateSyncStatus(userId, "success", 0, 1, exerciseLogs.length);

    return res.json({
      success: true,
      message: `Successfully imported Garmin FIT activity: ${fitData.activityType}`,
      data: {
        workoutInstance,
        exerciseLogs,
        syncedInstanceId: workoutInstanceId,
        syncedLogIds: exerciseLogs.map((log) => log.id),
        fitData: {
          activityType: fitData.activityType,
          startTime: fitData.startTime,
          totalDuration: fitData.totalDuration,
          totalDistance: fitData.totalDistance,
          totalCalories: fitData.totalCalories,
          heartRateAvg: fitData.heartRateAvg,
          heartRateMax: fitData.heartRateMax,
          gpsPoints: fitData.gpsPoints.length,
        },
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("FIT import error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to import FIT file",
      error: errorMessage,
    });
  }
});

/**
 * POST /api/import/fit/validate
 * Validate a FIT file without importing
 *
 * Expected request:
 * - Content-Type: multipart/form-data
 * - Fields:
 *   - file: binary (required) - FIT file
 *
 * Returns: {
 *   valid: boolean,
 *   data?: {
 *     activityType: string,
 *     startTime: Date,
 *     totalDuration: number,
 *     totalDistance: number,
 *     heartRateAvg: number
 *   },
 *   error?: string
 * }
 */
router.post("/fit/validate", async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "FIT file is required",
      });
    }

    const fileBuffer = req.file.buffer;
    const validation = GarminFitParser.validate(fileBuffer);

    if (!validation.valid) {
      return res.json({
        valid: false,
        error: validation.error,
      });
    }

    // Parse and return preview data
    const fitData = GarminFitParser.parse(fileBuffer);

    return res.json({
      valid: true,
      data: {
        activityType: fitData.activityType,
        startTime: fitData.startTime,
        endTime: new Date(
          fitData.startTime.getTime() + fitData.totalDuration * 1000
        ),
        totalDuration: fitData.totalDuration,
        totalDistance: Math.round(fitData.totalDistance),
        totalCalories: Math.round(fitData.totalCalories),
        heartRateAvg: fitData.heartRateAvg,
        heartRateMax: fitData.heartRateMax,
        cadenceAvg: fitData.cadenceAvg,
        elevationGain: fitData.elevationGain,
        gpsPoints: fitData.gpsPoints.length,
        laps: fitData.laps?.length || 0,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("FIT validation error:", error);

    res.status(500).json({
      valid: false,
      error: errorMessage,
    });
  }
});

export default router;
