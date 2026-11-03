"use client";

/** Fixed star positions for a calm hero field — no runtime float math. */
const STARS = [
  { cx: 28, cy: 36, r: 0.9 },
  { cx: 48, cy: 22, r: 0.7 },
  { cx: 72, cy: 30, r: 1.1 },
  { cx: 156, cy: 40, r: 0.8 },
  { cx: 178, cy: 58, r: 0.6 },
  { cx: 168, cy: 148, r: 0.9 },
  { cx: 42, cy: 160, r: 0.7 },
  { cx: 22, cy: 118, r: 0.55 },
  { cx: 188, cy: 112, r: 0.65 },
  { cx: 96, cy: 18, r: 0.5 },
] as const;

/* Short rim ticks only — keep them on the outer ring so they don't read as spokes. */
const HOUSE_TICKS = [
  { x1: 154, y1: 100, x2: 158, y2: 100 },
  { x1: 146.8, y1: 131.1, x2: 150.2, y2: 133.1 },
  { x1: 124.1, y1: 150.8, x2: 126.1, y2: 154.2 },
  { x1: 100, y1: 154, x2: 100, y2: 158 },
  { x1: 68.9, y1: 146.8, x2: 66.9, y2: 150.2 },
  { x1: 49.2, y1: 124.1, x2: 45.8, y2: 126.1 },
  { x1: 46, y1: 100, x2: 42, y2: 100 },
  { x1: 53.2, y1: 68.9, x2: 49.8, y2: 66.9 },
  { x1: 75.9, y1: 49.2, x2: 73.9, y2: 45.8 },
  { x1: 100, y1: 46, x2: 100, y2: 42 },
  { x1: 131.1, y1: 53.2, x2: 133.1, y2: 49.8 },
  { x1: 150.8, y1: 75.9, x2: 154.2, y2: 73.9 },
] as const;

/**
 * Passive hero ornament — abstract chart / cosmos, no interaction.
 */
export default function CosmicScene() {
  return (
    <div className="land-orbit" aria-hidden>
      <div className="land-orbit__glow" />
      <svg className="land-orbit__svg" viewBox="0 0 200 200" fill="none">
        {/* Distant field */}
        {STARS.map((s, i) => (
          <circle key={i} className={`land-orbit__star land-orbit__star--${(i % 5) + 1}`} cx={s.cx} cy={s.cy} r={s.r} />
        ))}

        {/* Chart wheel */}
        <g className="land-orbit__wheel">
          <circle className="land-orbit__ring land-orbit__ring--outer" cx="100" cy="100" r="58" />
          {HOUSE_TICKS.map((t, i) => (
            <line
              key={i}
              className={`land-orbit__tick${i % 3 === 0 ? " land-orbit__tick--major" : ""}${i === 9 ? " land-orbit__tick--asc" : ""}`}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
            />
          ))}
        </g>

        <circle className="land-orbit__ring land-orbit__ring--mid" cx="100" cy="100" r="38" />
        <g className="land-orbit__wheel land-orbit__wheel--inner">
          <circle className="land-orbit__ring land-orbit__ring--inner" cx="100" cy="100" r="22" />
        </g>
        <circle className="land-orbit__ring land-orbit__ring--core" cx="100" cy="100" r="10" />

        {/* Orbiting bodies */}
        <g className="land-orbit__body land-orbit__body--a">
          <circle cx="146" cy="100" r="3.2" />
        </g>
        <g className="land-orbit__body land-orbit__body--b">
          <circle cx="100" cy="62" r="2.1" />
        </g>
        <g className="land-orbit__body land-orbit__body--c">
          <circle cx="122" cy="128" r="1.5" />
        </g>

        <circle className="land-orbit__sun-glow" cx="100" cy="100" r="8" />
        <circle className="land-orbit__sun" cx="100" cy="100" r="3.4" />
      </svg>
    </div>
  );
}
