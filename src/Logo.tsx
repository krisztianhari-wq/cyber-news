// sadrobot jel: a robotfej ikon + „sadrobot Daily” szóvédjegy. A szöveg színét a környezet adja (currentColor).
export function Logo({ height = 22 }: { fill?: string; height?: number }) {
  const base = import.meta.env.BASE_URL;
  const size = Math.round(height * 1.6);
  return (
    <span className="sr-logo" aria-label="sadrobot Daily" role="img">
      <img src={`${base}sadrobot.png`} alt="" width={size} height={size} />
      <span className="sr-word" style={{ fontSize: height }}>sadrobot <span>Daily</span></span>
    </span>
  );
}
