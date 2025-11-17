import { GarminFitData, GarminFitParser } from "./garmin-fit.service.js";

export interface TransformedFitData {
  workoutInstance: {
    templateName: string;
    startTime: Date;
    endTime: Date;
    totalDuration: number;
    status: "COMPLETED";
    notes: string;
    location?: string;
    heartRateAvg?: number;
    heartRateMax?: number;
    cadenceAvg?: number;
    distance: number;
    elevationGain?: number;
    calories: number;
    externalSource: "garmin";
    externalId: string;
  };
  exerciseLogs: Array<{
    exerciseName: string;
    date: Date;
    sets: any[];
    heartRateAvg?: number;
    heartRateMax?: number;
    heartRateMin?: number;
    cadenceAvg?: number;
    cadenceMax?: number;
    speedAvg?: number;
    speedMax?: number;
    powerAvg?: number;
    powerMax?: number;
    elevationGain?: number;
    elevationLoss?: number;
    gpsData: any[];
    externalSource: "garmin";
    externalId: string;
    externalData: any;
  }>;
}

export class FitTransformer {
  /**
   * Transform Garmin FIT data into FitnessTracker models
   */
  static transform(fitData: GarminFitData, _userId: string): TransformedFitData {
    const externalId = this.generateExternalId(fitData);
    const exerciseName = this.generateExerciseName(fitData);
    const endTime = new Date(
      fitData.startTime.getTime() + fitData.totalDuration * 1000
    );

    // Calculate min heart rate from records if available
    const heartRateMin = fitData.records
      ?.filter((r: any) => r.heartRate)
      .reduce(
        (min: number, r: any) => Math.min(min, r.heartRate || Infinity),
        Infinity
      );

    // Calculate min/max cadence and speed from records
    const cadenceMin = fitData.records
      ?.filter((r: any) => r.cadence)
      .reduce(
        (min: number, r: any) => Math.min(min, r.cadence || Infinity),
        Infinity
      );
    const cadenceMax = fitData.records
      ?.filter((r: any) => r.cadence)
      .reduce(
        (max: number, r: any) => Math.max(max, r.cadence || -Infinity),
        -Infinity
      );

    const speedMin = fitData.records
      ?.filter((r: any) => r.speed)
      .reduce(
        (min: number, r: any) => Math.min(min, r.speed || Infinity),
        Infinity
      );
    const speedMax = fitData.records
      ?.filter((r: any) => r.speed)
      .reduce(
        (max: number, r: any) => Math.max(max, r.speed || -Infinity),
        -Infinity
      );

    const workoutInstance = {
      templateName: exerciseName,
      startTime: fitData.startTime,
      endTime: endTime,
      totalDuration: fitData.totalDuration,
      status: "COMPLETED" as const,
      notes: `Imported from Garmin device. Activity: ${fitData.activityType}`,
      heartRateAvg: fitData.heartRateAvg,
      heartRateMax: fitData.heartRateMax,
      cadenceAvg: fitData.cadenceAvg,
      distance: Math.round(fitData.totalDistance),
      elevationGain: fitData.elevationGain,
      calories: Math.round(fitData.totalCalories),
      externalSource: "garmin" as const,
      externalId: externalId,
    };

    const exerciseLogs = {
      exerciseName: exerciseName,
      date: fitData.startTime,
      sets: this.transformToSets(fitData),
      heartRateAvg: fitData.heartRateAvg,
      heartRateMax: fitData.heartRateMax,
      heartRateMin:
        heartRateMin === Infinity
          ? undefined
          : Math.round(heartRateMin),
      cadenceAvg: fitData.cadenceAvg ? Math.round(fitData.cadenceAvg) : undefined,
      cadenceMax:
        cadenceMax === -Infinity
          ? undefined
          : Math.round(cadenceMax),
      speedAvg: fitData.speedAvg ? Math.round(fitData.speedAvg) : undefined,
      speedMax:
        speedMax === -Infinity
          ? undefined
          : Math.round(speedMax),
      powerAvg: fitData.powerAvg ? Math.round(fitData.powerAvg) : undefined,
      powerMax: fitData.powerMax ? Math.round(fitData.powerMax) : undefined,
      elevationGain: fitData.elevationGain,
      elevationLoss: fitData.elevationLoss,
      gpsData: fitData.gpsPoints,
      externalSource: "garmin" as const,
      externalId: externalId,
      externalData: {
        activityType: fitData.activityType,
        fileId: fitData.fileId,
        sessions: fitData.sessions,
        laps: fitData.laps,
        deviceInfo: fitData.deviceInfo,
      },
    };

    return {
      workoutInstance,
      exerciseLogs: [exerciseLogs],
    };
  }

  /**
   * Generate a unique external ID from FIT data
   */
  private static generateExternalId(fitData: GarminFitData): string {
    // Use timestamp and activity type to create a unique ID
    const timestamp = Math.floor(
      (fitData.startTime?.getTime() || Date.now()) / 1000
    );
    const activityHash = fitData.activityType.substring(0, 3).toUpperCase();
    return `GARMIN_${activityHash}_${timestamp}`;
  }

  /**
   * Generate exercise name from FIT data
   */
  private static generateExerciseName(fitData: GarminFitData): string {
    const activityType = fitData.activityType || "Activity";
    const category =
      GarminFitParser.mapActivityType(fitData.activityType) || "MIXED";
    const date = fitData.startTime.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    return `${activityType.charAt(0).toUpperCase() + activityType.slice(1)} - ${date}`;
  }

  /**
   * Transform FIT records into lap-based sets
   * Each lap becomes a "set" with lap data
   */
  private static transformToSets(fitData: GarminFitData): any[] {
    if (!fitData.laps || fitData.laps.length === 0) {
      // If no lap data, create a single set from session totals
      return [
        {
          distance: Math.round(fitData.totalDistance),
          duration: fitData.totalDuration,
          calories: Math.round(fitData.totalCalories),
          avgHeartRate: fitData.heartRateAvg,
          maxHeartRate: fitData.heartRateMax,
          completed: true,
        },
      ];
    }

    // Transform each lap into a set
    return fitData.laps.map((lap: any, index: number) => ({
      lapNumber: index + 1,
      distance: lap.totalDistance ? Math.round(lap.totalDistance) : undefined,
      duration: lap.totalElapsedTime,
      calories: lap.totalCalories ? Math.round(lap.totalCalories) : undefined,
      avgHeartRate: lap.avgHeartRate,
      maxHeartRate: lap.maxHeartRate,
      avgCadence: lap.avgCadence,
      maxCadence: lap.maxCadence,
      avgSpeed: lap.avgSpeed,
      maxSpeed: lap.maxSpeed,
      avgPower: lap.avgPower,
      maxPower: lap.maxPower,
      ascent: lap.totalAscent,
      descent: lap.totalDescent,
      completed: true,
    }));
  }

  /**
   * Get category for workout based on Garmin activity type
   */
  static getCategory(activityType: string) {
    return GarminFitParser.mapActivityType(activityType);
  }
}
