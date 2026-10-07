// Natal chart as inline SVG, in North or South Indian style. Pure string output so the
// same renderer serves the React app and the standalone protocol file.
// Colours come from currentColor and the CSS variables --accent and --line.

import type { Chart } from "./types";

const ABBR: Record<string, string> = {
  Sun: "Su", Moon: "Mo", Mars: "Ma", Mercury: "Me", Jupiter: "Ju",
  Venus: "Ve", Saturn: "Sa", Rahu: "Ra", Ketu: "Ke",
};

const SOUTH_REGIONS = /tamil nadu|kerala|karnataka|andhra pradesh|telangana|puducherry|pondicherry|sri lanka/i;

export type ChartStyle = "north" | "south";

export function regionalStyle(placeLabel: string): ChartStyle {
  return SOUTH_REGIONS.test(placeLabel) ? "south" : "north";
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function bySign(chart: Chart): string[][] {
  const out: string[][] = Array.from({ length: 12 }, () => []);
  for (const p of chart.planets) {
    out[p.sign_index].push(ABBR[p.name] + (p.retrograde ? "ʳ" : ""));
  }
  return out;
}

function stack(x: number, y: number, items: string[], size: number, cls = "pl") {
  const perRow = items.length > 4 ? 3 : 2;
  const rows: string[][] = [];
  for (let i = 0; i < items.length; i += perRow) rows.push(items.slice(i, i + perRow));
  const lh = size * 1.25;
  const top = y - ((rows.length - 1) * lh) / 2;
  return rows
    .map(
      (row, i) =>
        `<text x="${x}" y="${top + i * lh}" class="${cls}" text-anchor="middle" dominant-baseline="central">${esc(row.join(" "))}</text>`,
    )
    .join("");
}

function north(chart: Chart): string {
  const S = 400;
  const lagna = chart.ascendant.sign_index;
  const occ = bySign(chart);
  // centre of each house region, house 1 at the top diamond, counter-clockwise
  const C: [number, number][] = [
    [200, 100], [100, 42], [42, 100], [100, 200], [42, 300], [100, 358],
    [200, 300], [300, 358], [358, 300], [300, 200], [358, 100], [300, 42],
  ];
  const body = C.map(([x, y], h) => {
    const sign = (lagna + h) % 12;
    // sign number sits toward the chart centre
    const nx = x + (200 - x) * (h % 3 === 0 ? 0.62 : 0.5);
    const ny = y + (200 - y) * (h % 3 === 0 ? 0.62 : 0.5);
    const items = h === 0 ? ["As", ...occ[sign]] : occ[sign];
    const isTri = h % 3 !== 0;
    return (
      `<text x="${nx}" y="${ny}" class="sn${h === 0 ? " lg" : ""}" text-anchor="middle" dominant-baseline="central">${sign + 1}</text>` +
      stack(x, isTri ? y + (y < 200 ? -2 : y > 200 ? 2 : 0) : y - 6, items, isTri ? 12 : 14)
    );
  }).join("");
  return `<svg viewBox="-4 -4 ${S + 8} ${S + 8}" role="img" aria-label="Natal chart, North Indian style, ${esc(chart.ascendant.sign)} ascendant" class="jy-chart">
<style>.jy-chart{color:inherit}.jy-chart .ln{fill:none;stroke:var(--line,currentColor);stroke-width:1.2}.jy-chart .pl{font:600 13px/1 var(--chart-font,inherit);fill:currentColor}.jy-chart .sn{font:500 10px/1 var(--chart-font,inherit);fill:currentColor;opacity:.55}.jy-chart .lg{fill:var(--accent,currentColor);opacity:1;font-weight:700}.jy-chart .h1{fill:var(--accent,currentColor);opacity:.1}</style>
<path class="h1" d="M200 0 L300 100 L200 200 L100 100 Z"/>
<rect class="ln" x="0" y="0" width="${S}" height="${S}"/>
<path class="ln" d="M0 0 L400 400 M400 0 L0 400 M200 0 L400 200 L200 400 L0 200 Z"/>
${body}
</svg>`;
}

function south(chart: Chart): string {
  const cell = 100;
  const lagna = chart.ascendant.sign_index;
  const occ = bySign(chart);
  // fixed sign positions: Pisces top-left, running clockwise
  const POS: [number, number][] = [
    [1, 0], [2, 0], [3, 0], [3, 1], [3, 2], [3, 3], [2, 3], [1, 3], [0, 3], [0, 2], [0, 1], [0, 0],
  ]; // index = sign (Aries=0)
  const SHORT = ["Ar", "Ta", "Ge", "Cn", "Le", "Vi", "Li", "Sc", "Sg", "Cp", "Aq", "Pi"];
  const body = POS.map(([c, r], s) => {
    const x = c * cell, y = r * cell;
    const isLagna = s === lagna;
    return (
      (isLagna ? `<rect class="h1" x="${x}" y="${y}" width="${cell}" height="${cell}"/><path class="ln lgm" d="M${x} ${y + 22} L${x + 22} ${y}"/>` : "") +
      `<text x="${x + cell - 8}" y="${y + 14}" class="sn${isLagna ? " lg" : ""}" text-anchor="end">${SHORT[s]}</text>` +
      stack(x + cell / 2, y + cell / 2 + 6, occ[s], 14)
    );
  }).join("");
  return `<svg viewBox="-4 -4 408 408" role="img" aria-label="Natal chart, South Indian style, ${esc(chart.ascendant.sign)} ascendant" class="jy-chart">
<style>.jy-chart .ln{fill:none;stroke:var(--line,currentColor);stroke-width:1.2}.jy-chart .lgm{stroke:var(--accent,currentColor);stroke-width:2}.jy-chart .pl{font:600 13px/1 var(--chart-font,inherit);fill:currentColor}.jy-chart .sn{font:500 10px/1 var(--chart-font,inherit);fill:currentColor;opacity:.55}.jy-chart .lg{fill:var(--accent,currentColor);opacity:1;font-weight:700}.jy-chart .h1{fill:var(--accent,currentColor);opacity:.1}</style>
<rect class="ln" x="0" y="0" width="400" height="400"/>
<path class="ln" d="M100 0 V400 M200 0 V400 M300 0 V400 M0 100 H400 M0 200 H400 M0 300 H400"/>
<rect x="101" y="101" width="198" height="198" fill="var(--ground,transparent)"/>
<text x="200" y="192" text-anchor="middle" class="pl">${esc(chart.ascendant.sign)}</text>
<text x="200" y="212" text-anchor="middle" class="sn">lagna</text>
${body}
</svg>`;
}

export function chartSvg(chart: Chart, style: ChartStyle): string {
  return style === "south" ? south(chart) : north(chart);
}
