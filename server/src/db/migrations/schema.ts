import { pgTable, index, foreignKey, uuid, varchar, text, jsonb, integer, boolean, timestamp, unique } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const workoutTemplates = pgTable("workout_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	exercises: jsonb().default([]).notNull(),
	estimatedDuration: integer("estimated_duration"),
	difficulty: varchar({ length: 50 }).default('BEGINNER'),
	category: varchar({ length: 50 }).default('MIXED'),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	localId: varchar("local_id", { length: 255 }),
}, (table) => [
	index("idx_workout_templates_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_workout_templates_local_id").using("btree", table.localId.asc().nullsLast().op("text_ops")),
	index("idx_workout_templates_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "workout_templates_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const workoutInstances = pgTable("workout_instances", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	templateId: uuid("template_id"),
	templateName: varchar("template_name", { length: 255 }),
	startTime: timestamp("start_time", { withTimezone: true, mode: 'string' }).notNull(),
	endTime: timestamp("end_time", { withTimezone: true, mode: 'string' }),
	totalDuration: integer("total_duration"),
	sets: jsonb().default([]).notNull(),
	status: varchar({ length: 50 }).default('IN_PROGRESS'),
	notes: text(),
	location: varchar({ length: 255 }),
	completedExercises: integer("completed_exercises").default(0),
	totalExercises: integer("total_exercises").default(0),
	heartRateAvg: integer("heart_rate_avg"),
	heartRateMax: integer("heart_rate_max"),
	cadenceAvg: integer("cadence_avg"),
	distance: integer(),
	elevationGain: integer("elevation_gain"),
	calories: integer(),
	externalSource: varchar("external_source", { length: 50 }),
	externalId: varchar("external_id", { length: 255 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	localId: varchar("local_id", { length: 255 }),
}, (table) => [
	index("idx_workout_instances_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_workout_instances_external_id").using("btree", table.externalId.asc().nullsLast().op("text_ops")),
	index("idx_workout_instances_local_id").using("btree", table.localId.asc().nullsLast().op("text_ops")),
	index("idx_workout_instances_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_workout_instances_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [workoutTemplates.id],
			name: "workout_instances_template_id_workout_templates_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "workout_instances_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const exerciseLogs = pgTable("exercise_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	exerciseId: uuid("exercise_id"),
	exerciseName: varchar("exercise_name", { length: 255 }).notNull(),
	date: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	sets: jsonb().default([]).notNull(),
	personalRecord: jsonb("personal_record"),
	heartRateAvg: integer("heart_rate_avg"),
	heartRateMax: integer("heart_rate_max"),
	heartRateMin: integer("heart_rate_min"),
	cadenceAvg: integer("cadence_avg"),
	cadenceMax: integer("cadence_max"),
	speedAvg: integer("speed_avg"),
	speedMax: integer("speed_max"),
	powerAvg: integer("power_avg"),
	powerMax: integer("power_max"),
	elevationGain: integer("elevation_gain"),
	elevationLoss: integer("elevation_loss"),
	gpsData: jsonb("gps_data"),
	externalSource: varchar("external_source", { length: 50 }),
	externalId: varchar("external_id", { length: 255 }),
	externalData: jsonb("external_data"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	localId: varchar("local_id", { length: 255 }),
}, (table) => [
	index("idx_exercise_logs_date").using("btree", table.date.asc().nullsLast().op("timestamptz_ops")),
	index("idx_exercise_logs_exercise_name").using("btree", table.exerciseName.asc().nullsLast().op("text_ops")),
	index("idx_exercise_logs_external_id").using("btree", table.externalId.asc().nullsLast().op("text_ops")),
	index("idx_exercise_logs_local_id").using("btree", table.localId.asc().nullsLast().op("text_ops")),
	index("idx_exercise_logs_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "exercise_logs_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const syncStatus = pgTable("sync_status", {
	userId: uuid("user_id").primaryKey().notNull(),
	lastSyncTime: timestamp("last_sync_time", { withTimezone: true, mode: 'string' }),
	syncedTemplates: integer("synced_templates").default(0),
	syncedInstances: integer("synced_instances").default(0),
	syncedLogs: integer("synced_logs").default(0),
	status: varchar({ length: 50 }).default('PENDING'),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_sync_status_updated_at").using("btree", table.updatedAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sync_status_user_id_users_id_fk"
		}).onDelete("cascade"),
]);
