import type { Chart, Intake } from "./types";
import type { ModuleDef } from "./modules";

export type ModuleSubtitle = {
  domain: string;
  relevance: string;
  /** Combined line for compact UI. */
  line: string;
};

function planetInHouse(chart: Chart, house: number): string[] {
  return chart.planets.filter((p) => p.house === house).map((p) => p.name);
}

function currentDasha(chart: Chart): string | null {
  const c = chart.vimshottari.current;
  if (!c) return null;
  return `${c.mahadasha}–${c.antardasha}`;
}

function moon(chart: Chart) {
  return chart.planets.find((p) => p.name === "Moon");
}

function buildRelevance(mod: ModuleDef, chart: Chart, intake?: Intake | null): string {
  const lagna = chart.ascendant.sign;
  const lord = chart.ascendant.lord;
  const m = moon(chart);
  const dasha = currentDasha(chart);
  const d9 = chart.ascendant.navamsa;
  const call = intake?.callName || intake?.name;
  const you = call ? `${call}, with` : "With";

  const id = mod.id;

  if (id === "chart_frame") {
    const h10 = planetInHouse(chart, 10);
    const occ = h10.length ? ` The 10th house holds ${h10.join(" and ")}.` : "";
    return `${you} ${lagna} rising (ruled by ${lord}), this frame is the map every later life area reads against.${occ}`;
  }

  if (id === "panchanga") {
    const t = chart.tithi;
    const yoga = (chart as Chart & { panchanga?: { yoga?: { name: string } } }).panchanga?.yoga?.name;
    const bit = yoga ? ` Combined yoga: ${yoga}.` : "";
    return `${you} Moon in ${m?.sign ?? "—"} on lunar day ${t.name} (${t.paksha}), that day's quality sits under your ${lagna} rising.${bit}`;
  }

  if (id === "sensitivity") {
    const lg = chart.sensitivity.lagna.minutes_later_survives;
    const critical = chart.sensitivity.time_critical;
    if (critical) {
      return `${you} ${lagna} rising, the rising sign flips within about ${lg ?? "a few"} minutes — keep finer maps quiet until the clock is firm.`;
    }
    return `${you} ${lagna} rising holding for roughly ${lg ?? "many"} minutes either side, the main chart is steady enough; finer maps still want a firm birth time.`;
  }

  const vargaMatch = /^(d\d+)_(placements|reading)$/.exec(id);
  if (vargaMatch) {
    const key = vargaMatch[1]; // d1, d9, …
    const kind = vargaMatch[2];
    const vargas = (chart as Chart & { vargas?: Record<string, { lagna?: string; planets?: { name: string; sign: string }[] }> })
      .vargas;
    const slice = vargas?.[key];
    const sliceLagna = slice?.lagna ?? (key === "d9" ? d9 : key === "d1" ? lagna : null);
    const domainHook = mod.domain.split(",")[0]?.trim() ?? mod.domain;

    if (key === "d1") {
      return kind === "reading"
        ? `${you} ${lagna} rising and Moon in ${m?.sign ?? "—"}, this is how body and life path show under your current ${dasha ? `${dasha} period` : "running period"}.`
        : `${you} ${lagna} rising, these are the house and sign placements for ${domainHook.toLowerCase()}.`;
    }
    if (key === "d9") {
      return kind === "reading"
        ? `${you} partnership-map rising in ${d9} while the main chart rises in ${lagna}, this area speaks to dharma and partnership tone — not the full vocation report.`
        : `${you} partnership-map rising ${d9}, these signs sit under your ${lagna} birth frame.`;
    }
    if (key === "d10") {
      const h10lord = chart.houses.find((h) => h.house === 10)?.lord;
      return kind === "reading"
        ? `${you} ${lagna} rising and 10th-house ruler ${h10lord ?? "—"}, this is where public role pressure concentrates for you.`
        : `${you} 10th-house ruler ${h10lord ?? "—"} from ${lagna}, these are career-frame placements only.`;
    }
    if (key === "d2") {
      return `${you} ${lagna} rising, this money map only lands in Cancer or Leo — that polarity is how resource and speech lean for you.`;
    }
    if (key === "d30") {
      const mins = chart.sensitivity.lagna.minutes_later_survives;
      return `${you} ${lagna} rising, this caution map tracks friction and health flags; boundaries are uneven —${mins != null && mins < 15 ? " birth time is tight here." : " trust the main chart more near the edges."}`;
    }
    if (sliceLagna) {
      return `${you} ${lagna} rising and this area's rising tone in ${sliceLagna}, ${domainHook.toLowerCase()} is what this map isolates for you${dasha ? ` during ${dasha}` : ""}.`;
    }
    return `${you} ${lagna} rising${dasha ? ` in ${dasha}` : ""}, ${domainHook.toLowerCase()} is why this area matters for your chart.`;
  }

  if (id === "past_check") {
    return `${you} ${lagna} rising${dasha ? ` and running ${dasha}` : ""}, the past-check asks the chart to earn trust against periods you already lived.`;
  }
  if (id === "reports" || id === "guidance" || id === "protocol") {
    return `${you} ${lagna} rising and partnership map in ${d9}${dasha ? `, under ${dasha}` : ""}, the full protocol weaves the atlas into one forward path.`;
  }

  return `${you} ${lagna} rising, ${mod.domain.charAt(0).toLowerCase()}${mod.domain.slice(1)}.`;
}

/** Deterministic personalized subtitle for a catalog module. */
export function moduleSubtitle(mod: ModuleDef, chart: Chart, intake?: Intake | null): ModuleSubtitle {
  const relevance = buildRelevance(mod, chart, intake).replace(/\s+/g, " ").trim();
  const name = mod.label || mod.title;
  const hook = mod.domain.split(",")[0]?.trim() ?? mod.domain;
  return {
    domain: mod.domain,
    relevance,
    line: `${name} — ${hook}. ${relevance}`,
  };
}

export function subtitlesForModules(
  modules: ModuleDef[],
  chart: Chart,
  intake?: Intake | null,
): Record<string, ModuleSubtitle> {
  const out: Record<string, ModuleSubtitle> = {};
  for (const m of modules) {
    out[m.id] = moduleSubtitle(m, chart, intake);
  }
  return out;
}
