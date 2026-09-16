import { useEffect, useMemo, useState } from "react";
import MiniSearch from "minisearch";
import { Logo } from "./Logo";
import { CATEGORIES, categoryName } from "./categories";
import type { DayFile, IndexFile, NewsItem } from "./types";

const BASE = import.meta.env.BASE_URL;
const fmtLong = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const fmtTime = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const isHttp = (u: string) => /^https?:\/\//i.test(u);

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
  </svg>
);

export function App() {
  const [index, setIndex] = useState<IndexFile | null>(null);
  const [day, setDay] = useState<DayFile | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BASE}data/index.json`, { cache: "no-cache" })
      .then((r) => { if (!r.ok) throw new Error(`index ${r.status}`); return r.json() as Promise<IndexFile>; })
      .then((ix) => { setIndex(ix); if (ix.days[0]) setSelectedDate(ix.days[0].date); })
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) return;
    setDay(null);
    fetch(`${BASE}data/days/${selectedDate}.json`, { cache: "no-cache" })
      .then((r) => { if (!r.ok) throw new Error(`day ${r.status}`); return r.json() as Promise<DayFile>; })
      .then(setDay)
      .catch((e) => setError(String(e)));
  }, [selectedDate]);

  const search = useMemo(() => {
    if (!index) return null;
    const ms = new MiniSearch<NewsItem>({
      fields: ["title", "summary", "source", "tags"],
      storeFields: ["id"],
      searchOptions: { boost: { title: 3, tags: 2 }, fuzzy: 0.15, prefix: true, combineWith: "AND" },
      extractField: (doc, f) => (f === "tags" ? doc.tags.join(" ") : (doc as never as Record<string, string>)[f]),
    });
    ms.addAll(index.items.map((it) => ({ ...it, id: `${it.date}/${it.id}` })));
    return ms;
  }, [index]);

  const searching = query.trim().length >= 2;
  const searchResults = useMemo<NewsItem[]>(() => {
    if (!searching || !search || !index) return [];
    const byKey = new Map(index.items.map((it) => [`${it.date}/${it.id}`, it]));
    return search.search(query.trim()).map((r) => byKey.get(String(r.id))!).filter(Boolean).slice(0, 200);
  }, [searching, search, query, index]);

  const shown: NewsItem[] = searching ? searchResults : day?.items ?? [];
  const filtered = cat === "all" ? shown : shown.filter((it) => it.category === cat);
  const counts = useMemo(() => Object.fromEntries(CATEGORIES.map((c) => [c.id, shown.filter((i) => i.category === c.id).length])), [shown]);
  const top = !searching && cat === "all" ? shown.filter((it) => it.relevance >= 5).slice(0, 3) : [];
  const sourcesOk = day ? day.feeds.filter((f) => f.ok).length : 0;

  return (
    <>
      <header className="topbar">
        <div className="wrap">
          <div className="brand">
            <Logo fill="currentColor" height={20} />
            <span className="brand-sep" />
            <span className="brand-name">Cyber Digest <span>· daily security briefing</span></span>
          </div>
          <div className="topbar-right">
            <select className="select" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setQuery(""); }} aria-label="Choose edition" disabled={!index}>
              {index?.days.map((d) => <option key={d.date} value={d.date}>{fmtDate(d.date)}</option>)}
            </select>
            <span className="classification">Open</span>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="wrap">
          <div className="hero-row">
            <div>
              <p className="kicker">{searching ? "Archive search" : "Daily edition"}</p>
              <h1>{searching ? `“${query.trim()}”` : day ? fmtLong(day.date) : "Loading…"}</h1>
            </div>
            <p className="lead">
              {searching
                ? `${searchResults.length} matching stor${searchResults.length === 1 ? "y" : "ies"} across ${index?.days.length ?? 0} editions.`
                : "AI security, global incidents, vulnerabilities, EU policy and the European threat landscape. Summarised every morning for security professionals."}
            </p>
          </div>
          <label className="search">
            <SearchIcon />
            <input type="search" placeholder="Search the archive: ransomware, NIS2, CVE…" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={120} aria-label="Search archive" />
            {query && <button type="button" className="clear" onClick={() => setQuery("")} aria-label="Clear search">×</button>}
          </label>
          {!searching && day && (
            <div className="hero-stats">
              <span><b>{day.itemCount}</b>stories</span>
              <span><b>{sourcesOk}</b>sources</span>
              <span><b>{index?.days.length ?? 1}</b>editions archived</span>
              <span><b>{fmtTime(day.generatedAt).split(", ")[1]}</b>generated</span>
            </div>
          )}
        </div>
      </section>

      <nav className="catnav" aria-label="Categories">
        <div className="wrap">
          <button className="chip" aria-pressed={cat === "all"} onClick={() => setCat("all")}>All<span className="n">{shown.length}</span></button>
          {CATEGORIES.map((c) => (
            <button key={c.id} className="chip" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>{c.short}<span className="n">{counts[c.id]}</span></button>
          ))}
        </div>
      </nav>

      <main className="wrap">
        {error && <p className="status">Could not load data: {error}</p>}

        {top.length > 0 && (
          <section className="top" aria-label="Top stories">
            <h2>Top stories</h2>
            <div className="topgrid">
              {top.map((it) => (
                <a key={it.id} className="topcard" href={isHttp(it.url) ? it.url : undefined} target="_blank" rel="noopener noreferrer nofollow">
                  <span className="src">{it.source} · {categoryName(it.category)}</span>
                  <h3>{it.title}</h3>
                  <p>{it.summary}</p>
                </a>
              ))}
            </div>
          </section>
        )}

        {filtered.length === 0 && (index || error) && <p className="empty">{searching ? "No matches." : "No stories in this category today."}</p>}

        {(cat === "all" ? CATEGORIES : CATEGORIES.filter((c) => c.id === cat)).map((c) => {
          const items = filtered.filter((it) => it.category === c.id);
          if (!items.length) return null;
          return (
            <section className="section" key={c.id} id={c.id}>
              <div className="section-inner">
                <aside className="section-side">
                  <h2>{c.short}</h2>
                  <p className="title">{c.name}</p>
                  <span className="count">{items.length} {items.length === 1 ? "story" : "stories"}</span>
                </aside>
                <div className="list">
                  {items.map((it) => <Story key={`${it.date ?? ""}${it.id}`} item={it} showDate={searching} />)}
                </div>
              </div>
            </section>
          );
        })}
      </main>

      <footer>
        <div className="wrap">
          <span>Automated digest of public sources · summaries are AI-generated, always verify with the linked article.</span>
          <span>Yettel Cyber Digest</span>
          {!searching && day && (
            <details>
              <summary>Sources for this edition · {sourcesOk}/{day.feeds.length} reachable</summary>
              <ul className="feedlist">
                {day.feeds.map((f) => <li key={f.name} className={f.ok ? "" : "bad"}>{f.name}{f.ok ? ` · ${f.items}` : ` · ${f.error}`}</li>)}
              </ul>
            </details>
          )}
        </div>
        <div className="limebar" />
      </footer>
    </>
  );
}

function Story({ item, showDate }: { item: NewsItem; showDate: boolean }) {
  const safe = isHttp(item.url);
  return (
    <article className="story">
      <h3>{safe ? <a href={item.url} target="_blank" rel="noopener noreferrer nofollow">{item.title}</a> : item.title}</h3>
      <p>{item.summary}</p>
      <div className="meta">
        <span className="src">{item.source}</span>
        <span>{showDate && item.date ? fmtDate(item.date) : fmtTime(item.published)}</span>
        <span className="rel" title={`Relevance ${item.relevance}/5`} aria-label={`Relevance ${item.relevance} of 5`}>
          {[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= item.relevance ? "on" : ""} />)}
        </span>
        {item.tags.map((t) => <span className="tag" key={t}>{t}</span>)}
        {showDate && <span className="tag">{categoryName(item.category)}</span>}
      </div>
    </article>
  );
}
