/**
 * Shared reading/calc module catalog.
 * access free → included with every reading; paid → full protocol.
 * User-facing copy uses `label` / `plain` — never "Tier A/B" or "free modules".
 */

export type ModuleTier = "A" | "B" | "C";
export type ModuleAccess = "free" | "paid";
export type ModuleStatus = "ready" | "coming";

export type RelevanceHint =
  | "lagna"
  | "moon"
  | "current_dasha"
  | "d9_lagna"
  | "house_lords"
  | "tithi"
  | "sensitivity"
  | "varga_placements";

export type ModuleDef = {
  id: string;
  /** Internal / classical short title. */
  title: string;
  /** Plain label shown to end users. */
  label: string;
  /** Classical name shown quietly (e.g. "Dashamsha · D10"). */
  classical?: string;
  /** Beginner explanation of what this section is. */
  plain: string;
  tier: ModuleTier;
  access: ModuleAccess;
  domain: string;
  relevanceHints: RelevanceHint[];
  status: ModuleStatus;
  stage?: "past" | "reports" | "guidance" | "protocol";
};

/** Topic card for interactive navigation (one life area, facts + plain reading). */
export type ChartTopic = {
  id: string;
  label: string;
  classical?: string;
  plain: string;
  groupId: string;
  groupLabel: string;
  access: ModuleAccess;
  status: ModuleStatus;
  /** Module ids to pull body content from. */
  placementId?: string;
  readingId?: string;
  factId?: string;
};

function free(tier: "A" | "B", partial: Omit<ModuleDef, "tier" | "access">): ModuleDef {
  return { ...partial, tier, access: "free" };
}

function paid(partial: Omit<ModuleDef, "tier" | "access">): ModuleDef {
  return { ...partial, tier: "C", access: "paid" };
}

type VargaMeta = {
  id: string;
  title: string;
  label: string;
  classical: string;
  domain: string;
  plain: string;
  groupId: string;
  groupLabel: string;
  status: ModuleStatus;
};

