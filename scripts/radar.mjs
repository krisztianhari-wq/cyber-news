// Exploit radar: structured "this is being exploited / has a working exploit" signals for the daily edition.
// Sources (all public, no key): CISA KEV (CC0), ENISA EUVD exploited list, Ethiack Zero proven exploits
// (CC BY 4.0, attribution required), FIRST EPSS for prioritisation. Remote data is UNTRUSTED: only plain
// text fields are kept (clipped), and every link is built here from a validated ID, never taken from the feed.
// CLI: node scripts/radar.mjs [--since YYYY-MM-DD]  -> prints the radar JSON (for testing).
import path from "node:path";

const TIMEOUT_MS = 20_000;
const MAX_ITEMS = 12;
const UA = "sadrobot-cyber-digest/1.0 (+https://cyber.sadrobot.eu)";
const CVE_RE = /^CVE-\d{4}-\d{4,7}$/;
const EUVD_RE = /^EUVD-\d{4}-\d{1,8}$/;

export const RADAR_SOURCES = {
  kev: { name: "CISA KEV", url: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog", license: "CC0 1.0" },
  euvd: { name: "ENISA EUVD", url: "https://euvd.enisa.europa.eu/", license: "ENISA terms" },
  zero: { name: "Ethiack Zero", url: "https://zero.ethiack.com", license: "CC BY 4.0" },
  epss: { name: "FIRST EPSS", url: "https://www.first.org/epss/", license: "FIRST EPSS usage" },
};

const text = (s, n) => {
  const t = String(s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t;
};

async function getJson(url) {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.text();
  if (body.length > 25_000_000) throw new Error("too large");
  return JSON.parse(body);
}

const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
// EUVD dates look like "Nov 4, 2026, 12:00:00 AM" -> "2026-11-04" (no timezone maths: the date part is what counts)
function euvdDate(s) {
  const m = /^([A-Z][a-z]{2}) (\d{1,2}), (\d{4})/.exec(String(s ?? ""));
  if (!m || !MONTHS[m[1]]) return null;
  return `${m[3]}-${String(MONTHS[m[1]]).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

async function fromKev(since) {
  const d = await getJson("https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json");
  return (d.vulnerabilities ?? [])
    .filter((v) => CVE_RE.test(v.cveID) && /^\d{4}-\d{2}-\d{2}$/.test(v.dateAdded) && v.dateAdded >= since)
    .map((v) => ({
      cve: v.cveID,
      title: text(v.vulnerabilityName, 140),
      vendor: text(v.vendorProject, 60),
      product: text(v.product, 80),
      summary: text(v.shortDescription, 320),
      kevAdded: v.dateAdded,
      ransomware: v.knownRansomwareCampaignUse === "Known",
    }));
}

async function fromEuvd(since) {
  const d = await getJson("https://euvdservices.enisa.europa.eu/api/exploitedvulnerabilities");
  return (Array.isArray(d) ? d : [])
    .map((v) => {
      const cve = String(v.aliases ?? "").split(/\s+/).find((a) => CVE_RE.test(a));
      const since_ = euvdDate(v.exploitedSince);
      if (!cve || !since_ || since_ < since || !EUVD_RE.test(v.id)) return null;
      const vendor = text(v.enisaIdVendor?.[0]?.vendor?.name, 60);
      return { cve, euvdId: v.id, euvdExploited: since_, vendor, summary: text(v.description, 320), cvss: typeof v.baseScore === "number" ? v.baseScore : null };
    })
    .filter(Boolean);
}

async function fromZero(since) {
  const d = await getJson("https://zero.ethiack.com/api/v1/feed?exploit=true");
  return (d.entries ?? [])
    .filter((e) => e.exploit === true && !e.withdrawn_at && (e.signals?.exploit?.at ?? "").slice(0, 10) >= since)
    .map((e) => {
      const id = CVE_RE.test(e.cve_id) ? e.cve_id : CVE_RE.test(e.display_id) ? e.display_id : null;
      return id && {
        cve: id,
        title: text(e.title, 140),
        vendor: text(e.vendor, 60),
        product: text(e.product, 80),
        summary: text(e.summary, 320),
        zeroExploit: e.signals.exploit.at.slice(0, 10),
        // Zero's own KEV signal = earliest listing across CISA, EUVD and VulnCheck KEV
        ...(typeof e.signals.kev?.at === "string" ? { knownExploited: e.signals.kev.at.slice(0, 10) } : {}),
        cvss: typeof e.cvss_score === "number" ? e.cvss_score : null,
        mitigation: text(e.mitigation, 220),
      };
    })
    .filter(Boolean);
}

async function epssFor(cves) {
  const out = new Map();
  for (let i = 0; i < cves.length; i += 50) {
    const d = await getJson(`https://api.first.org/data/v1/epss?cve=${cves.slice(i, i + 50).join(",")}`);
    for (const r of d.data ?? []) if (CVE_RE.test(r.cve)) out.set(r.cve, { epss: Number(r.epss), pct: Number(r.percentile) });
  }
  return out;
}

/**
 * @param {{ since: string, exclude?: Set<string> }} opts  since = first YYYY-MM-DD to include;
 *        exclude = CVEs already shown in the previous edition (each signal appears once).
 */
export async function collectRadar({ since, exclude = new Set() }) {
  const sources = [];
  const merged = new Map();
  const run = async (key, fn) => {
    try {
      const rows = await fn(since);
      sources.push({ ...RADAR_SOURCES[key], key, ok: true, items: rows.length });
      for (const r of rows) {
        const cur = merged.get(r.cve) ?? { cve: r.cve };
        // first non-empty value wins for descriptive fields (KEV > Zero > EUVD order below)
        for (const [k, v] of Object.entries(r)) if (v !== null && v !== "" && cur[k] === undefined) cur[k] = v;
        merged.set(r.cve, cur);
      }
    } catch (e) {
      sources.push({ ...RADAR_SOURCES[key], key, ok: false, error: text(e?.message ?? e, 80) });
    }
  };
  await run("kev", fromKev);
  await run("zero", fromZero);
  await run("euvd", fromEuvd);

  let items = [...merged.values()].filter((it) => !exclude.has(it.cve));
  try {
    const scores = await epssFor(items.map((it) => it.cve));
    for (const it of items) {
      const s = scores.get(it.cve);
      if (s && Number.isFinite(s.epss)) { it.epss = s.epss; it.epssPct = s.pct; }
    }
    sources.push({ ...RADAR_SOURCES.epss, key: "epss", ok: true, items: scores.size });
  } catch (e) {
    sources.push({ ...RADAR_SOURCES.epss, key: "epss", ok: false, error: text(e?.message ?? e, 80) });
  }

  for (const it of items) {
    it.signals = [it.kevAdded && "kev", it.euvdExploited && "euvd", !it.kevAdded && !it.euvdExploited && it.knownExploited && "itw", it.zeroExploit && "zero"].filter(Boolean);
    it.links = {
      cve: `https://www.cve.org/CVERecord?id=${it.cve}`,
      ...(it.euvdId ? { euvd: `https://euvd.enisa.europa.eu/vulnerability/${it.euvdId}` } : {}),
      ...(it.zeroExploit ? { zero: `https://zero.ethiack.com/e/${it.cve}` } : {}),
    };
    if (!it.title) it.title = [it.vendor, it.product].filter(Boolean).join(" ") || it.cve;
  }
  // in-the-wild first (KEV / EUVD), then proven exploits; more signals and higher EPSS first
  const rank = (it) => (it.kevAdded || it.euvdExploited || it.knownExploited ? 2 : 0) + it.signals.length * 0.1 + (it.epss ?? 0) * 0.01;
  items.sort((a, b) => rank(b) - rank(a));
  const total = items.length;
  items = items.slice(0, MAX_ITEMS);
  return { since, generatedAt: new Date().toISOString(), total, sources, items };
}

if (path.resolve(process.argv[1] ?? "") === path.resolve(new URL(import.meta.url).pathname)) {
  const i = process.argv.indexOf("--since");
  const since = i > 0 ? process.argv[i + 1] : new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
  console.log(JSON.stringify(await collectRadar({ since }), null, 1));
}
