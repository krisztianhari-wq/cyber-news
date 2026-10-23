# sadrobot Cyber Digest – fejlesztői jegyzet

Napi, automatikus kiberbiztonsági hírösszefoglaló statikus oldalként (RSS/HTML/Google News → napi JSON → AI-szerkesztés → Vite/React, MiniSearch archívum-kereső). Az ai-news ebből a kódból készült. Felhasználói leírás: README.md; agent-szabályok és szerkesztői JSON-szerződés: AGENTS.md (gitignored, csak lokálisan).

## Indítás és teszt
- Node nincs a PATH-on: `export PATH=$HOME/Claude_code/gue-dive-planner/.node/bin:$PATH`.
- Dev szerver: launch.json `cyber-news` (port 5174, sadrobot arculat) és `cyber-news-yettel` (port 5178, `VITE_BRAND=yettel`). A README 5173-a a Vite alapértéke.
- `npm run collect -- --no-llm` (heurisztikus mai kiadás), `--keep-all` (minden jelölt, `editorial: "pending"`).
- `node scripts/apply-editorial.mjs <DATE> work/editorial.json`, `npm run build` (index + tsc + vite). Automatikus teszt nincs; a build (tsc) az ellenőrzés.

## Felépítés
- `config/feeds.json` – 6 kategória, 44 forrás. RSS nélküli forrás: HTML-listaoldal (`type: "html"`, first-seen tároló: `data/seen-urls.json`, commitolva) vagy Google News RSS proxy (`via: "google-news"`).
- `scripts/collect.mjs` – gyűjtés (30 órás ablak, 20 s timeout, 5 MB limit, HTML strip, dedupe URL + normalizált cím alapján, max 120 jelölt). A Claude API-ág (`ANTHROPIC_API_KEY`) az éles út, a szerver futtatja.
- `scripts/apply-editorial.mjs` – szerkesztői JSON beolvasztása: max 10 hír/kategória, relevancia ≥ 2, `duplicateOf` eldobva, angol `title` + `originalTitle`, poszt a gitignored `posts/`-ba.
- `scripts/daily.sh prepare|publish <json>` – a nyugdíjazott Desktop-feladat belépési pontja, ma csak kézi vagy tartalék futtatáshoz.
- `src/brand.ts` + `vite.config.ts` `brand` plugin – build-idejű `VITE_BRAND`. `src/ViewCounter.tsx` – azonos originű `/_views.json` (sadrobot Status).
- `docs/HANDOFF.md`, `docs/editorial-task-prompt.md` – gitignored, csak lokálisan.

## Kategóriák
`ai-security`, `global-security` (nem kiber, magas szint), `incidents-threats`, `vulns-malware-ttps`, `policy-regulation` (EU-fókusz), `eu-threat-landscape`.

## Telepítés / kiadás
- Napi folyamat (2026-10-10 óta a SZERVEREN): a `sadrobot-news-editorial.timer` 07:45-kor futtatja a `sadrobot-infra/scripts/news-editorial.sh`-t. Lépései: origin/main → `collect` LLM-mel (Anthropic API, eldobható node-konténer) → a nap-fájlt és a `seen-urls`-t `sadrobot` néven commitolja és pusholja (`editorial: "done"`; ha szabályalapúra esne vissza, nem pushol) → `sync-news.sh --force` buildel és kiszolgál. A push indítja a `.github/workflows/daily.yml`-t (build + GitHub Pages). Hibánál a sadrobot Status riaszt, és e-mail is megy. Teszt a szerveren: `scripts/news-editorial.sh --dry-run`. A helyi Claude Desktop-feladat nyugdíjazva és kikapcsolva.
- Biztonsági háló: a `daily.yml` cronja 08:30 UTC-kor gyűjt, ha a mai fájl hiányzik. A GitHubon nincs API-kulcs, ezért ez `editorial: "heuristic"` kiadás, amelyet a szerkesztett felülír.
- Két arculat: GitHub Pages (`VITE_BRAND=yettel`) → Yettel Cyber Digest a krisztianhari-wq.github.io/cyber-news címen; változó nélküli build → sadrobot Cyber Digest a cyber.sadrobot.eu címen. A szerver félóránként maga húzza és építi a repót (sadrobot-infra `scripts/sync-news.sh`). Szerverdolgokhoz lásd /deploy-sadrobot skill és sadrobot-infra/SADROBOT-INFRA.md.
- Verzió: nincs kiadási ciklus (`package.json` 0.1.0); ha kell, /release skill.

## Döntések
1. 2026-10-10 óta a szerkesztés a sadrobot szerveren fut Anthropic API-kulccsal (a tulajdonos döntése; a kulcs a szerveren Docker-secret, `secrets/anthropic_api_key`). A GitHubon nincs API-kulcs, nincs Claude-rutin és nincs GitHub↔Claude kapcsolat.
2. A közösségi poszt privát és soha nem posztolódik automatikusan (a tulajdonos kifejezett döntése). Csak `posts/`, a feladat zárójelentése és helyi átadás.
3. Statikus, backend nélkül; a feed-tartalom megbízhatatlan adat (HTML strip, csak http(s) link, szigorú CSP, `no-referrer`).
4. Dedupe-prioritás: elsődleges forrás > legnagyobb médium > legrészletesebb kivonat. Nem angol címnél angol fordítás, az eredeti `originalTitle`-ként marad.
5. Nézettségszámláló: GoatCounter helyett szerveroldali sadrobot Status (süti nélkül); a Pages-buildben nincs számláló.
6. A napi commit csak `public/data/days/*.json` és `data/seen-urls.json`; `posts/`, `work/` soha.

## Buktatók
- A Git-remote SSH a 443-as porton (`ssh://git@ssh.github.com:443/...`), mert a 22-es port a céges hálón tiltott; más repónál is ez a megoldás, ha a push időtúllép.
- A sessiononkénti auto mode nem öröklődik a későbbi ütemezett futásokra; a projekt-settings allow-szabályai igen.
- A github.com és a github.io a Claude böngészőpaneljén blokkolt.
- `daily.sh` `sync()`: `pull --rebase --autostash -X theirs` (ütközésnél a helyi editorial nyer a `daily.yml` safety-net digesttel szemben) + JSON-ellenőrzés; push-hiba után újraszinkronizál és újrapróbál.
