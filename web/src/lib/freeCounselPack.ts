/**
 * Deterministic chart facts for free-tier counsel.
 * The LLM may only write from this pack — it must not invent placements.
 */

import type { Chart, Intake, Planet } from "./types";

export const RIGHT_NOW_AREA_SPECS: {
  id: string;
  area: string;
  house: number;
  also?: string;
  domain: string;
}[] = [
  { id: "work", area: "Work & public role", house: 10, domain: "public work and standing" },
  { id: "partnership", area: "Partnership & closeness", house: 7, domain: "one-to-one bonds" },
  { id: "mind", area: "Mind, home & care", house: 4, also: "Moon", domain: "inner weather and home ground" },
  { id: "money", area: "Money & speech", house: 2, domain: "resources and how you speak" },
  { id: "drive", area: "Drive & initiative", house: 3, also: "Mars", domain: "courage and first moves" },
  { id: "learning", area: "Learning & meaning", house: 9, domain: "study, faith, and longer meaning" },
];

/** Vargas that get free Tier B counsel cards. */
export const FREE_VARGA_KEYS = [
  "d1",
  "d2",
  "d3",
  "d4",
  "d7",
  "d9",
  "d10",
  "d12",
  "d16",
  "d20",
  "d24",
  "d27",
  "d30",
] as const;

export type FreeVargaKey = (typeof FREE_VARGA_KEYS)[number];

export const VARGA_DOMAIN: Record<FreeVargaKey, { title: string; domain: string }> = {
  d1: { title: "Body & life path", domain: "body and the broad shape of a life" },
  d2: { title: "Money & speech", domain: "resources and how you speak" },
  d3: { title: "Siblings & drive", domain: "courage, peers, and initiative" },
  d4: { title: "Home & settled peace", domain: "home ground and settled ease" },
  d7: { title: "Children & creative legacy", domain: "children and what you leave behind" },
  d9: { title: "Partnership & deeper purpose", domain: "partnership tone and maturing purpose" },
  d10: { title: "Work & public role", domain: "public work and standing" },
  d12: { title: "Parents & ancestry", domain: "parents and the inherited line" },
  d16: { title: "Comforts & vehicles", domain: "everyday comforts and conveyances" },
  d20: { title: "Practice & grace", domain: "practice, meditation, and grace" },
  d24: { title: "Learning & memory", domain: "study and intellectual capacity" },
  d27: { title: "Strength & undercurrents", domain: "vitality and subconscious drives" },
  d30: { title: "Friction & health flags", domain: "friction and structural health flags" },
};

function planetBrief(p: Planet) {
  return {
    name: p.name,
    sign: p.sign,
    house: p.house,
    dignity: p.dignity,
    retrograde: p.retrograde,
  };
}

function planetOf(chart: Chart, name: string): Planet | undefined {
  return chart.planets.find((p) => p.name === name);
}

export type FreeCounselPack = {
  person: { callName: string; occupation?: string; practice?: string };
  rising: { sign: string; lord: string; element: string };
  moon: ReturnType<typeof planetBrief> | null;
  period: {
    mahadasha: string;
    antardasha: string;
    adEnd: string;
    mdEnd: string | null;
  } | null;
  sky: {
    sadeSati: boolean;
    sadeSatiPhase: string | null;
    ashtamaShani: boolean;
  };
  rightNowAreas: {
    id: string;
    area: string;
    domain: string;
    house: number;
    houseSign: string;
    lord: string;
    lordPlacement: ReturnType<typeof planetBrief> | null;
    occupants: ReturnType<typeof planetBrief>[];
    also?: ReturnType<typeof planetBrief> | null;
  }[];
  vargas: {
    key: FreeVargaKey;
    title: string;
    domain: string;
    lagna: string | null;
    lagnaLord: string | null;
    planets: { name: string; sign: string; dignity?: string | null }[];
  }[];
};

/** Compact facts pack for the free-counsel LLM (and debugging). */
export function buildFreeCounselPack(chart: Chart, intake?: Intake | null): FreeCounselPack {
  const callName = intake?.callName || intake?.name || "the native";
  const moon = planetOf(chart, "Moon");
  const cur = chart.vimshottari.current;
  const mdEnd =
    cur?.md_end ??
    chart.vimshottari.mahadashas.find((m) => m.lord === cur?.mahadasha && m.status === "current")?.end ??
    null;

  const rightNowAreas = RIGHT_NOW_AREA_SPECS.map((spec) => {
    const h = chart.houses.find((x) => x.house === spec.house);
    const lord = h?.lord ?? "—";
    const lordP = planetOf(chart, lord);
    const occupants = chart.planets.filter((p) => p.house === spec.house).map(planetBrief);
    const alsoName = "also" in spec ? spec.also : undefined;
    return {
      id: spec.id,
      area: spec.area,
      domain: spec.domain,
      house: spec.house,
      houseSign: h?.sign ?? "—",
      lord,
      lordPlacement: lordP ? planetBrief(lordP) : null,
      occupants,
      also: alsoName ? (planetOf(chart, alsoName) ? planetBrief(planetOf(chart, alsoName)!) : null) : undefined,
    };
  });

  const vargaSlices = chart.vargas ?? {};
  const vargas = FREE_VARGA_KEYS.map((key) => {
    const meta = VARGA_DOMAIN[key];
    const slice = vargaSlices[key];
    const lagna =
      slice?.lagna ?? (key === "d1" ? chart.ascendant.sign : key === "d9" ? chart.ascendant.navamsa : null);
    return {
      key,
      title: meta.title,
      domain: meta.domain,
      lagna: lagna ?? null,
      lagnaLord: slice?.lagna_lord ?? null,
      planets: (slice?.planets ?? []).slice(0, 9).map((p) => ({
        name: p.name,
        sign: p.sign,
        dignity: p.dignity ?? null,
      })),
    };
  });

  return {
    person: {
      callName,
      occupation: intake?.occupation,
      practice: intake?.practice,
    },
    rising: {
      sign: chart.ascendant.sign,
      lord: chart.ascendant.lord,
      element: chart.ascendant.element,
    },
    moon: moon ? planetBrief(moon) : null,
    period: cur
      ? {
          mahadasha: cur.mahadasha,
          antardasha: cur.antardasha,
          adEnd: cur.ad_end,
          mdEnd,
        }
      : null,
    sky: {
      sadeSati: chart.transits.status.sade_sati,
      sadeSatiPhase: chart.transits.status.sade_sati_phase,
      ashtamaShani: chart.transits.status.ashtama_shani,
    },
    rightNowAreas,
    vargas,
  };
}
