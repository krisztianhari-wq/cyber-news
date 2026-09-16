// Merge all day files into public/data/index.json (list of days + compact search corpus).
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const DAYS_DIR = path.join(ROOT, "public/data/days");
await fs.mkdir(DAYS_DIR, { recursive: true });
const files = (await fs.readdir(DAYS_DIR)).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().reverse();

const days = [];
const items = [];
for (const f of files) {
  const d = JSON.parse(await fs.readFile(path.join(DAYS_DIR, f), "utf8"));
  days.push({ date: d.date, itemCount: d.itemCount });
  for (const it of d.items) items.push({ ...it, date: d.date });
}
await fs.writeFile(path.join(ROOT, "public/data/index.json"), JSON.stringify({ builtAt: new Date().toISOString(), days, items }));
console.log(`[index] ${days.length} days, ${items.length} items`);
