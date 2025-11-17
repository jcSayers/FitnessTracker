import { Decoder, Stream } from "@garmin/fitsdk";

export interface GarminFitData {
  fileId: any;
  sessions: any[];
  laps: any[];
  records: any[];
  events: any[];
  deviceInfo: any[];
  activityType: string;
  startTime: Date;
  totalDuration: number;
  totalDistance: number;
  totalCalories: number;
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
  gpsPoints: Array<{
    timestamp: number;
    lat: number;
    lng: number;
    elevation?: number;
    heartRate?: number;
    cadence?: number;
    speed?: number;
    power?: number;
  }>;
}

export class GarminFitParser {
  /**
   * Parse a binary FIT file buffer
   * @param buffer Buffer containing FIT file data
   * @returns Parsed Garmin FIT data
   * @throws Error if file is invalid or parsing fails
   */
  static parse(buffer: Buffer): GarminFitData {
    try {
      // Create stream from buffer
      const stream = Stream.fromBuffer(buffer);

      // Check if valid FIT file
      if (!Decoder.isFIT(stream)) {
        throw new Error("File is not a valid FIT file");
      }

      // Create decoder
      const decoder = new Decoder(stream);

      // Validate file integrity
      if (!decoder.checkIntegrity()) {
        throw new Error("FIT file integrity check failed");
      }

      // Decode messages
      const { messages, errors } = decoder.read({
        mesgListener: undefined,
        applyScaleAndOffset: true,
        expandSubFields: true,
        expandComponents: true,
        convertTypesToStrings: true,
        convertDateTimesToDates: true,
      });

      if (errors && errors.length > 0) {
        console.warn(
          "Warnings encountered during FIT parsing:",
          errors.join("; ")
        );
      }

      // Extract and organize data
      return this.extractData(messages);
    } catch (error) {
      throw new Error(
        `Failed to parse FIT file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Extract relevant data from decoded FIT messages
   */
  private static extractData(messages: any): GarminFitData {
    const result: GarminFitData = {
      fileId: null,
      sessions: [],
      laps: [],
      records: [],
      events: [],
      deviceInfo: [],
      activityType: "unknown",
      startTime: new Date(),
      totalDuration: 0,
      totalDistance: 0,
      totalCalories: 0,
      gpsPoints: [],
    };

    // Process each message type
    if (messages.fileId) {
      result.fileId = messages.fileId[0] || null;
      if (result.fileId?.type) {
        result.activityType = String(result.fileId.type).toLowerCase();
      }
    }

    // Extract session data (overall activity summary)
    if (messages.session) {
      result.sessions = messages.session;
      if (messages.session.length > 0) {
        const session = messages.session[0];
        result.startTime = session.startTime || new Date();
        result.totalDuration = session.totalElapsedTime || 0;
        result.totalDistance = session.totalDistance || 0;
        result.totalCalories = session.totalCalories || 0;
        result.heartRateAvg = session.avgHeartRate;
        result.heartRateMax = session.maxHeartRate;
        result.cadenceAvg = session.avgCadence;
        result.cadenceMax = session.maxCadence;
        result.speedAvg = session.avgSpeed;
        result.speedMax = session.maxSpeed;
        result.powerAvg = session.avgPower;
        result.powerMax = session.maxPower;
        result.elevationGain = session.totalAscent;
        result.elevationLoss = session.totalDescent;
      }
    }

    // Extract lap data
    if (messages.lap) {
      result.laps = messages.lap;
    }

    // Extract record data (time-series points)
    if (messages.record) {
      result.records = messages.record;
      result.gpsPoints = this.extractGpsPoints(messages.record);
    }

    // Extract event data
    if (messages.event) {
      result.events = messages.event;
    }

    // Extract device info
    if (messages.deviceInfo) {
      result.deviceInfo = messages.deviceInfo;
    }

    return result;
  }

  /**
   * Extract GPS points from record messages
   */
  private static extractGpsPoints(
    records: any[]
  ): GarminFitData["gpsPoints"] {
    return records
      .map((record) => {
        const point: (typeof records[0])["gpsPoints"] = {
          timestamp: Math.floor(
            (record.timestamp?.getTime() || Date.now()) / 1000
          ),
          lat: record.positionLat,
          lng: record.positionLong,
          elevation: record.altitude,
          heartRate: record.heartRate,
          cadence: record.cadence,
          speed: record.speed,
          power: record.power,
        };

        // Only include point if it has coordinates
        if (point.lat !== undefined && point.lng !== undefined) {
          return point;
        }
        return null;
      })
      .filter((point) => point !== null) as GarminFitData["gpsPoints"];
  }

  /**
   * Map Garmin activity type to FitnessTracker category
   */
  static mapActivityType(
    garminType: string
  ): "STRENGTH" | "CARDIO" | "HIIT" | "YOGA" | "SPORTS" | "MIXED" {
    const typeMap: Record<
      string,
      "STRENGTH" | "CARDIO" | "HIIT" | "YOGA" | "SPORTS" | "MIXED"
    > = {
      running: "CARDIO",
      cycling: "CARDIO",
      walking: "CARDIO",
      swimming: "CARDIO",
      rowing: "CARDIO",
      elliptical: "CARDIO",
      stairclimbing: "CARDIO",
      hiit: "HIIT",
      yoga: "YOGA",
      strengthtraining: "STRENGTH",
      crossfit: "HIIT",
      soccer: "SPORTS",
      basketball: "SPORTS",
      tennis: "SPORTS",
      volleyball: "SPORTS",
      boxing: "SPORTS",
      golf: "SPORTS",
      skiing: "SPORTS",
      snowboarding: "SPORTS",
      surfing: "SPORTS",
      windsurfing: "SPORTS",
      kitesurfing: "SPORTS",
      mountainbiking: "CARDIO",
      rock_climbing: "SPORTS",
      ice_skating: "SPORTS",
      alpine_skiing: "SPORTS",
      american_football: "SPORTS",
      baseball: "SPORTS",
      cricket: "SPORTS",
      handcycling: "CARDIO",
      hang_gliding: "SPORTS",
      horseback_riding: "SPORTS",
      inline_skating: "CARDIO",
      motocross: "SPORTS",
      paddling: "CARDIO",
      pilates: "STRENGTH",
      skateboarding: "SPORTS",
      skiing_duplicate: "SPORTS",
      snowshoeing: "CARDIO",
      stair_climbing: "CARDIO",
      standup_paddleboarding: "CARDIO",
      strength_training: "STRENGTH",
      track_cycling: "CARDIO",
      trail_running: "CARDIO",
      training: "MIXED",
      transition: "MIXED",
      water_skiing: "SPORTS",
      sport: "SPORTS",
      generic: "MIXED",
      all: "MIXED",
    };

    const normalizedType = garminType.toLowerCase().replace(/\s+/g, "");
    return typeMap[normalizedType] || "MIXED";
  }

  /**
   * Validate FIT file without full parsing
   */
  static validate(buffer: Buffer): { valid: boolean; error?: string } {
    try {
      const stream = Stream.fromBuffer(buffer);
      if (!Decoder.isFIT(stream)) {
        return { valid: false, error: "File is not a valid FIT file" };
      }

      const decoder = new Decoder(stream);
      if (!decoder.checkIntegrity()) {
        return { valid: false, error: "FIT file integrity check failed" };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }
}
