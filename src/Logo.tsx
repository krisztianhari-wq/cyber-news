// sadrobot jel: a robotfej ikon + szóvédjegy. A színt a környező szöveg adja (currentColor).
export function Logo({ height = 22 }: { fill?: string; height?: number }) {
  const base = import.meta.env.BASE_URL;
  return (
    <span className="sr-logo" aria-label="sadrobot" role="img" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <img src={`${base}sadrobot.png`} alt="" width={height + 6} height={height + 6} style={{ borderRadius: 7, background: "#fff" }} />
      <span style={{ fontWeight: 800, letterSpacing: "-0.01em", fontSize: height * 0.9 }}>sadrobot</span>
    </span>
  );
}
