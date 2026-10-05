import { db, client } from "./client";
import { users, verificationTokens, workspaces } from "./schema";

const confirmed = process.argv.includes("--yes");
if (!confirmed) {
  console.error("Refusing to wipe users without --yes");
  console.error("Usage: pnpm db:wipe-users -- --yes");
  process.exit(1);
}

const deleted = await db.delete(users).returning({ id: users.id, email: users.email });
await db.delete(verificationTokens);
await db.delete(workspaces);

console.log(`Wiped ${deleted.length} user(s). Cascaded accounts/sessions/memberships/owned projects.`);
console.log("Also cleared verification tokens and workspaces.");
for (const row of deleted) {
  console.log(` - ${row.email ?? row.id}`);
}

await client.end();
