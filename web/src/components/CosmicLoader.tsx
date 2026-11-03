"use client";

type Size = "sm" | "md" | "lg";

/** Precomputed house ticks — avoids SSR/client float drift on Math.cos. */
const TICKS: { x1: number; y1: number; x2: number; y2: number; major?: boolean; asc?: boolean }[] = [
  { x1: 69.2, y1: 40, x2: 74.5, y2: 40, major: true },
  { x1: 66.41, y1: 55.25, x2: 69.88, y2: 57.25 },
  { x1: 55.25, y1: 66.41, x2: 57.25, y2: 69.88 },
  { x1: 40, y1: 69.2, x2: 40, y2: 74.5, major: true },
  { x1: 24.75, y1: 66.41, x2: 22.75, y2: 69.88 },
  { x1: 13.59, y1: 55.25, x2: 10.12, y2: 57.25 },
  { x1: 10.8, y1: 40, x2: 5.5, y2: 40, major: true },
  { x1: 13.59, y1: 24.75, x2: 10.12, y2: 22.75 },
  { x1: 24.75, y1: 13.59, x2: 22.75, y2: 10.12 },
  { x1: 40, y1: 10.8, x2: 40, y2: 5.5, major: true, asc: true },
  { x1: 55.25, y1: 13.59, x2: 57.25, y2: 10.12 },
  { x1: 66.41, y1: 24.75, x2: 69.88, y2: 22.75 },
];

/**
 * Shared astrology-flavoured wait state: a quiet chart wheel with a breathing
 * centre and orbiting lights. Use `fullPage` for route boots; `sm`/`md`/`lg`
 * for inline and section loads.
 */
export default function CosmicLoader({
  size = "md",
  fullPage = false,
  label,
}: {
  size?: Size;
  fullPage?: boolean;
  /** Visually hidden by default; set for screen readers when useful. */
  label?: string;
}) {
  const markSize = fullPage ? "page" : size;

  const mark = (
    <span
      className={`cosmic cosmic--${markSize}`}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg className="cosmic__svg" viewBox="0 0 80 80" fill="none">
        {/* Slow house wheel — twelve ticks, thicker mark at the rising point */}
        <g className="cosmic__wheel">
          <circle className="cosmic__ring cosmic__ring--outer" cx="40" cy="40" r="34" />
          {TICKS.map((t, i) => (
            <line
              key={i}
              className={`cosmic__tick${t.asc ? " cosmic__tick--asc" : ""}${t.major ? " cosmic__tick--major" : ""}`}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
            />
          ))}
        </g>

        <ellipse className="cosmic__ring cosmic__ring--ellipse" cx="40" cy="40" rx="27" ry="18" />
        <circle className="cosmic__ring cosmic__ring--mid" cx="40" cy="40" r="22" />
        <g className="cosmic__wheel cosmic__wheel--inner">
          <circle className="cosmic__ring cosmic__ring--inner" cx="40" cy="40" r="12" strokeDasharray="2.5 4.5" />
        </g>

        <g className="cosmic__orbit cosmic__orbit--a">
          <circle className="cosmic__planet cosmic__planet--a" cx="62" cy="40" r="2.2" />
        </g>
        <g className="cosmic__orbit cosmic__orbit--b">
          <circle className="cosmic__planet cosmic__planet--b" cx="40" cy="18" r="1.5" />
        </g>
        <g className="cosmic__orbit cosmic__orbit--c">
          <circle className="cosmic__planet cosmic__planet--c" cx="52" cy="55" r="1.1" />
        </g>

        <circle className="cosmic__core-glow" cx="40" cy="40" r="5.5" />
        <circle className="cosmic__core" cx="40" cy="40" r="2.4" />
      </svg>
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );

  if (!fullPage) return mark;

  return (
    <div className="cosmic-page sky min-h-dvh grid place-items-center" role="status" aria-live="polite" aria-busy="true">
      <div className="cosmic-page__stage">
        <div className="cosmic-page__field" aria-hidden>
          <span className="cosmic-page__star cosmic-page__star--1" />
          <span className="cosmic-page__star cosmic-page__star--2" />
          <span className="cosmic-page__star cosmic-page__star--3" />
          <span className="cosmic-page__star cosmic-page__star--4" />
          <span className="cosmic-page__star cosmic-page__star--5" />
        </div>
        {mark}
      </div>
    </div>
  );
}
