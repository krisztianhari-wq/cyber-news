# Yettel Cyber Digest

Automated daily cybersecurity briefing. A GitHub Actions job collects public RSS/Atom feeds every morning, has Claude classify and summarise the items into six categories, stores the day as a JSON file in the repo (the archive), and deploys a static, searchable site to GitHub Pages. A ready-to-paste social media post is generated too, but it stays **local only** (`posts/` is gitignored, never published or posted automatically) and is handed to the editor in the scheduled task's final report.

## Categories
AI Security News & Trends · Global Security News (non-cyber) · Global Cybersecurity Incidents & Threats · Vulnerabilities, Malware & TTPs · Policy, Regulation & Governance (EU) · EU & European Country Threat Landscape

## Layout
- `config/feeds.json` – curated source list per category: RSS/Atom feeds, `"type": "html"` listing pages for sites without feeds (ENISA, BSI, NKI, IAPP; matched by URL regex, first-seen tracking in `data/seen-urls.json`), and Google News RSS proxies (`"via": "google-news"`) for sites that block feeds (Reuters, AP, Euractiv)
- `scripts/collect.mjs` – fetch, filter (last 30 h), dedupe, sanitise, Claude classify + summarise, write `public/data/days/YYYY-MM-DD.json` and `posts/YYYY-MM-DD.md`
- `scripts/build-index.mjs` – merges all days into `public/data/index.json` (client-side search corpus)
- `src/` – Vite + React site, Yettel brand (navy / lime / ice), MiniSearch full-text search over the whole archive
- `.github/workflows/daily.yml` – 04:00 UTC cron: collect → commit → build → deploy Pages

## Run locally
```bash
npm install
npm run collect -- --no-llm   # heuristic summaries, no API key needed
npm run dev
```
With `ANTHROPIC_API_KEY` set, `npm run collect` uses Claude (`claude-opus-5`, structured JSON output, refusal fallbacks enabled).

## Setup on GitHub
1. Create repo, push `main`.
2. Settings → Pages → Source: **GitHub Actions**.
3. Settings → Secrets and variables → Actions → new secret `ANTHROPIC_API_KEY`.
4. Actions → *Daily digest* → *Run workflow* for the first edition.

## Security notes
- Static site only: no server, no database, no auth, no user input reaches a backend.
- Feed content is untrusted: HTML is stripped, only `http(s)` links are rendered, text is never injected as HTML; the LLM prompt treats items as data and returns schema-validated JSON without tools.
- Strict CSP meta tag, `no-referrer`, `rel="noopener noreferrer nofollow"` on outbound links.
- Dependabot watches npm and Actions.

## View counter (optional)
The site can show total page views via [GoatCounter](https://www.goatcounter.com) (privacy-friendly, no cookies, free for non-commercial use). Create a site there, then add a repository **variable** `GOATCOUNTER_CODE` (Settings → Secrets and variables → Actions → Variables) with your site code (`CODE` in `CODE.goatcounter.com`). The build injects the counter script and widens the CSP only for that host; without the variable nothing is loaded.