const VARGA_META: VargaMeta[] = [
  {
    id: "d1",
    title: "D1 Rashi",
    label: "Body & life path",
    classical: "Rashi · D1",
    domain: "Physical incarnation, body, overall life path",
    plain:
      "The main birth chart — twelve houses around the rising sign. It sketches the body, temperament, and the broad shape of a life.",
    groupId: "path",
    groupLabel: "Life path",
    status: "ready",
  },
  {
    id: "d2",
    title: "D2 Hora",
    label: "Money & speech",
    classical: "Hora · D2",
    domain: "Wealth accumulation, speech, resource polarity",
    plain:
      "A simple split of the chart into two resource tones. It hints at how money and speech tend to lean — not a bank balance.",
    groupId: "resources",
    groupLabel: "Home & resources",
    status: "ready",
  },
  {
    id: "d3",
    title: "D3 Dreshkana",
    label: "Siblings & drive",
    classical: "Dreshkana · D3",
    domain: "Siblings, drive, entrepreneurial courage",
    plain:
      "Looks at initiative, courage, and the sibling / peer field — the push to start things and stand beside others.",
    groupId: "bonds",
    groupLabel: "Bonds & lineage",
    status: "ready",
  },
  {
    id: "d4",
    title: "D4 Chaturthamsha",
    label: "Home & settled peace",
    classical: "Chaturthamsha · D4",
    domain: "Fixed assets, real estate, home, inner peace",
    plain:
      "About home ground: property, roots, and the quieter sense of being settled. Not a property appraisal.",
    groupId: "resources",
    groupLabel: "Home & resources",
    status: "ready",
  },
  {
    id: "d7",
    title: "D7 Saptamsha",
    label: "Children & creative legacy",
    classical: "Saptamsha · D7",
    domain: "Children, grandchildren, creative legacy",
    plain:
      "Speaks to children and what you leave behind creatively — projects and people that outlast a single chapter.",
    groupId: "bonds",
    groupLabel: "Bonds & lineage",
    status: "ready",
  },
  {
    id: "d9",
    title: "D9 Navamsha",
    label: "Partnership & deeper purpose",
    classical: "Navamsha · D9",
    domain: "Soul purpose, post-30 potential, spouse traits",
    plain:
      "A finer chart for marriage tone, dharma, and how the person matures. Often read alongside the main chart, not instead of it.",
    groupId: "path",
    groupLabel: "Life path",
    status: "ready",
  },
  {
    id: "d10",
    title: "D10 Dashamsha",
    label: "Work & public role",
    classical: "Dashamsha · D10",
    domain: "Profession, career peak, public status",
    plain:
      "Where public work and status show up. It names pressures and strengths in vocation — not a job title or salary.",
    groupId: "work",
    groupLabel: "Work & standing",
    status: "ready",
  },
  {
    id: "d12",
    title: "D12 Dwadamsha",
    label: "Parents & ancestry",
    classical: "Dwadamsha · D12",
    domain: "Parents, lineage, genetic and ancestral karma",
    plain:
      "Parents and the inherited line — patterns that arrived before you chose anything.",
    groupId: "bonds",
    groupLabel: "Bonds & lineage",
    status: "ready",
  },
  {
    id: "d16",
    title: "D16 Shodashamsha",
    label: "Comforts & vehicles",
    classical: "Shodashamsha · D16",
    domain: "Vehicles, comforts, emotional happiness",
    plain:
      "Everyday ease: comforts, conveyances, and the small felicities that make a life feel livable.",
    groupId: "resources",
    groupLabel: "Home & resources",
    status: "ready",
  },
  {
    id: "d20",
    title: "D20 Vishamsha",
    label: "Practice & grace",
    classical: "Vishamsha · D20",
    domain: "Spiritual progress, meditation, grace",
    plain:
      "Inclination toward practice, meditation, and moments of grace — not a certificate of enlightenment.",
    groupId: "inner",
    groupLabel: "Inner life",
    status: "ready",
  },
  {
    id: "d24",
    title: "D24 Chaturvimshamsha",
    label: "Learning & memory",
    classical: "Chaturvimshamsha · D24",
    domain: "Higher education, memory, intellectual capacity",
    plain:
      "How learning lands: study, memory, and the shape of intellectual capacity.",
    groupId: "inner",
    groupLabel: "Inner life",
    status: "ready",
  },
  {
    id: "d27",
    title: "D27 Saptavimshamsha",
    label: "Strength & undercurrents",
    classical: "Saptavimshamsha · D27",
    domain: "Physical strength and weakness, subconscious drives",
    plain:
      "Vitality and subconscious drives — where energy holds or frays beneath the surface.",
    groupId: "inner",
    groupLabel: "Inner life",
    status: "ready",
  },
  {
    id: "d30",
    title: "D30 Trimshamsha",
    label: "Friction & health flags",
    classical: "Trimshamsha · D30",
    domain: "Misfortune, internal vice, structural health",
    plain:
      "A caution chart: friction, vice tendencies, and structural health flags. Boundaries are uneven — treat soft birth times carefully here.",
    groupId: "inner",
    groupLabel: "Inner life",
    status: "ready",
  },
  {
    id: "d40",
    title: "D40 Khavedamsha",
    label: "Mother's line",
    classical: "Khavedamsha · D40",
    domain: "Matrilineal karma",
    plain: "A fine division for themes that travel through the maternal line. Needs a firm birth time.",
    groupId: "fine",
    groupLabel: "Fine divisionals",
    status: "coming",
  },
  {
    id: "d45",
    title: "D45 Akshavedamsha",
    label: "Father's line",
    classical: "Akshavedamsha · D45",
    domain: "Patrilineal karma, character integrity",
    plain: "A fine division for themes through the paternal line and character integrity. Needs a firm birth time.",
    groupId: "fine",
    groupLabel: "Fine divisionals",
    status: "coming",
  },
  {
    id: "d60",
    title: "D60 Shashtiamsha",
    label: "Deepest individual grain",
    classical: "Shashtiamsha · D60",
    domain: "Past-life action, exact individual destiny",
    plain:
      "The finest classical slice — past-life coloring and exact destiny grain. Only trustworthy with a precise clock.",
    groupId: "fine",
    groupLabel: "Fine divisionals",
    status: "coming",
  },
];

