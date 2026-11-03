import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Chart } from "./types";

const MARGIN = 40;
const PAGE_W = 595.28; // A4 pt
const CONTENT_W = PAGE_W - MARGIN * 2;

function mins(n: number | null | undefined) {
  return n == null ? "—" : `${n} min`;
}

function slugify(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, "-") || "chart";
}

function yAfterTable(doc: jsPDF, fallback: number) {
  const last = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable;
  return last ? last.finalY + 18 : fallback;
}

function ensureSpace(doc: jsPDF, y: number, need: number) {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + need > pageH - 48) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function sectionTitle(doc: jsPDF, title: string, y: number) {
  y = ensureSpace(doc, y, 36);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(28, 28, 30);
  doc.text(title, MARGIN, y);
  doc.setDrawColor(217, 183, 126);
  doc.setLineWidth(1);
  doc.line(MARGIN, y + 4, MARGIN + CONTENT_W, y + 4);
  return y + 16;
}

function kvLines(doc: jsPDF, rows: [string, string][], y: number) {
  doc.setFontSize(9);
  for (const [k, v] of rows) {
    y = ensureSpace(doc, y, 14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 79, 85);
    doc.text(k, MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(28, 28, 30);
    const lines = doc.splitTextToSize(v, CONTENT_W - 120);
    doc.text(lines, MARGIN + 120, y);
    y += Math.max(14, lines.length * 12);
  }
  return y + 6;
}

function addFooters(doc: jsPDF, name: string) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 128);
    doc.text(`Jyotish · ${name}`, MARGIN, pageH - 20);
    doc.text(`${i} / ${pages}`, PAGE_W - MARGIN, pageH - 20, { align: "right" });
  }
}

const tableBase = {
  theme: "plain" as const,
  margin: { left: MARGIN, right: MARGIN },
  styles: {
    font: "helvetica",
    fontSize: 8.5,
    cellPadding: { top: 4, right: 4, bottom: 4, left: 4 },
    textColor: [28, 28, 30] as [number, number, number],
    lineColor: [220, 220, 224] as [number, number, number],
    lineWidth: 0.4,
    overflow: "linebreak" as const,
  },
  headStyles: {
    fillColor: [245, 245, 247] as [number, number, number],
    textColor: [28, 28, 30] as [number, number, number],
    fontStyle: "bold" as const,
    fontSize: 8,
  },
  alternateRowStyles: {
    fillColor: [250, 250, 252] as [number, number, number],
  },
};

