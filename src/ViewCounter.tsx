import { useEffect, useState } from "react";

/**
 * Total page views from the sadrobot Status counter (same origin: /_views.json, served by Caddy on *.sadrobot.eu).
 * Counting is cookie-free and server-side from the access log; no third-party script. Renders nothing where the
 * endpoint does not exist (e.g. the GitHub Pages build).
 */
export function ViewCounter() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}_views.json`, { headers: { Accept: "application/json" } })
      .then((r) => (r.ok && (r.headers.get("content-type") || "").includes("json") ? r.json() : null))
      .then((d: { count?: number } | null) => { if (typeof d?.count === "number") setCount(d.count); })
      .catch(() => {});
  }, []);
  if (count == null) return null;
  return <span className="views" title="Total page views (sadrobot Status, no cookies)"><b>{count.toLocaleString()}</b>views</span>;
}
