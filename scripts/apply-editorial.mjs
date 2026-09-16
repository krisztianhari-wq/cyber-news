// Merge an externally produced editorial file into a day file.
// Usage: node scripts/apply-editorial.mjs YYYY-MM-DD path/to/editorial.json
// editorial.json = { "items": [{ "id", "category", "summary", "relevance", "tags" }], "post": "..." }
// Everything in the editorial file is validated and sanitised here; the site never trusts it blindly.
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const CONFIG = JSON.parse(await fs.readFile(path.join(ROOT, "config/feeds.json"), "utf8"));
const CATEGORY_IDS = new Set(CONFIG.categories.map((c) => c.id));
const MAX_PER_CATEGORY = 10;

const [date, editorialPath] = process.argv.slice(2);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") || !editorialPath) {
  console.error("usage: node scripts/apply-editorial.mjs YYYY-MM-DD editorial.json");
  process.exit(2);
}
const dayPath = path.join(ROOT, "public/data/days", `${date}.json`);
const day = JSON.parse(await fs.readFile(dayPath, "utf8"));
const ed = JSON.parse(await fs.readFile(editorialPath, "utf8"));

const clean = (s, n) => String(s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const byId = new Map();
for (const r of Array.isArray(ed.items) ? ed.items : []) {
  if (typeof r?.id !== "string") continue;
  const rel = Math.round(Number(r.relevance));
  byId.set(r.id, {
    category: CATEGORY_IDS.has(r.category) ? r.category : null,
    summary: clean(r.summary, 320),
    relevance: rel >= 1 && rel <= 5 ? rel : null,
    tags: (Array.isArray(r.tags) ? r.tags : []).slice(0, 3).map((t) => clean(t, 24).toLowerCase()).filter(Boolean),
  });
}

let matched = 0;
const items = day.items.map((it) => {
  const r = byId.get(it.id);
  if (!r) return it;
  matched++;
  return {
    ...it,
    category: r.category ?? it.category,
    summary: r.summary || it.summary,
    relevance: r.relevance ?? it.relevance,
    tags: r.tags.length ? r.tags : it.tags,
  };
});

const sorted = items.filter((it) => it.relevance >= 2).sort((a, b) => b.relevance - a.relevance || b.published.localeCompare(a.published));
const capped = [];
const count = {};
for (const it of sorted) if ((count[it.category] = (count[it.category] ?? 0) + 1) <= MAX_PER_CATEGORY) capped.push(it);

const post = clean(ed.post, 1500);
const out = {
  ...day,
  editorial: "done",
  model: typeof ed.model === "string" ? clean(ed.model, 60) : day.model ?? "claude-code-routine",
  itemCount: capped.length,
  items: capped,
  post: post || day.post,
};
await fs.writeFile(dayPath, JSON.stringify(out, null, 1));
await fs.writeFile(path.join(ROOT, "posts", `${date}.md`), `# Social post – ${date}\n\n${out.post}\n`);
console.log(`[editorial] ${matched}/${day.items.length} items updated, ${capped.length} kept -> ${path.relative(ROOT, dayPath)}`);
