import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const DEFAULT_DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:5432/dataflow";

const url = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
const schemaName = process.env.DATABASE_SCHEMA ?? "dataflow";
const sql = postgres(url, { max: 1 });
const dir = join(dirname(fileURLToPath(import.meta.url)), "../drizzle");

await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
await sql.unsafe(`CREATE TABLE IF NOT EXISTS "${schemaName}"._migrations (
  name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
)`);

const files = readdirSync(dir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

for (const file of files) {
  const applied = await sql.unsafe(
    `SELECT name FROM "${schemaName}"._migrations WHERE name = $1`,
    [file],
  );
  if (applied.length > 0) {
    continue;
  }
  const body = readFileSync(join(dir, file), "utf8").replaceAll('"dataflow"', `"${schemaName}"`);
  await sql.begin(async (tx) => {
    await tx.unsafe(body);
    await tx.unsafe(`INSERT INTO "${schemaName}"._migrations (name) VALUES ($1)`, [file]);
  });
  console.log(`applied ${file}`);
}

await sql.end();
console.log("migrations complete");
