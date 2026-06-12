import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "./db.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const ddl = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await sql.unsafe(ddl);
  console.log("[migrate] schema applied");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
