CREATE TABLE IF NOT EXISTS "dataflow"."workspace_invites" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL,
  "email" text NOT NULL,
  "role" text DEFAULT 'member' NOT NULL,
  "token" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dataflow"."workspace_invites" ADD CONSTRAINT "workspace_invites_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "dataflow"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
