ALTER TABLE "dataflow"."projects" ADD COLUMN IF NOT EXISTS "mcp_enabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE "dataflow"."projects" p SET "mcp_enabled" = true
WHERE EXISTS (
  SELECT 1 FROM "dataflow"."diagrams" d WHERE d."project_id" = p."id" AND d."mcp_enabled" = true
);
--> statement-breakpoint
ALTER TABLE "dataflow"."diagrams" DROP COLUMN IF EXISTS "mcp_enabled";
