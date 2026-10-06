ALTER TABLE "dataflow"."users" ADD COLUMN IF NOT EXISTS "mcp_token_hash" text;
--> statement-breakpoint
ALTER TABLE "dataflow"."users" ADD COLUMN IF NOT EXISTS "mcp_token_created_at" timestamp;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_mcp_token_hash_unique" ON "dataflow"."users" ("mcp_token_hash");
