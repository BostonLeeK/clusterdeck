import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/dataflow";

const client = postgres(url, { max: 10 });
export const db = drizzle(client, { schema });
export { client };
