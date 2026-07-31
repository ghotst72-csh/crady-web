// Read-only backup of every table this migration/importer will touch, via the
// public anon key (same access every page on crady.net already uses — safe,
// no elevated credentials). Dumps full contents + row counts before any
// schema change or write, per the approved safety checklist.
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "fs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const stamp = process.argv[2] || "backup";
const dir = "C:\\CRADY\\backups";
mkdirSync(dir, { recursive: true });

const summary = {};

for (const table of ["etfs", "distributions"]) {
  let all = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase.from(table).select("*").range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  const path = `${dir}\\${stamp}_${table}.json`;
  writeFileSync(path, JSON.stringify(all, null, 2));
  summary[table] = { rowCount: all.length, path };
  console.log(`${table}: ${all.length} rows backed up -> ${path}`);
}

writeFileSync(`${dir}\\${stamp}_summary.json`, JSON.stringify(summary, null, 2));
console.log("\nSummary:", JSON.stringify(summary, null, 2));
