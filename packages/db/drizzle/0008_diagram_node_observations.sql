CREATE TABLE IF NOT EXISTS "dataflow"."diagram_node_observations" (
  "diagram_id" text NOT NULL REFERENCES "dataflow"."diagrams"("id") ON DELETE cascade,
  "node_id" text NOT NULL,
  "status" text NOT NULL,
  "checked_at" timestamp NOT NULL DEFAULT now(),
  "source" text NOT NULL DEFAULT 'external',
  "message" text,
  "stale_after_sec" integer NOT NULL DEFAULT 300,
  PRIMARY KEY ("diagram_id", "node_id")
);
CREATE INDEX IF NOT EXISTS "diagram_node_observations_diagram_checked_idx"
  ON "dataflow"."diagram_node_observations" ("diagram_id", "checked_at" DESC);