const foundationFacts: ModuleDef[] = [
  free("A", {
    id: "chart_frame",
    title: "Chart frame",
    label: "Rising sign & planets",
    classical: "Rashi frame",
    plain:
      "The sky at the birth moment arranged into twelve houses from the rising sign. Planets here are the cast; houses are the rooms of life.",
    domain: "Ascendant, houses, planets, and lordships for the birth moment",
    relevanceHints: ["lagna", "moon", "house_lords", "sensitivity"],
    status: "ready",
  }),
  free("A", {
    id: "panchanga",
    title: "Panchanga",
    label: "The day you were born",
    classical: "Panchanga",
    plain:
      "Five classical limbs of the lunar day — lunar day (tithi), star (nakshatra), yoga, half-day (karana), and weekday. They set the quality of that day, not your whole life.",
    domain: "Tithi, nakshatra, yoga, karana, vara, and Dagdha Rashi at birth",
    relevanceHints: ["tithi", "moon", "lagna"],
    status: "ready",
  }),
  free("A", {
    id: "sensitivity",
    title: "Birth-time sensitivity",
    label: "How sure is the clock?",
    classical: "Sensitivity margins",
    plain:
      "Shows how many minutes the rising sign and finer charts survive a birth-time shift. Soft times make fine charts quieter; the main chart usually still holds.",
    domain: "How many minutes the lagna, D9 lagna, and Moon nakshatra survive a time shift",
    relevanceHints: ["sensitivity", "lagna", "d9_lagna"],
    status: "ready",
  }),
];

const tierAFacts: ModuleDef[] = [
  ...foundationFacts,
  ...VARGA_META.filter((v) => !["d40", "d45", "d60"].includes(v.id)).map((v) =>
    free("A", {
      id: `${v.id}_placements`,
      title: `${v.title} placements`,
      label: `${v.label} — map`,
      classical: v.classical,
      plain: v.plain,
      domain: v.domain,
      relevanceHints: ["varga_placements", "lagna", "d9_lagna"],
      status: v.status,
    }),
  ),
];

const tierBReadings: ModuleDef[] = VARGA_META.filter((v) => !["d40", "d45", "d60"].includes(v.id)).map((v) =>
  free("B", {
    id: `${v.id}_reading`,
    title: `${v.title} reading`,
    label: `${v.label} — in plain words`,
    classical: v.classical,
    plain: v.plain,
    domain: v.domain,
    relevanceHints: ["varga_placements", "lagna", "moon", "current_dasha", "d9_lagna"],
    status: v.status,
  }),
);

const tierCPaid: ModuleDef[] = [
  paid({
    id: "past_check",
    title: "Blind past-check",
    label: "Blind past-check",
    plain:
      "The chart makes concrete claims about periods you already lived — before it is allowed to speak about the future. You score those claims.",
    domain: "Falsifiable claims about lived periods, scored before forward reports",
    relevanceHints: ["current_dasha", "lagna", "moon"],
    status: "ready",
    stage: "past",
  }),
  paid({
    id: "reports",
    title: "Reports 3 to 6",
    label: "Forward reports",
    plain:
      "Timeline, vocation, inner life, and a confidence audit — written only after your past-check score is in hand.",
    domain: "Timeline, vocation, inner life, and confidence audit after the score",
    relevanceHints: ["current_dasha", "lagna", "d9_lagna", "house_lords"],
    status: "ready",
    stage: "reports",
  }),
  paid({
    id: "guidance",
    title: "Plain-language guidance",
    label: "Decade guidance",
    plain: "The same substance without the technical vocabulary — priorities, seasons, and counsel for the decade ahead.",
    domain: "Decade counsel without the technical vocabulary",
    relevanceHints: ["current_dasha", "lagna", "moon"],
    status: "ready",
    stage: "guidance",
  }),
  paid({
    id: "protocol",
    title: "Living protocol",
    label: "Living protocol",
    plain:
      "A keepable page that recomputes weekday, periods, and Saturn countdown each time it opens — a companion, not a one-time PDF.",
    domain: "A keepable page that recomputes weekday, periods, and Saturn countdown",
    relevanceHints: ["current_dasha", "lagna"],
    status: "ready",
    stage: "protocol",
  }),
  ...VARGA_META.filter((v) => ["d40", "d45", "d60"].includes(v.id)).flatMap((v) => [
    paid({
      id: `${v.id}_placements`,
      title: `${v.title} placements`,
      label: `${v.label} — map`,
      classical: v.classical,
      plain: v.plain,
      domain: v.domain,
      relevanceHints: ["varga_placements", "sensitivity"],
      status: v.status,
    }),
    paid({
      id: `${v.id}_reading`,
      title: `${v.title} reading`,
      label: `${v.label} — in plain words`,
      classical: v.classical,
      plain: v.plain,
      domain: v.domain,
      relevanceHints: ["varga_placements", "sensitivity", "lagna"],
      status: v.status,
    }),
  ]),
];

