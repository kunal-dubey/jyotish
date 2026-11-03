import "server-only";
import { readFileSync } from "fs";
import path from "path";
import { chartSvg, regionalStyle } from "./chartSvg";
import { seasonPeriods } from "./stages";
import type { ProtocolContent } from "./protocolSchema";
import type { Reading } from "./types";

const ASSET_DIR = path.join(process.cwd(), "src", "lib", "protocol");

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ---- contrast guard: the model picks colours, the code makes sure text stays legible ----
function lum(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function contrast(a: string, b: string) {
  const la = lum(a), lb = lum(b);
  if (la == null || lb == null) return 0;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
/** App design-system surfaces (ui-style-guide) — living page stays on-brand. */
const APP_LIGHT = {
  ground: "#F2F2F7",
  surface: "#FFFFFF",
  ink: "#1C1C1E",
  muted: "#4F4F55",
  accent: "#7A5818",
  "accent-soft": "#F5ECDB",
  line: "#D1D1D6",
  warn: "#8A5A10",
};
const APP_DARK = {
  ground: "#000000",
  surface: "#1C1C1E",
  ink: "#F5F5F7",
  muted: "#AEAEB2",
  accent: "#D9B77E",
  "accent-soft": "#2E2618",
  line: "#38383A",
  warn: "#EBC690",
};

function safePalette(p: ProtocolContent["design"]["light"], dark: boolean) {
  const base = dark ? APP_DARK : APP_LIGHT;
  // Keep chart-derived accent only when it stays legible on the app ground
  const accent = lum(p.accent) != null && contrast(p.accent, base.ground) >= 3 ? p.accent : base.accent;
  const accentSoft =
    lum(p.accentSoft) != null && contrast(base.ink, p.accentSoft) >= 4.5 ? p.accentSoft : base["accent-soft"];
  return {
    ground: base.ground,
    surface: base.surface,
    ink: base.ink,
    muted: base.muted,
    accent,
    "accent-soft": accentSoft,
    line: base.line,
    warn: base.warn,
  };
}
const vars = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => `--${k}:${v};`).join("");

export function buildProtocolHtml(r: Reading): string {
  const c = r.outputs.protocol;
  if (!c) throw new Error("No protocol content yet.");
  const ch = r.chart;
  const i = r.intake;
  const name = i.callName || i.name;
  const light = safePalette(c.design.light, false);
  const dark = safePalette(c.design.dark, true);
  // Match main app: Jost display + system UI body (ui-style-guide)
  const fonts = "family=Jost:ital,wght@0,300;0,400;0,500;0,600;1,400";

  const labelled = new Map(c.seasons.map((s) => [s.key, s]));
  const seasons = seasonPeriods(r).map((p) => {
    const s = labelled.get(p.key);
    return { ...p, label: s?.label ?? `${p.md} / ${p.ad}`, summary: s?.summary ?? "", pressure: s?.pressure ?? "moderate" };
  });

  const data = {
    id: r.id,
    content: c,
    seasons,
    mahadashas: ch.vimshottari.mahadashas.map((m) => ({
      lord: m.lord, start: m.start, end: m.end,
      antardashas: m.antardashas.map((a) => ({ lord: a.lord, start: a.start, end: a.end })),
    })),
    saturnSpans: ch.transits.saturn_spans,
    planets: ch.planets.map((p) => ({
      name: p.name, sign: p.sign, deg: p.deg, house: p.house, nakshatra: p.nakshatra, pada: p.pada,
      dignity: p.dignity, vargottama: p.vargottama, retrograde: p.retrograde,
    })),
  };
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  const css = readFileSync(path.join(ASSET_DIR, "client.css"), "utf8");
  const js = readFileSync(path.join(ASSET_DIR, "client.js"), "utf8");
  const svg = chartSvg(ch, regionalStyle(i.place.label));
  const asc = ch.ascendant;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name)} · Living page</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fonts}&display=swap">
<style>
:root{${vars(light)}--display:"Jost",system-ui,sans-serif;--body:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{${vars(dark)}}}
${css}
</style>
</head>
<body>
<div class="wrap">
<header class="mast">
  <div>
    <div class="eyebrow">Living protocol · ${esc(c.design.motif)}</div>
    <div class="who">${esc(i.name)} · born ${esc(i.date)} ${esc(i.time)}, ${esc(i.place.label)} · ${esc(asc.sign)} lagna</div>
  </div>
  <div class="date" id="mast-date"></div>
