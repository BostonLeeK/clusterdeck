ALTER TABLE "dataflow"."diagrams" ADD COLUMN IF NOT EXISTS "mcp_enabled" boolean DEFAULT false NOT NULL;
