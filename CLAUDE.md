# sadrobot Cyber Digest – fejlesztői jegyzet

Napi, automatikus kiberbiztonsági hírösszefoglaló statikus oldalként (RSS/HTML/Google News → napi JSON → AI-szerkesztés → Vite/React, MiniSearch archívum-kereső). Az ai-news ebből a kódból készült. Felhasználói leírás: README.md; agent-szabályok és szerkesztői JSON-szerződés: AGENTS.md (gitignored, csak lokálisan).

## Indítás és teszt
- Node nincs a PATH-on: `export PATH=$HOME/Claude_code/gue-dive-planner/.node/bin:$PATH`.
- Dev szerver: launch.json `cyber-news` (port 5174, sadrobot arculat) és `cyber-news-yettel` (port 5178, `VITE_BRAND=yettel`). A README 5173-a a Vite alapértéke.
- `npm run collect -- --no-llm` (heurisztikus mai kiadás), `--keep-all` (minden jelölt, `editorial: "pending"`).
- `node scripts/apply-editorial.mjs <DATE> work/editorial.json`, `npm run build` (index + tsc + vite). Automatikus teszt nincs; a build (tsc) az ellenőrzés.

## Felépítés
- `config/feeds.json` – 6 kategória, 44 forrás. RSS nélküli forrás: HTML-listaoldal (`type: "html"`, first-seen tároló: `data/seen-urls.json`, commitolva) vagy Google News RSS proxy (`via: "google-news"`).
- `scripts/collect.mjs` – gyűjtés (30 órás ablak, 20 s timeout, 5 MB limit, HTML strip, dedupe URL + normalizált cím alapján, max 120 jelölt). Közvetlen Claude API-ág (`claude-opus-5`, `ANTHROPIC_API_KEY`) létezik, élesben nem használjuk.
- `scripts/apply-editorial.mjs` – szerkesztői JSON beolvasztása: max 10 hír/kategória, relevancia ≥ 2, `duplicateOf` eldobva, angol `title` + `originalTitle`, poszt a gitignored `posts/`-ba.
- `scripts/daily.sh prepare|publish <json>` – az ütemezett feladat EGYETLEN shell-belépési pontja.
- `src/brand.ts` + `vite.config.ts` `brand` plugin – build-idejű `VITE_BRAND`. `src/ViewCounter.tsx` – azonos originű `/_views.json` (sadrobot Status).
- `docs/HANDOFF.md`, `docs/editorial-task-prompt.md` – gitignored, csak lokálisan.

## Kategóriák
`ai-security`, `global-security` (nem kiber, magas szint), `incidents-threats`, `vulns-malware-ttps`, `policy-regulation` (EU-fókusz), `eu-threat-landscape`.

## Telepítés / kiadás
- Napi folyamat: helyi Claude Desktop ütemezett feladat (08:00 Budapest) `daily.sh prepare` → megírja a `work/editorial.json`-t → `daily.sh publish` alkalmazza, buildel, commitol, pushol. A push indítja a `.github/workflows/daily.yml`-t (build + GitHub Pages).
- Biztonsági háló: cron 08:30 UTC, csak ha a mai fájl hiányzik; `editorial: "heuristic"`-ként jelöli, a szerkesztett kiadás felülírja.
- Két arculat: GitHub Pages (`VITE_BRAND=yettel`) → Yettel Cyber Digest a krisztianhari-wq.github.io/cyber-news címen; változó nélküli build → sadrobot Cyber Digest a cyber.sadrobot.eu címen. A szerver félóránként maga húzza és építi a repót (sadrobot-infra `scripts/sync-news.sh`). Szerverdolgokhoz lásd /deploy-sadrobot skill és sadrobot-infra/SADROBOT-INFRA.md.
- Verzió: nincs kiadási ciklus (`package.json` 0.1.0); ha kell, /release skill.

## Döntések
1. Nincs API-kulcs és nincs GitHub↔Claude kapcsolat (céges szabály) → a helyi Desktop ütemezett feladat a jóváhagyott út, felhős rutin és API-ág kizárva.
2. A közösségi poszt privát és soha nem posztolódik automatikusan (a tulajdonos kifejezett döntése). Csak `posts/`, a feladat zárójelentése és helyi átadás.
3. Statikus, backend nélkül; a feed-tartalom megbízhatatlan adat (HTML strip, csak http(s) link, szigorú CSP, `no-referrer`).
4. Dedupe-prioritás: elsődleges forrás > legnagyobb médium > legrészletesebb kivonat. Nem angol címnél angol fordítás, az eredeti `originalTitle`-ként marad.
5. Nézettségszámláló: GoatCounter helyett szerveroldali sadrobot Status (süti nélkül); a Pages-buildben nincs számláló.
6. A napi commit csak `public/data/days/*.json` és `data/seen-urls.json`; `posts/`, `work/` soha.

## Buktatók
- A Git-remote SSH a 443-as porton (`ssh://git@ssh.github.com:443/...`), mert a 22-es port a céges hálón tiltott; más repónál is ez a megoldás, ha a push időtúllép.
- A sessiononkénti auto mode nem öröklődik a későbbi ütemezett futásokra; a projekt-settings allow-szabályai igen.
- A github.com és a github.io a Claude böngészőpaneljén blokkolt.

## Nyitott
- A `daily.sh` még `pull --ff-only`-t használ és a push-retry előtt nem szinkronizál. Az ai-news-ban már javítva van (`sync()`: `pull --rebase --autostash -X theirs` + JSON-validálás); érdemes ide is átvenni, ha a feladat 08:30 UTC után futna.
- AGENTS.md / HANDOFF.md még GoatCountert említ – frissíteni a Status számlálóra.
