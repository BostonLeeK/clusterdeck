CREATE TABLE IF NOT EXISTS "dataflow"."health_check_runtime" (
  "diagram_id" text NOT NULL REFERENCES "dataflow"."diagrams"("id") ON DELETE cascade,
  "node_id" text NOT NULL,
  "failure_times" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "last_ok_at" timestamp,
  "last_alert_at" timestamp,
  "last_probe_at" timestamp,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("diagram_id", "node_id")
);