export const MODULES: ModuleDef[] = [...tierAFacts, ...tierBReadings, ...tierCPaid];

export const MODULE_BY_ID: Record<string, ModuleDef> = Object.fromEntries(MODULES.map((m) => [m.id, m]));

/** Interactive topics for the chart atlas UI (foundations + life areas). */
export const CHART_TOPICS: ChartTopic[] = [
  {
    id: "rising",
    label: "Rising sign & planets",
    classical: "Rashi frame",
    plain: foundationFacts[0].plain,
    groupId: "foundations",
    groupLabel: "Foundations",
    access: "free",
    status: "ready",
    factId: "chart_frame",
  },
  {
    id: "birth_day",
    label: "The day you were born",
    classical: "Panchanga",
    plain: foundationFacts[1].plain,
    groupId: "foundations",
    groupLabel: "Foundations",
    access: "free",
    status: "ready",
    factId: "panchanga",
  },
  {
    id: "clock",
    label: "How sure is the clock?",
    classical: "Sensitivity",
    plain: foundationFacts[2].plain,
    groupId: "foundations",
    groupLabel: "Foundations",
    access: "free",
    status: "ready",
    factId: "sensitivity",
  },
  ...VARGA_META.map((v) => ({
    id: v.id,
    label: v.label,
    classical: v.classical,
    plain: v.plain,
    groupId: v.groupId,
    groupLabel: v.groupLabel,
    access: (["d40", "d45", "d60"].includes(v.id) ? "paid" : "free") as ModuleAccess,
    status: v.status,
    placementId: `${v.id}_placements`,
    readingId: `${v.id}_reading`,
  })),
];

/** Landing / marketing showcase of included life areas (no jargon). */
export const INCLUDED_SHOWCASE = [
  {
    label: "Right now",
    plain: "For each life area: what leads it, how this period colors it, and one concrete focus — not abstract placements.",
  },
  { label: "Rising sign & planets", plain: "The main map of houses and the cast of planets at birth, when you want the why behind a card." },
  { label: "The birth day", plain: "Lunar day, star, and weekday — the quality of that day." },
  { label: "Work & public role", plain: "Who leads vocation and standing, and what to lean into in this chapter." },
  { label: "Partnership & purpose", plain: "Bond and dharma tone for this period — led by, today, focus." },
  { label: "Home, money, bonds & inner life", plain: "Mind, resources, drive, and learning in the same counsel shape." },
];

export function modulesForAccess(access: ModuleAccess | "all" = "all"): ModuleDef[] {
  if (access === "all") return MODULES;
  return MODULES.filter((m) => m.access === access);
}

export function isPaidModule(id: string): boolean {
  return MODULE_BY_ID[id]?.access === "paid";
}

export function topicGroups(topics: ChartTopic[] = CHART_TOPICS) {
  const order: string[] = [];
  const map = new Map<string, { id: string; label: string; topics: ChartTopic[] }>();
  for (const t of topics) {
    if (!map.has(t.groupId)) {
      order.push(t.groupId);
      map.set(t.groupId, { id: t.groupId, label: t.groupLabel, topics: [] });
    }
    map.get(t.groupId)!.topics.push(t);
  }
  return order.map((id) => map.get(id)!);
}
