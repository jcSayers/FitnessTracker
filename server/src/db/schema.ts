import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Workout Templates table
export const workoutTemplates = pgTable(
  "workout_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    exercises: jsonb("exercises").notNull().default([]), // Array of Exercise objects
    estimated_duration: integer("estimated_duration"), // in seconds
    difficulty: varchar("difficulty", {
      length: 50,
      enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
    }).default("BEGINNER"),
    category: varchar("category", {
      length: 50,
      enum: ["STRENGTH", "CARDIO", "HIIT", "YOGA", "SPORTS", "MIXED"],
    }).default("MIXED"),
    is_active: boolean("is_active").default(true),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_workout_templates_user_id").on(table.user_id),
    index("idx_workout_templates_created_at").on(table.created_at),
  ]
);

// Workout Instances table
export const workoutInstances = pgTable(
  "workout_instances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    template_id: uuid("template_id").references(() => workoutTemplates.id, {
      onDelete: "set null",
    }),
    template_name: varchar("template_name", { length: 255 }),
    start_time: timestamp("start_time", { withTimezone: true }).notNull(),
    end_time: timestamp("end_time", { withTimezone: true }),
    total_duration: integer("total_duration"), // in seconds
    sets: jsonb("sets").notNull().default([]), // Array of WorkoutSet objects
    status: varchar("status", {
      length: 50,
      enum: ["IN_PROGRESS", "COMPLETED", "PAUSED", "CANCELLED"],
    }).default("IN_PROGRESS"),
    notes: text("notes"),
    location: varchar("location", { length: 255 }),
    completed_exercises: integer("completed_exercises").default(0),
    total_exercises: integer("total_exercises").default(0),
    // Garmin metrics for entire activity
    heart_rate_avg: integer("heart_rate_avg"), // Average heart rate (bpm)
    heart_rate_max: integer("heart_rate_max"), // Max heart rate (bpm)
    cadence_avg: integer("cadence_avg"), // Average cadence
    distance: integer("distance"), // Total distance (meters)
    elevation_gain: integer("elevation_gain"), // Total elevation gain (meters)
    calories: integer("calories"), // Estimated calories burned
    external_source: varchar("external_source", { length: 50 }), // 'garmin', 'strava', etc.
    external_id: varchar("external_id", { length: 255 }), // External ID from Garmin
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_workout_instances_user_id").on(table.user_id),
    index("idx_workout_instances_status").on(table.status),
    index("idx_workout_instances_created_at").on(table.created_at),
    index("idx_workout_instances_external_id").on(table.external_id),
  ]
);

// Exercise Logs table
export const exerciseLogs = pgTable(
  "exercise_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    exercise_id: uuid("exercise_id"),
    exercise_name: varchar("exercise_name", { length: 255 }).notNull(),
    date: timestamp("date", { withTimezone: true }).notNull(),
    sets: jsonb("sets").notNull().default([]), // Array of set data
    personal_record: jsonb("personal_record"), // Best performance data
    // Garmin metrics
    heart_rate_avg: integer("heart_rate_avg"), // Average heart rate (bpm)
    heart_rate_max: integer("heart_rate_max"), // Max heart rate (bpm)
    heart_rate_min: integer("heart_rate_min"), // Min heart rate (bpm)
    cadence_avg: integer("cadence_avg"), // Average cadence (rpm/spm)
    cadence_max: integer("cadence_max"), // Max cadence
    speed_avg: integer("speed_avg"), // Average speed (m/s * 1000 for precision)
    speed_max: integer("speed_max"), // Max speed
    power_avg: integer("power_avg"), // Average power (watts)
    power_max: integer("power_max"), // Max power
    elevation_gain: integer("elevation_gain"), // Total elevation gain (meters)
    elevation_loss: integer("elevation_loss"), // Total elevation loss (meters)
    gps_data: jsonb("gps_data"), // Array of {timestamp, lat, lng, elevation}
    external_source: varchar("external_source", { length: 50 }), // 'garmin', 'strava', etc.
    external_id: varchar("external_id", { length: 255 }), // External ID from Garmin
    external_data: jsonb("external_data"), // Raw Garmin data for reference
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_exercise_logs_user_id").on(table.user_id),
    index("idx_exercise_logs_date").on(table.date),
    index("idx_exercise_logs_exercise_name").on(table.exercise_name),
    index("idx_exercise_logs_external_id").on(table.external_id),
  ]
);

// Sync Status table
export const syncStatus = pgTable(
  "sync_status",
  {
    user_id: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    last_sync_time: timestamp("last_sync_time", { withTimezone: true }),
    synced_templates: integer("synced_templates").default(0),
    synced_instances: integer("synced_instances").default(0),
    synced_logs: integer("synced_logs").default(0),
    status: varchar("status", {
      length: 50,
      enum: ["SUCCESS", "ERROR", "PENDING"],
    }).default("PENDING"),
    error_message: text("error_message"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("idx_sync_status_updated_at").on(table.updated_at)]
);

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  templates: many(workoutTemplates),
  instances: many(workoutInstances),
  logs: many(exerciseLogs),
  syncStatus: one(syncStatus),
}));

export const workoutTemplatesRelations = relations(
  workoutTemplates,
  ({ one, many }) => ({
    user: one(users, {
      fields: [workoutTemplates.user_id],
      references: [users.id],
    }),
    instances: many(workoutInstances),
  })
);

export const workoutInstancesRelations = relations(
  workoutInstances,
  ({ one }) => ({
    user: one(users, {
      fields: [workoutInstances.user_id],
      references: [users.id],
    }),
    template: one(workoutTemplates, {
      fields: [workoutInstances.template_id],
      references: [workoutTemplates.id],
    }),
  })
);

export const exerciseLogsRelations = relations(exerciseLogs, ({ one }) => ({
  user: one(users, {
    fields: [exerciseLogs.user_id],
    references: [users.id],
  }),
}));

export const syncStatusRelations = relations(syncStatus, ({ one }) => ({
  user: one(users, {
    fields: [syncStatus.user_id],
    references: [users.id],
  }),
}));
