import { useEffect, useMemo, useState } from "react";
import MiniSearch from "minisearch";
import { Logo } from "./Logo";
import { ViewCounter } from "./ViewCounter";
import { CATEGORIES, categoryName } from "./categories";
import type { DayFile, IndexFile, NewsItem } from "./types";

const BASE = import.meta.env.BASE_URL;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const fmtTime = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
const isHttp = (u: string) => /^https?:\/\//i.test(u);

export function App() {
  const [index, setIndex] = useState<IndexFile | null>(null);
  const [day, setDay] = useState<DayFile | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BASE}data/index.json`, { cache: "no-cache" })
      .then((r) => { if (!r.ok) throw new Error(`index ${r.status}`); return r.json() as Promise<IndexFile>; })
      .then((ix) => { setIndex(ix); if (ix.days[0]) setSelectedDate(ix.days[0].date); })
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (!selectedDate || !/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) return;
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


  return (
    <>
      <header className="hero">
        <div className="wrap">
          <div className="brand">
            <Logo fill="#B4FF00" height={22} />
            <div className="brand-title">Cyber Digest <span>· daily security briefing</span></div>
          </div>
          <div className="classification">Open</div>
        </div>
      </header>
      <div className="limebar" />

      <main className="wrap">
        <div className="masthead">
          <h1>{searching ? "Search the archive" : day ? `Briefing for ${fmtDate(day.date)}` : "Loading briefing…"}</h1>
          <p>
            {searching
              ? `${searchResults.length} result${searchResults.length === 1 ? "" : "s"} across ${index?.days.length ?? 0} days`
              : day
                ? `${day.itemCount} items · generated ${fmtTime(day.generatedAt)}${day.model ? ` · summarised by ${day.model}` : " · heuristic summaries"}`
                : "AI security, global incidents, vulnerabilities, EU policy and threat landscape."}
          </p>
        </div>

        <div className="toolbar">
          <label className="search">
            <span aria-hidden>⌕</span>
            <input type="search" placeholder="Search all days: ransomware, NIS2, CVE-2026…" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={120} aria-label="Search archive" />
          </label>
          <select className="select" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setQuery(""); }} aria-label="Choose day" disabled={!index}>
            {index?.days.map((d) => (
              <option key={d.date} value={d.date}>{fmtDate(d.date)} ({d.itemCount})</option>
            ))}
          </select>
        </div>

        <div className="chips" role="group" aria-label="Filter by category">
          <button className="chip" aria-pressed={cat === "all"} onClick={() => setCat("all")}>All<span className="n">{shown.length}</span></button>
          {CATEGORIES.map((c) => (
            <button key={c.id} className="chip" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>{c.short}<span className="n">{counts[c.id]}</span></button>
          ))}
        </div>

        {error && <p className="status">Could not load data: {error}</p>}


        {filtered.length === 0 && (index || error) && <p className="empty">{searching ? "No matches." : "No items in this category today."}</p>}

        {(cat === "all" ? CATEGORIES : CATEGORIES.filter((c) => c.id === cat)).map((c) => {
          const items = filtered.filter((it) => it.category === c.id);
          if (!items.length) return null;
          return (
            <section className="section" key={c.id}>
              <div className="section-head"><h2>{c.name}</h2><span className="count">{items.length}</span></div>
              <div className="grid">
                {items.map((it) => <Card key={`${it.date ?? ""}${it.id}`} item={it} showDate={searching} />)}
              </div>
            </section>
          );
        })}

        {!searching && day && (
          <details>
            <summary>Sources for this day ({day.feeds.filter((f) => f.ok).length}/{day.feeds.length} feeds reachable)</summary>
            <ul className="feedlist">
              {day.feeds.map((f) => <li key={f.name} className={f.ok ? "" : "bad"}>{f.name}{f.ok ? ` · ${f.items}` : ` · ${f.error}`}</li>)}
            </ul>
          </details>
        )}
      </main>

      <footer>
        <div className="limebar" />
        <div className="wrap">
          <span>Automated digest of public RSS feeds · summaries are AI-generated, always verify with the linked source.</span>
          <span>{index ? `Archive: ${index.days.length} days` : ""}<ViewCounter /></span>
        </div>
      </footer>
    </>
  );
}

function Card({ item, showDate }: { item: NewsItem; showDate: boolean }) {
  const safe = isHttp(item.url);
  return (
    <article className={`card r${item.relevance}`}>
      <h3>{safe ? <a href={item.url} target="_blank" rel="noopener noreferrer nofollow">{item.title}</a> : item.title}</h3>
      <p>{item.summary}</p>
      <div className="meta">
        <span className="rel" title={`Relevance ${item.relevance}/5`} aria-label={`Relevance ${item.relevance} of 5`}>
          {[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= item.relevance ? "on" : ""} />)}
        </span>
        <span>{item.source}{safe && hostOf(item.url) !== item.source ? ` · ${hostOf(item.url)}` : ""}</span>
        <span>{showDate && item.date ? fmtDate(item.date) : fmtTime(item.published)}</span>
        {item.tags.map((t) => <span className="tag" key={t}>{t}</span>)}
        {showDate && <span className="tag">{categoryName(item.category)}</span>}
      </div>
    </article>
  );
}
