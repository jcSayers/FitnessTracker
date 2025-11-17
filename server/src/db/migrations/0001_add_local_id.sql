-- Add local_id column to workout_templates to store original offline database IDs
ALTER TABLE "workout_templates" ADD COLUMN "local_id" varchar(255);
--> statement-breakpoint
-- Create index on local_id for faster lookups
CREATE INDEX "idx_workout_templates_local_id" ON "workout_templates" USING btree ("local_id");
--> statement-breakpoint
-- Add local_id column to workout_instances to store original offline database IDs
ALTER TABLE "workout_instances" ADD COLUMN "local_id" varchar(255);
--> statement-breakpoint
-- Create index on local_id for faster lookups
CREATE INDEX "idx_workout_instances_local_id" ON "workout_instances" USING btree ("local_id");
--> statement-breakpoint
-- Add local_id column to exercise_logs to store original offline database IDs
ALTER TABLE "exercise_logs" ADD COLUMN "local_id" varchar(255);
--> statement-breakpoint
-- Create index on local_id for faster lookups
CREATE INDEX "idx_exercise_logs_local_id" ON "exercise_logs" USING btree ("local_id");
