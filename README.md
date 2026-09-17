# Yettel Cyber Digest

Daily cybersecurity briefing, published automatically every morning.

**Live site:** https://krisztianhari-wq.github.io/cyber-news/

## What it does
- Collects news from ~44 public sources (RSS/Atom feeds, HTML news pages, Google News proxies) defined in `config/feeds.json`.
- Classifies and summarises them into six categories: AI Security · Global Security (non-cyber) · Incidents & Threats · Vulnerabilities, Malware & TTPs · Policy & Regulation (EU) · EU Threat Landscape.
- Stores each day as `public/data/days/YYYY-MM-DD.json`; the archive is searchable on the site.
- Static site (Vite + React) deployed to GitHub Pages by `.github/workflows/daily.yml`, which also runs a heuristic fallback collection if no edition exists by 10:30 CEST.

## Local use
```bash
npm install
npm run collect -- --no-llm   # collect today's items
npm run dev                   # preview at http://localhost:5173
```

## Security
- No backend, no database, no user accounts.
- Feed content is treated as untrusted: HTML stripped, only `http(s)` links rendered, strict CSP, `no-referrer`, `noopener` links.
- Summaries are AI-generated; always verify with the linked source.

## View counter
Page views are counted with [GoatCounter](https://www.goatcounter.com) (no cookies, no personal data). The build reads the site code from the repository variable `GOATCOUNTER_CODE`; without it nothing is loaded.
