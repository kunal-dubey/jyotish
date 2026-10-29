import type { Chart } from "./types";

const SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

function download(filename: string, body: string, type: string) {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(v: string | number | boolean | null | undefined) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Compact JSON for practitioners: placements, settings, dasha timeline. */
export function exportChartJson(chart: Chart, name: string) {
  const payload = {
    name,
    input: chart.input,
    settings: {
      ayanamsa: "Lahiri",
      ayanamsa_value: chart.settings.ayanamsa_value,
      houses: "whole sign",
      nodes: "mean",
      zodiac: "sidereal",
    },
    ascendant: chart.ascendant,
    navamsa_lagna: chart.ascendant.navamsa,
    yogakaraka: chart.yogakaraka,
    combustion: chart.combustion ?? [],
    nodes: chart.nodes,
    planets: chart.planets.map((p) => ({
      name: p.name,
      sign: p.sign,
      deg: p.deg,
      house: p.house,
      nakshatra: p.nakshatra,
      pada: p.pada,
      navamsa: p.navamsa,
      dignity: p.dignity,
      retrograde: p.retrograde,
      vargottama: p.vargottama,
    })),
    vimshottari: {
      moon_nakshatra: chart.vimshottari.moon_nakshatra,
      birth_lord: chart.vimshottari.birth_lord,
      current: chart.vimshottari.current,
      mahadashas: chart.vimshottari.mahadashas.map((m) => ({
        lord: m.lord,
        start: m.start,
        end: m.end,
        status: m.status,
        age_start: m.age_start,
        age_end: m.age_end,
        antardashas: m.antardashas.map((a) => ({
          lord: a.lord,
          start: a.start,
          end: a.end,
          status: a.status,
        })),
      })),
    },
  };
  const slug = name.trim().toLowerCase().replace(/\s+/g, "-") || "chart";
  download(`${slug}-chart.json`, JSON.stringify(payload, null, 2), "application/json");
}

/** Planet table + dasha rows as CSV. */
export function exportChartCsv(chart: Chart, name: string) {
  const combust = new Map((chart.combustion ?? []).map((c) => [c.planet, c]));
  const planetRows = [
    ["section", "name", "sign", "deg", "house", "nakshatra", "pada", "navamsa", "dignity", "retrograde", "vargottama", "combust_orb"].join(","),
    ...chart.planets.map((p) =>
      [
        "planet",
        p.name,
        p.sign,
        p.deg,
        p.house,
        p.nakshatra,
        p.pada,
        p.navamsa,
        p.dignity ?? "",
        p.retrograde,
        p.vargottama,
        combust.get(p.name)?.distance ?? "",
      ]
        .map(csvEscape)
        .join(","),
    ),
  ];

  const dashaRows = [
    ["section", "mahadasha", "antardasha", "start", "end", "status"].join(","),
    ...chart.vimshottari.mahadashas.flatMap((m) =>
      m.antardashas.map((a) =>
        ["dasha", m.lord, a.lord, a.start, a.end, a.status ?? m.status ?? ""].map(csvEscape).join(","),
      ),
    ),
  ];

  const meta = [
    ["section", "key", "value"].join(","),
    ["meta", "name", name].map(csvEscape).join(","),
    ["meta", "lagna", chart.ascendant.sign].map(csvEscape).join(","),
    ["meta", "navamsa_lagna", chart.ascendant.navamsa].map(csvEscape).join(","),
    ["meta", "ayanamsa", `Lahiri ${chart.settings.ayanamsa_value}°`].map(csvEscape).join(","),
    ["meta", "yogakaraka", chart.yogakaraka.join("; ")].map(csvEscape).join(","),
    ["meta", "signs_order_note", SIGNS.join(" ")].map(csvEscape).join(","),
  ];

  const slug = name.trim().toLowerCase().replace(/\s+/g, "-") || "chart";
  download(`${slug}-chart.csv`, [...meta, "", ...planetRows, "", ...dashaRows].join("\n"), "text/csv");
}
