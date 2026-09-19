# Handoff — Yettel Cyber Digest

Complete context for continuing this project in another agent (Codex etc.). Written 2026-09-19.

## 1. Goal
A public, secure, zero-backend website that every morning collects cybersecurity news into six categories, summarises them, keeps a searchable archive, looks like Yettel, and produces a ready-to-paste social media post **for the owner only** (never auto-posted, never published).

Categories: AI Security News & Trends · Global Security News (non-cyber, high level) · Global Cybersecurity Incidents & Threats · Vulnerabilities, Malware & TTPs · Policy, Regulation & Governance (EU focused) · EU & European Country Threat Landscape.

## 2. Architecture
```
config/feeds.json ──► scripts/collect.mjs ──► public/data/days/DATE.json (editorial: pending)
                                                     │
      Claude Desktop scheduled task (08:00 Budapest) │  reads day file, writes work/editorial.json
                                                     ▼
                    scripts/apply-editorial.mjs ──► day file (editorial: done), posts/DATE.md (local only)
                                                     │
                    scripts/daily.sh publish ──► npm run build ──► git commit + push (day file + seen store)
                                                     │
                    GitHub Actions (on push) ──► build ──► GitHub Pages
                    GitHub Actions cron 08:30 UTC ──► heuristic fallback only if no file for today
```
- Sources: ~44. Plain RSS/Atom; `type: "html"` listing pages for sites without feeds (ENISA, IAPP, BSI, NKI) with URL-regex matching and a committed first-seen store (`data/seen-urls.json`) because listing pages have no dates; `via: "google-news"` RSS proxies for sites that block feeds (Reuters, AP, Euractiv), publisher suffix stripped from titles.
- Collector safety: 20 s fetch timeout, 5 MB cap, HTML stripped, entities decoded, only http(s) URLs, tracking params removed, URL + normalised-title dedupe, 12 items/feed, 120 candidates max, per-category caps.
- Site: Vite + React + TypeScript, MiniSearch full-text search over the whole archive (title, originalTitle, summary, source, tags), day selector, sticky category chips, "Top stories" = relevance 5, editorial list with relevance dots and tags, sources list in footer, dark mode, mobile layout. GoatCounter view counter in the top bar (site code `hadzsy`, no cookies; CSP widened only for gc.zgo.at and hadzsy.goatcounter.com).
- Day JSON fields: `date, generatedAt, model, editorial (pending|heuristic|done), itemCount, feeds[], items[]`; item: `id, title, originalTitle?, url, source, published, category, summary, relevance, tags[]`. No post field.

## 3. Production editorial: Claude Desktop scheduled task
Task id `cyber-news-daily-editorial`, cron `0 8 * * *` local (fires ~08:05). Prompt: `docs/editorial-task-prompt.md`. It runs only `bash /Users/KHari/Claude_code/cyber-news/scripts/daily.sh prepare|publish` and writes `work/editorial.json`; these are allow-listed in `/Users/KHari/Claude_code/.claude/settings.json`:
```json
{"permissions":{"allow":[
 "Bash(bash /Users/KHari/Claude_code/cyber-news/scripts/daily.sh *)",
 "Write(//Users/KHari/Claude_code/cyber-news/work/**)",
 "Edit(//Users/KHari/Claude_code/cyber-news/work/**)",
 "Read(//Users/KHari/Claude_code/cyber-news/**)"]}}
```
The task's final report (in Hungarian) contains the kept/dropped counts, top 3 headlines and the full social post. The Mac must be awake with the Claude app open at 08:00; otherwise it runs at next launch, and the Actions safety net publishes a heuristic edition at 10:30 CEST which the task later overrides.

**If porting the editorial step to Codex or another agent:** reproduce the prompt in `docs/editorial-task-prompt.md`; the interface is only the two `daily.sh` commands and the editorial JSON contract in `AGENTS.md`.

## 4. Decisions and constraints (do not re-open without the owner)
- No personal Anthropic API key, no GitHub↔Claude account connection (company policy). Cloud routines were therefore rejected; local scheduled task chosen.
- Social post: private only, delivered in the task report; removed from the site and repo on 2026-09-16.
- View counter: removed on 2026-09-16, re-added (GoatCounter) on 2026-09-17 at the owner's request, moved to the top bar on 2026-09-19.
- Design: airy editorial layout (2026-09-16), compact hero with date and lead side by side (2026-09-16).
- Non-English headlines (HU/DE/FR) are translated to English by the editorial; original kept as `originalTitle` (2026-09-17).
- Cross-source duplicates: one story per day, primary source > largest outlet > most detailed (2026-09-19).
- Branch protection not enabled on purpose (the bots push straight to `main`); optionally block force-push/deletion only.
- README stays minimal (owner's request).

## 5. Environment quirks
- Node lives in `/Users/KHari/Claude_code/gue-dive-planner/.node/bin` (v24), not on PATH.
- No `gh` CLI; github.com and github.io are blocked in the Claude in-app browser; check via `api.github.com` with curl.
- Port 22 to github.com blocked → remote is `ssh://git@ssh.github.com:443/krisztianhari-wq/cyber-news.git`.
- Dev server: `npm run dev -- --port 5174`.

## 6. Known gaps / ideas
- HTML-scraped NKI anchors include lead text in the title (the editorial translation cleans it up).
- Google News proxy links go through news.google.com redirects.
- Feed list tuning, relevance calibration and per-category caps are the main levers if the edition feels too long/short.