</header>

<main>
<section aria-labelledby="today-h">
  <h2 id="today-h" class="eyebrow" style="font-family:inherit;font-size:.75rem;margin-bottom:1rem">The day in hand</h2>
  <div class="today">
    <div id="today-day" class="rise"></div>
    <div class="periods rise" id="periods" aria-label="Running periods"></div>
  </div>
</section>

<section aria-labelledby="ledger-h">
  <h2 id="ledger-h">Today’s ledger</h2>
  <div class="ledger">
    <ul class="marks" id="marks"></ul>
    <div>
      <div class="eyebrow" style="margin-bottom:.6rem">Last fourteen days</div>
      <div class="history" id="history" aria-label="Ledger history, last fourteen days"></div>
      <p class="store-note" id="store-note"></p>
    </div>
  </div>
</section>

<section aria-labelledby="week-h">
  <h2 id="week-h">The week</h2>
  <div class="week" id="week" role="group" aria-label="Choose a day"></div>
  <div class="dayview" id="dayview" aria-live="polite"></div>
</section>

<section aria-labelledby="decade-h">
  <h2 id="decade-h">The decade</h2>
  <div class="map" id="map"></div>
  <div class="legend">
    <span><i style="background:var(--accent-soft)"></i>light</span>
    <span><i style="background:color-mix(in oklab,var(--accent) 45%,var(--accent-soft))"></i>moderate</span>
    <span><i style="background:var(--accent)"></i>heavy</span>
    <span><i style="border:1px dashed var(--ink)"></i>sade sati</span>
    ${c.prohibition.present ? `<span><i style="border:2px solid var(--warn)"></i>standing prohibition</span>` : ""}
  </div>
  <div id="prohibition"></div>
  <div class="seasons" id="seasons"></div>
</section>

<section aria-labelledby="counsel-h">
  <h2 id="counsel-h">Counsel</h2>
  <div class="counsel" id="counsel"></div>
</section>

<section aria-labelledby="rem-h">
  <h2 id="rem-h">Remedies, decoded</h2>
  <p class="muted" style="max-width:44rem">The remedy for a planet is to perform its significations voluntarily, before life assigns them involuntarily. Each practice below is described by what it does to the person doing it.</p>
  <div class="remedies" id="remedies"></div>
  <div class="gem"><div class="eyebrow">On gemstones</div><p id="gem" style="margin:0"></p></div>
</section>

<section aria-labelledby="ref-h">
  <h2 id="ref-h">Reference</h2>
  <details><summary>The chart</summary><div>
    <div class="chartwrap">
      <div>${svg}</div>
      <div class="tablewrap"><table><thead><tr><th>Planet</th><th>Position</th><th>House</th><th>Nakshatra</th><th>Condition</th></tr></thead><tbody id="planet-table"></tbody></table>
      <p class="muted" style="font-size:.85rem;margin-top:1rem">Sidereal zodiac, Lahiri ayanamsa ${ch.settings.ayanamsa_value}, whole-sign houses, mean node. Ascendant ${esc(asc.sign)} ${esc(asc.deg)}, ${esc(asc.nakshatra)} pada ${asc.pada}. Clock offset ${esc(ch.time.utc_offset_str)}.</p></div>
    </div>
  </div></details>
  <details><summary>Dasha calendar</summary><div class="tablewrap"><table><thead><tr><th>Mahadasha</th><th>Antardasha</th><th>From</th><th>To</th></tr></thead><tbody id="calendar"></tbody></table></div></details>
  <details><summary>The houses</summary><div><dl class="gl" id="gl-houses"></dl></div></details>
  <details><summary>The planets</summary><div><dl class="gl" id="gl-planets"></dl></div></details>
  <details><summary>Terms</summary><div><dl class="gl" id="gl-terms"></dl></div></details>
  <details><summary>Why the page looks like this</summary><div><p style="max-width:44rem">${esc(c.design.rationale)}</p></div></details>
</section>
</main>

<footer>
  <p>The calendar on this page is arithmetic. The dates were computed from the moment and place of birth and they will not move. The meanings attached to those dates are the tradition’s, written down here in plain words. Whether the calendar and the meanings correspond to a lived life is the premise underneath all of it, and it has not been proven.</p>
</footer>
</div>
<script type="application/json" id="protocol-data">${json}</script>
<script>${js}</script>
</body>
</html>`;
}
