/**
 * Life-area plain takes — led by / today / focus (templated, free).
 */

import type { FreeCounsel } from "./freeCounselSchema";
import type { Chart, Intake } from "./types";
import { buildRightNow } from "./rightNow";

export type VargaReadingCard = {
  moduleId: string;
  varga: string;
  headline: string;
  bullets: string[];
  /** Structured counsel when available. */
  ledBy?: string;
  today?: string;
  focus?: string;
  chartDetail?: { summary: string; lines: string[] };
  confidence: "high" | "medium" | "low";
};

type VargaSlice = {
  lagna?: string;
  lagna_lord?: string;
  planets?: { name: string; sign: string; dignity?: string | null }[];
};

/** Map divisional keys → rightNow area ids (or null = generic). */
const AREA_LINK: Record<string, string | null> = {
  d1: null,
  d2: "money",
  d3: "drive",
  d4: "mind",
  d7: null,
  d9: "partnership",
  d10: "work",
  d12: null,
  d16: "mind",
  d20: null,
  d24: "learning",
  d27: "drive",
  d30: null,
};

const DOMAIN: Record<string, { title: string; focus: string }> = {
  d1: { title: "Body & life path", focus: "body and the broad shape of a life" },
  d2: { title: "Money & speech", focus: "resources and how you speak" },
  d3: { title: "Siblings & drive", focus: "courage, peers, and initiative" },
  d4: { title: "Home & settled peace", focus: "home ground and settled ease" },
  d7: { title: "Children & creative legacy", focus: "children and what you leave behind" },
  d9: { title: "Partnership & deeper purpose", focus: "partnership tone and maturing purpose" },
  d10: { title: "Work & public role", focus: "public work and standing" },
  d12: { title: "Parents & ancestry", focus: "parents and the inherited line" },
  d16: { title: "Comforts & vehicles", focus: "everyday comforts and conveyances" },
  d20: { title: "Practice & grace", focus: "practice, meditation, and grace" },
  d24: { title: "Learning & memory", focus: "study and intellectual capacity" },
  d27: { title: "Strength & undercurrents", focus: "vitality and subconscious drives" },
  d30: { title: "Friction & health flags", focus: "friction and structural health flags" },
};

function confidenceFor(key: string, chart: Chart): "high" | "medium" | "low" {
  const later = chart.sensitivity.lagna.minutes_later_survives;
  if (key === "d1") return "high";
  if (key === "d9" || key === "d2" || key === "d3" || key === "d4" || key === "d10") {
    if (later != null && later < 15) return "medium";
    return "high";
  }
  if (key === "d30" || key === "d24" || key === "d27") {
    if (chart.sensitivity.time_critical || (later != null && later < 10)) return "low";
    return "medium";
  }
  if (later != null && later < 10) return "medium";
  return "high";
}

/** Build free domain cards shaped as led-by / today / focus. */
export function buildVargaReadings(
  chart: Chart,
  intake?: Intake | null,
  freeCounsel?: FreeCounsel | null,
): Record<string, VargaReadingCard> {
  const vargas = (chart as Chart & { vargas?: Record<string, VargaSlice> }).vargas ?? {};
  // Templates only for structure/chartDetail — do not pass freeCounsel here (avoids double-merge / cycles).
  const brief = buildRightNow(chart, intake);
  const byId = Object.fromEntries(brief.areas.map((a) => [a.id, a]));
  const call = intake?.callName || intake?.name;
  const cur = chart.vimshottari.current;
  const out: Record<string, VargaReadingCard> = {};

  for (const [key, meta] of Object.entries(DOMAIN)) {
    const moduleId = `${key}_reading`;
    const slice = vargas[key];
    const linked = AREA_LINK[key] ? byId[AREA_LINK[key]!] : undefined;
    const cached = freeCounsel?.vargas?.[key];
    const vLord = slice?.lagna_lord;
    const vLagna = slice?.lagna ?? (key === "d1" ? chart.ascendant.sign : key === "d9" ? chart.ascendant.navamsa : undefined);

    let ledBy = cached?.ledBy ?? linked?.ledBy;
    let today = cached?.today ?? linked?.today;
    let focus = cached?.focus ?? linked?.focus;
    let chartDetail = linked?.chartDetail;

    if (!ledBy) {
      ledBy = `This area covers ${meta.focus}${call ? ` for ${call}` : ""}.`;
    }
    if (!today && cur) {
      today = `Read this area through the tone of your current chapter until ${cur.ad_end}.`;
    }
    if (!focus) {
      focus = `One clear act in ${meta.focus} — small enough to finish this week.`;
    }
    if (!chartDetail) {
      const lines: string[] = [];
      if (vLagna) lines.push(`Divisional lagna: ${vLagna}${vLord ? `, lord ${vLord}` : ""}.`);
      if (cur) lines.push(`Running period: ${cur.mahadasha}–${cur.antardasha} until ${cur.ad_end}.`);
      if (slice?.planets?.length) {
        lines.push(
          `Key placements: ${slice.planets
            .slice(0, 6)
            .map((p) => `${p.name} in ${p.sign}${p.dignity ? ` (${p.dignity})` : ""}`)
            .join("; ")}.`,
        );
      }
      if (lines.length) {
        chartDetail = { summary: "Chart factors", lines };
      }
    }

    const bullets = [
      `Led by: ${ledBy}`,
      today ? `In this chapter: ${today}` : `In this chapter: stay with the main chart's running tone.`,
      `Focus: ${focus}`,
    ];
    if (key === "d30") {
      bullets.push("Caution: this map is uneven near boundaries — soft birth times make these flags provisional.");
    }

    out[moduleId] = {
      moduleId,
      varga: key,
      headline: `${meta.title}`,
      bullets,
      ledBy,
      today,
      focus,
      chartDetail,
      confidence: confidenceFor(key, chart),
    };
  }
  return out;
}