/** Structured practitioner PDF: identity, settings, planets, sensitivity, dashas. */
export function exportChartPdf(chart: Chart, name: string, placeLabel?: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const place = placeLabel || chart.input.place || "—";
  const combust = new Map((chart.combustion ?? []).map((c) => [c.planet, c]));
  const a = chart.ascendant;
  const s = chart.sensitivity;
  let y = MARGIN;

  // Cover header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(28, 28, 30);
  doc.text("Birth Chart", MARGIN, y);
  y += 22;
  doc.setFontSize(14);
  doc.text(name, MARGIN, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(79, 79, 85);
  doc.text(`${chart.input.date}  ·  ${chart.input.time}  ·  ${place}`, MARGIN, y);
  y += 14;
  doc.text(`${a.sign} rising · ${a.deg} · ${a.nakshatra} pada ${a.pada}`, MARGIN, y);
  y += 22;

  // Summary
  y = sectionTitle(doc, "Summary", y);
  y = kvLines(doc, [
    ["Lagna", `${a.sign} ${a.deg} · lord ${a.lord} · ${a.element}`],
    ["Navamsa lagna", `${a.navamsa} · window ${mins(s.navamsa_lagna.minutes_earlier_survives)} / ${mins(s.navamsa_lagna.minutes_later_survives)}`],
    ["Yogakaraka", chart.yogakaraka.length ? chart.yogakaraka.join(", ") : "—"],
    ["Moon nakshatra", `${chart.vimshottari.moon_nakshatra} · birth lord ${chart.vimshottari.birth_lord}`],
    [
      "Current period",
      chart.vimshottari.current
        ? `${chart.vimshottari.current.mahadasha} / ${chart.vimshottari.current.antardasha}` +
          (chart.vimshottari.current.pratyantara ? ` / ${chart.vimshottari.current.pratyantara}` : "")
        : "—",
    ],
    ["Rising window", `${mins(s.lagna.minutes_earlier_survives)} earlier · ${mins(s.lagna.minutes_later_survives)} later`],
    ["Time-critical", s.time_critical ? "Yes — rising may flip within ~10 minutes" : "No"],
  ], y);

  // Settings & moment
  y = sectionTitle(doc, "Settings & moment", y);
  y = kvLines(doc, [
    ["Ayanamsa", `Lahiri ${chart.settings.ayanamsa_value}°`],
    ["Houses", chart.settings.houses ?? "whole sign"],
    ["Zodiac", chart.settings.zodiac ?? "sidereal"],
    ["Nodes", chart.settings.nodes ?? "mean"],
    ["Universal time", chart.time.utc.replace("T", " ").replace("Z", " UT")],
    ["Offset", `${chart.time.utc_offset_str} from ${chart.time.offset_source}`],
    ["Coordinates", `${chart.input.lat.toFixed(4)}, ${chart.input.lon.toFixed(4)}`],
    [
      "True node",
      `${chart.nodes.true.sign} ${chart.nodes.true.deg} · ${chart.nodes.true.nakshatra} p${chart.nodes.true.pada}` +
        (chart.nodes.padas_differ ? " · pada differs from mean" : " · same pada as mean") +
        (chart.nodes.signs_differ ? " · sign differs" : ""),
    ],
  ], y);

  if (chart.time.notes.length) {
    y = ensureSpace(doc, y, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(79, 79, 85);
    doc.text("Notes", MARGIN, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(28, 28, 30);
    for (const note of chart.time.notes) {
      const lines = doc.splitTextToSize(`• ${note}`, CONTENT_W);
      y = ensureSpace(doc, y, lines.length * 12);
      doc.text(lines, MARGIN, y);
      y += lines.length * 12 + 2;
    }
    y += 8;
  }

  // Planets
  y = sectionTitle(doc, "Planets", y);
  autoTable(doc, {
    ...tableBase,
    startY: y,
    head: [["Planet", "Sign°", "H", "Nakshatra", "Pada", "D9", "Dignity", "Flags"]],
    body: chart.planets.map((p) => {
      const flags = [
        p.retrograde ? "R" : null,
        p.vargottama ? "Vg" : null,
        combust.has(p.name) ? `C${combust.get(p.name)!.distance}°` : null,
      ].filter(Boolean);
      return [
        p.name,
        `${p.sign} ${p.deg}`,
        String(p.house),
        p.nakshatra,
        String(p.pada),
        p.navamsa,
        p.dignity ?? "—",
        flags.length ? flags.join(" · ") : "—",
      ];
    }),
  });
  y = yAfterTable(doc, y);

  // Houses
  if (chart.houses?.length) {
    y = sectionTitle(doc, "Houses", y);
    autoTable(doc, {
      ...tableBase,
      startY: y,
      head: [["House", "Sign", "Lord", "Occupants"]],
      body: chart.houses.map((h) => [
        String(h.house),
        h.sign,
        h.lord,
        h.occupants.length ? h.occupants.join(", ") : "—",
      ]),
    });
    y = yAfterTable(doc, y);
  }

  // Sensitivity
  y = sectionTitle(doc, "If the birth time is off", y);
  autoTable(doc, {
    ...tableBase,
    startY: y,
    head: [["Shift", "Ascendant", "Navamsa"]],
    body: s.table.map((t) => [
      `${t.offset_min > 0 ? "+" : ""}${t.offset_min} min`,
      `${t.sign} ${t.deg}`,
      t.navamsa,
    ]),
  });
  y = yAfterTable(doc, y);

  // Panchanga
  if (chart.panchanga) {
    const p = chart.panchanga;
    y = sectionTitle(doc, "Panchanga", y);
    y = kvLines(doc, [
      ["Tithi", `${p.tithi.name} · ${p.tithi.paksha}`],
      ["Nakshatra", `${p.nakshatra.name}, pada ${p.nakshatra.pada} · lord ${p.nakshatra.lord}`],
      ["Yoga", p.yoga.name],
      ["Karana", p.karana.name],
      ["Weekday", p.vara.weekday],
      [
        "Dagdha",
        p.dagdha_rashi.signs.length
          ? `${p.dagdha_rashi.signs.join(", ")}` +
            (p.dagdha_rashi.planets_affected.length
              ? ` · planets: ${p.dagdha_rashi.planets_affected.join(", ")}`
              : "")
          : "—",
      ],
    ], y);
  } else if (chart.tithi) {
    y = sectionTitle(doc, "Lunar day", y);
    y = kvLines(doc, [["Tithi", `${chart.tithi.name} · ${chart.tithi.paksha}`]], y);
  }

  // Mahadashas
  y = sectionTitle(doc, "Vimshottari mahadashas", y);
  autoTable(doc, {
    ...tableBase,
    startY: y,
    head: [["Lord", "Start", "End", "Age", "Status"]],
    body: chart.vimshottari.mahadashas.map((m) => [
      m.lord,
      m.start,
      m.end,
      `${m.age_start.toFixed(1)}–${m.age_end.toFixed(1)}`,
      m.status ?? "—",
    ]),
  });
  y = yAfterTable(doc, y);

  // Antardashas for current + next mahadasha (keep PDF useful without endless pages)
  const currentMd = chart.vimshottari.current?.mahadasha;
  const focusDashas = chart.vimshottari.mahadashas.filter(
    (m) => m.status === "current" || (currentMd != null && m.lord === currentMd),
  );
  const dashasToShow =
    focusDashas.length > 0 ? focusDashas.slice(0, 2) : chart.vimshottari.mahadashas.slice(0, 1);

  for (const m of dashasToShow) {
    y = sectionTitle(doc, `Antardashas · ${m.lord} mahadasha`, y);
    autoTable(doc, {
      ...tableBase,
      startY: y,
      head: [["Antardasha", "Start", "End", "Status"]],
      body: m.antardashas.map((ad) => [ad.lord, ad.start, ad.end, ad.status ?? "—"]),
    });
    y = yAfterTable(doc, y);
  }

  // Navamsa (D9) slice if present
  const d9 = chart.vargas?.d9;
  if (d9?.planets?.length) {
    y = sectionTitle(doc, "Navamsa (D9) placements", y);
    if (d9.lagna) {
      y = kvLines(doc, [
        ["D9 lagna", `${d9.lagna}${d9.lagna_lord ? ` · lord ${d9.lagna_lord}` : ""}`],
      ], y);
    }
    autoTable(doc, {
      ...tableBase,
      startY: y,
      head: [["Planet", "Sign", "Dignity"]],
      body: d9.planets.map((p) => [p.name, p.sign, p.dignity ?? "—"]),
    });
    y = yAfterTable(doc, y);
  }

  addFooters(doc, name);
  doc.save(`${slugify(name)}-chart.pdf`);
}
