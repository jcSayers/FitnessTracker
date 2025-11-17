CREATE TABLE "exercise_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"exercise_id" uuid,
	"exercise_name" varchar(255) NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"sets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"personal_record" jsonb,
	"heart_rate_avg" integer,
	"heart_rate_max" integer,
	"heart_rate_min" integer,
	"cadence_avg" integer,
	"cadence_max" integer,
	"speed_avg" integer,
	"speed_max" integer,
	"power_avg" integer,
	"power_max" integer,
	"elevation_gain" integer,
	"elevation_loss" integer,
	"gps_data" jsonb,
	"external_source" varchar(50),
	"external_id" varchar(255),
	"external_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sync_status" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"last_sync_time" timestamp with time zone,
	"synced_templates" integer DEFAULT 0,
	"synced_instances" integer DEFAULT 0,
	"synced_logs" integer DEFAULT 0,
	"status" varchar(50) DEFAULT 'PENDING',
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workout_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"template_id" uuid,
	"template_name" varchar(255),
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone,
	"total_duration" integer,
	"sets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(50) DEFAULT 'IN_PROGRESS',
	"notes" text,
	"location" varchar(255),
	"completed_exercises" integer DEFAULT 0,
	"total_exercises" integer DEFAULT 0,
	"heart_rate_avg" integer,
	"heart_rate_max" integer,
	"cadence_avg" integer,
	"distance" integer,
	"elevation_gain" integer,
	"calories" integer,
	"external_source" varchar(50),
	"external_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workout_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"exercises" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"estimated_duration" integer,
	"difficulty" varchar(50) DEFAULT 'BEGINNER',
	"category" varchar(50) DEFAULT 'MIXED',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "exercise_logs" ADD CONSTRAINT "exercise_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_status" ADD CONSTRAINT "sync_status_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_instances" ADD CONSTRAINT "workout_instances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_instances" ADD CONSTRAINT "workout_instances_template_id_workout_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."workout_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_exercise_logs_user_id" ON "exercise_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_exercise_logs_date" ON "exercise_logs" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_exercise_logs_exercise_name" ON "exercise_logs" USING btree ("exercise_name");--> statement-breakpoint
CREATE INDEX "idx_exercise_logs_external_id" ON "exercise_logs" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "idx_sync_status_updated_at" ON "sync_status" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_workout_instances_user_id" ON "workout_instances" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_workout_instances_status" ON "workout_instances" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_workout_instances_created_at" ON "workout_instances" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_workout_instances_external_id" ON "workout_instances" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "idx_workout_templates_user_id" ON "workout_templates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_workout_templates_created_at" ON "workout_templates" USING btree ("created_at");