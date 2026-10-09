CREATE TABLE IF NOT EXISTS "dataflow"."diagram_history" (
  "id" text PRIMARY KEY NOT NULL,
  "diagram_id" text NOT NULL REFERENCES "dataflow"."diagrams"("id") ON DELETE cascade,
  "project_id" text NOT NULL REFERENCES "dataflow"."projects"("id") ON DELETE cascade,
  "user_id" text REFERENCES "dataflow"."users"("id") ON DELETE set null,
  "label" text NOT NULL,
  "snapshot" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "diagram_history_diagram_created_idx"
  ON "dataflow"."diagram_history" ("diagram_id", "created_at" DESC);
