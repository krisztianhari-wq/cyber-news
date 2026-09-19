import { useEffect, useState } from "react";

const CODE = (import.meta.env.VITE_GOATCOUNTER_CODE as string | undefined) || "hadzsy";

/** Total page views from GoatCounter's public counter endpoint. Renders nothing when the counter is not configured. */
export function ViewCounter() {
  const [count, setCount] = useState<string | null>(null);
  useEffect(() => {
    if (!CODE || !/^[a-z0-9-]+$/i.test(CODE)) return;
    fetch(`https://${CODE}.goatcounter.com/counter/TOTAL.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { count?: string } | null) => { if (d?.count) setCount(String(d.count)); })
      .catch(() => {});
  }, []);
  if (!count) return null;
  return <span className="views" title="Total page views (GoatCounter, no cookies)"><b>{count}</b>views</span>;
}
