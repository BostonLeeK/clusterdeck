CREATE TABLE IF NOT EXISTS "dataflow"."users" (
  "id" text PRIMARY KEY,
  "name" text,
  "email" text UNIQUE,
  "email_verified" timestamp,
  "image" text,
  "password_hash" text
);

CREATE TABLE IF NOT EXISTS "dataflow"."accounts" (
  "user_id" text NOT NULL REFERENCES "dataflow"."users"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "provider" text NOT NULL,
  "provider_account_id" text NOT NULL,
  "refresh_token" text,
  "access_token" text,
  "expires_at" integer,
  "token_type" text,
  "scope" text,
  "id_token" text,
  "session_state" text,
  PRIMARY KEY ("provider", "provider_account_id")
);

CREATE TABLE IF NOT EXISTS "dataflow"."sessions" (
  "session_token" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "dataflow"."users"("id") ON DELETE CASCADE,
  "expires" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "dataflow"."verification_tokens" (
  "identifier" text NOT NULL,
  "token" text NOT NULL,
  "expires" timestamp NOT NULL,
  PRIMARY KEY ("identifier", "token")
);

CREATE TABLE IF NOT EXISTS "dataflow"."workspaces" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "dataflow"."workspace_members" (
  "workspace_id" text NOT NULL REFERENCES "dataflow"."workspaces"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "dataflow"."users"("id") ON DELETE CASCADE,
  "role" text NOT NULL,
  PRIMARY KEY ("workspace_id", "user_id")
);

CREATE TABLE IF NOT EXISTS "dataflow"."projects" (
  "id" text PRIMARY KEY,
  "workspace_id" text REFERENCES "dataflow"."workspaces"("id") ON DELETE SET NULL,
  "owner_id" text NOT NULL REFERENCES "dataflow"."users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "kind" text NOT NULL DEFAULT 'personal',
  "link_access" text NOT NULL DEFAULT 'none',
  "share_token" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "deleted_at" timestamp
);

CREATE TABLE IF NOT EXISTS "dataflow"."project_members" (
  "project_id" text NOT NULL REFERENCES "dataflow"."projects"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "dataflow"."users"("id") ON DELETE CASCADE,
  "role" text NOT NULL,
  PRIMARY KEY ("project_id", "user_id")
);

CREATE TABLE IF NOT EXISTS "dataflow"."project_invites" (
  "id" text PRIMARY KEY,
  "project_id" text NOT NULL REFERENCES "dataflow"."projects"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "role" text NOT NULL,
  "token" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "dataflow"."project_tags" (
  "id" text PRIMARY KEY,
  "project_id" text NOT NULL REFERENCES "dataflow"."projects"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "color" text NOT NULL DEFAULT '#818cf8'
);

CREATE TABLE IF NOT EXISTS "dataflow"."diagrams" (
  "id" text PRIMARY KEY,
  "project_id" text NOT NULL REFERENCES "dataflow"."projects"("id") ON DELETE CASCADE,
  "parent_diagram_id" text,
  "parent_node_id" text,
  "name" text NOT NULL,
  "ydoc_state" bytea,
  "snapshot" jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "projects_owner_idx" ON "dataflow"."projects" ("owner_id");
CREATE INDEX IF NOT EXISTS "projects_share_token_idx" ON "dataflow"."projects" ("share_token");
CREATE INDEX IF NOT EXISTS "diagrams_project_idx" ON "dataflow"."diagrams" ("project_id");
