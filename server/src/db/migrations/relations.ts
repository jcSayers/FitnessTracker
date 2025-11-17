import { relations } from "drizzle-orm/relations";
import { users, workoutTemplates, workoutInstances, exerciseLogs, syncStatus } from "./schema";

export const workoutTemplatesRelations = relations(workoutTemplates, ({one, many}) => ({
	user: one(users, {
		fields: [workoutTemplates.userId],
		references: [users.id]
	}),
	workoutInstances: many(workoutInstances),
}));

export const usersRelations = relations(users, ({many}) => ({
	workoutTemplates: many(workoutTemplates),
	workoutInstances: many(workoutInstances),
	exerciseLogs: many(exerciseLogs),
	syncStatuses: many(syncStatus),
}));

export const workoutInstancesRelations = relations(workoutInstances, ({one}) => ({
	workoutTemplate: one(workoutTemplates, {
		fields: [workoutInstances.templateId],
		references: [workoutTemplates.id]
	}),
	user: one(users, {
		fields: [workoutInstances.userId],
		references: [users.id]
	}),
}));

export const exerciseLogsRelations = relations(exerciseLogs, ({one}) => ({
	user: one(users, {
		fields: [exerciseLogs.userId],
		references: [users.id]
	}),
}));

export const syncStatusRelations = relations(syncStatus, ({one}) => ({
	user: one(users, {
		fields: [syncStatus.userId],
		references: [users.id]
	}),
}));