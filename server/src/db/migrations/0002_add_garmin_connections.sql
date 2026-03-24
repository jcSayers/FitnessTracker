-- Migration: Add garmin_connections table for OAuth 1.0a token storage
CREATE TABLE IF NOT EXISTS "garmin_connections" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"             uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "garmin_user_id"      varchar(255) NOT NULL,
  "access_token"        text NOT NULL,
  "access_token_secret" text NOT NULL,
  "connected_at"        timestamptz DEFAULT now(),
  "last_activity_at"    timestamptz,
  "created_at"          timestamptz DEFAULT now(),
  "updated_at"          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_garmin_connections_user_id"        ON "garmin_connections"("user_id");
CREATE INDEX IF NOT EXISTS "idx_garmin_connections_garmin_user_id" ON "garmin_connections"("garmin_user_id");
