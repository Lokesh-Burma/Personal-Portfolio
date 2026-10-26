import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import console from "node:console";
import process from "node:process";
import pg from "pg";

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const dir = path.join(process.cwd(), "database", "migrations");
const files = (await readdir(dir))
  .filter((file) => file.endsWith(".sql"))
  .sort();

await pool.query(
  "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
);
const applied = new Set(
  (await pool.query("select name from schema_migrations")).rows.map(
    (row) => row.name,
  ),
);

for (const file of files) {
  if (applied.has(file)) continue;
  const sql = await readFile(path.join(dir, file), "utf8");
  await pool.query("begin");
  try {
    await pool.query(sql);
    await pool.query("insert into schema_migrations (name) values ($1)", [
      file,
    ]);
    await pool.query("commit");
    console.log("applied", file);
  } catch (error) {
    await pool.query("rollback");
    throw error;
  }
}

await pool.end();
