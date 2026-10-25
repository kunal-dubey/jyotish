/**
 * Free-tier "right now" + life-area counsel — deterministic templates.
 * Surface: plain counsel (no astrology required). Expand: chart factors.
 * Full protocol still owns scored decade synthesis after the past-check.
 */

import type { FreeCounsel } from "./freeCounselSchema";
import type { Chart, Intake, Planet } from "./types";

export type LifeAreaCounsel = {
  id: string;
  area: string;
  /** Plain: what kind of force leads this area. */
  ledBy: string;
  /** Plain: how this period colors the area. */
  today: string;
  /** Plain: one concrete focus — unique per area. */
  focus: string;
  /** Expand: planet / house specifics for curious readers. */
  chartDetail: {
    summary: string;
    lines: string[];
  };
};

export type RightNowBrief = {
  headline: string;
  plain: string;
  period: {
    label: string;
    /** Plain chapter description. */
    meaning: string;
    /** Expand: dasha names + dates. */
    chartDetail: { summary: string; lines: string[] };
  } | null;
  sky: { label: string; detail: string; chartDetail?: string }[];
  areas: LifeAreaCounsel[];
  boundary: string;
};

const PLANET_PLAIN: Record<string, string> = {
  Sun: "visibility, duty, and standing",
  Moon: "mood, care, and home ground",
  Mars: "drive, heat, and clean initiative",
  Mercury: "speech, trade, and quick moves",
  Jupiter: "growth, teaching, and honest expansion",
  Venus: "bond, ease, and desire",
  Saturn: "structure, patience, and lasting duty",
  Rahu: "hunger for the unfamiliar",
  Ketu: "release and unfinished threads",
};

/** Area-specific focus lines keyed by the active coloring planet — never identical across areas. */
const AREA_FOCUS: Record<string, Record<string, string>> = {
  work: {
    Sun: "Put one work result where others can see it — claim the duty in the open.",
    Moon: "Protect one rest block on the calendar so public work doesn't eat your care.",
    Mars: "Ship the hard first step of one project before noon; heat into motion, not argument.",
    Mercury: "Send one clear work update or proposal — short, dated, no fog.",
    Jupiter: "Offer to teach or sponsor one person; widen the role without padding the title.",
    Venus: "Improve one client or teammate relationship with a concrete kindness, not a pitch.",
    Saturn: "Finish one overdue work promise on the date you already named — no new launches.",
    Rahu: "Try one unfamiliar channel or audience once, then return to your main lane.",
    Ketu: "Drop one empty status meeting or vanity goal; free the hours for real output.",
  },
  partnership: {
    Sun: "Name one shared duty with your partner out loud — lead the logistics, don't wait.",
    Moon: "Ask how they are before solving; one check-in without fixing.",
    Mars: "Clear one simmering conflict with a single honest sentence — then stop.",
    Mercury: "Say the awkward thing cleanly once; no three-day draft spiral.",
    Jupiter: "Plan one generous shared future step (trip, home, learning) — keep it real-sized.",
    Venus: "Give time or beauty without a scorecard — one gesture that restores the bond.",
    Saturn: "Keep one relationship promise on time; reliability over romance theater.",
    Rahu: "Try one new shared context (people, place, ritual) without forcing chemistry.",
    Ketu: "Release one old grievance you both already know; leave the space empty.",
  },
  mind: {
    Sun: "Step outside for daylight before deciding anything heavy — mind follows the body.",
    Moon: "Keep one care ritual sacred today; decide only after you feel settled.",
    Mars: "Move the body hard once, then return to the question — burn off the static.",
    Mercury: "Journal one page of what is actually true vs what is noise.",
    Jupiter: "Read or listen to one steadying voice; widen perspective, don't doomscroll.",
    Venus: "Choose one comfort that restores (not numbs) — music, meal, soft room.",
    Saturn: "Keep the bedtime or morning structure you already set; mood follows rhythm.",
    Rahu: "Limit one unfamiliar rabbit hole; curiosity with a timer.",
    Ketu: "Sit with emptiness for ten minutes — don't fill every quiet gap.",
  },
  money: {
    Sun: "Make one money decision visible — pay, invoice, or cut — and own it.",
    Moon: "Don't spend from a spike mood; wait one night on any non-essential buy.",
    Mars: "Cut or confront one leak (fee, habit, debt drip) with a single action.",
    Mercury: "Write the next money move in one sentence and do the first 15 minutes.",
    Jupiter: "Allocate a small sum to growth (skill, tool) instead of only buffer fear.",
    Venus: "Spend once on quality that lasts — skip the cheap double-buy.",
    Saturn: "Pay the boring bill first; structure before discretionary wants.",
    Rahu: "Research one new income path for 30 minutes — no leap yet.",
    Ketu: "Cancel one subscription or obligation that no longer serves.",
  },
  drive: {
    Sun: "Lead one initiative others can follow — start visible, finish a slice.",
    Moon: "Pair drive with recovery; one sprint, then a real pause.",
    Mars: "Name the fight worth having and take the first concrete strike.",
    Mercury: "Outline the plan in bullets, then move — talk is not the win.",
    Jupiter: "Channel courage into something that helps more than you — teach or build.",
    Venus: "Pursue the desire that also builds a bond — not solo glory.",
    Saturn: "Sustain yesterday's start; consistency beats a heroic new burst.",
    Rahu: "Point drive at one unusual skill or arena — then stabilize practice.",
    Ketu: "Stop pushing a dead project; redirect the heat where it still matters.",
  },
  learning: {
    Sun: "Share one thing you know — teach to lock the learning in.",
    Moon: "Study only when settled; five focused pages beat an anxious hour.",
    Mars: "Drill one hard skill with a timer — effort over inspiration.",
    Mercury: "Take notes you can reuse; one page of capture, not highlight theater.",
    Jupiter: "Go deeper on meaning, not trivia — one concept until it sticks.",
    Venus: "Learn something beautiful on purpose (art, language, craft) for joy.",
    Saturn: "Stick to the study schedule you set; show up even when dull.",
    Rahu: "Sample one foreign subject or teacher — then decide if it earns a seat.",
    Ketu: "Drop one course or thread you won't finish; free attention for the real one.",
  },
};

function planetOf(chart: Chart, name: string): Planet | undefined {
  return chart.planets.find((p) => p.name === name);
}

function house(chart: Chart, n: number) {
  return chart.houses.find((h) => h.house === n);
}

function plainOf(p: string) {
  return PLANET_PLAIN[p] ?? `matters of ${p}`;
}

function focusFor(areaId: string, planet: string): string {
  return (
    AREA_FOCUS[areaId]?.[planet] ??
    `Take one clear action in this area this week — small enough to finish, honest enough to matter.`
  );
}

function conditionPlain(p: Planet | undefined): string {
  if (!p) return "";
  if (p.dignity === "exalted" || p.dignity === "own sign") return " That support is comparatively strong for you.";
  if (p.dignity === "debilitated") return " That support runs under strain — don't force volume.";
  if (p.retrograde) return " Revision and rework fit better than brand-new launches here.";
  return "";
}

function conditionTech(p: Planet | undefined): string {
  if (!p) return "";
  const bits: string[] = [];
  if (p.dignity) bits.push(p.dignity);
  if (p.retrograde) bits.push("retrograde");
  return bits.length ? ` (${bits.join(", ")})` : "";
}

type AreaSpec = {
  id: string;
  area: string;
  house: number;
  also?: string;
  /** Plain label for what the house means. */
  housePlain: string;
};

const AREA_SPECS: AreaSpec[] = [
  { id: "work", area: "Work & public role", house: 10, housePlain: "public work and standing" },
  { id: "partnership", area: "Partnership & closeness", house: 7, housePlain: "one-to-one bonds" },
  { id: "mind", area: "Mind, home & care", house: 4, also: "Moon", housePlain: "inner weather and home ground" },
  { id: "money", area: "Money & speech", house: 2, housePlain: "resources and how you speak" },
  { id: "drive", area: "Drive & initiative", house: 3, also: "Mars", housePlain: "courage and first moves" },
  { id: "learning", area: "Learning & meaning", house: 9, housePlain: "study, faith, and longer meaning" },
];

type Touch = {
  today: string;
  focusPlanet: string;
  detailLines: string[];
};

function periodTouch(
  chart: Chart,
  houseNum: number,
  lord: string,
  md: string | undefined,
  ad: string | undefined,
  housePlain: string,
): Touch {
  const occupants = chart.planets.filter((p) => p.house === houseNum).map((p) => p.name);
  const lordP = planetOf(chart, lord);
  const until = chart.vimshottari.current?.ad_end;
  const detailLines: string[] = [];

  if (ad && lord === ad) {
    detailLines.push(
      `Antardasha lord ${ad} is also the lord of house ${houseNum} — this area is emphasized until ${until ?? "this chapter ends"}.`,
    );
    return {
      today: `This shorter chapter puts ${plainOf(ad)} front and center in ${housePlain}.${conditionPlain(lordP)}`,
      focusPlanet: ad,
      detailLines,
    };
  }
  if (md && lord === md) {
    detailLines.push(`Mahadasha lord ${md} is also the lord of house ${houseNum} — a longer arc for this area.`);
    return {
      today: `Your longer chapter favors ${plainOf(md)} here — pace in months, not a one-week sprint.${conditionPlain(lordP)}`,
      focusPlanet: md,
      detailLines,
    };
  }
  if (ad && occupants.includes(ad)) {
    detailLines.push(
      `${ad} (current antardasha) occupies house ${houseNum}. Events tend to cluster here until ${until ?? "this chapter ends"}.`,
    );
    return {
      today: `Attention and events are clustering around ${housePlain} in this shorter chapter — ${plainOf(ad)} is active here.`,
      focusPlanet: ad,
      detailLines,
    };
  }
  if (md && occupants.includes(md)) {
    detailLines.push(`${md} (current mahadasha) occupies house ${houseNum}.`);
    return {
      today: `The backdrop of ${housePlain} is colored by ${plainOf(md)} across this longer chapter.`,
      focusPlanet: md,
      detailLines,
    };
  }
  if (ad) {
    detailLines.push(
      `House ${houseNum} is ruled by ${lord}; current antardasha is ${ad} — soft overlay of ${plainOf(ad)}.`,
    );
    return {
      today: `This period lightly tints ${housePlain} with ${plainOf(ad)}, while ${plainOf(lord)} still owns the area.${conditionPlain(lordP)}`,
      focusPlanet: ad,
      detailLines,
    };
  }
  detailLines.push(`House ${houseNum} lord ${lord}; no live dasha overlay.`);
  return {
    today: `${plainOf(lord)} sets the tone for ${housePlain}.${conditionPlain(lordP)}`,
    focusPlanet: lord,
    detailLines,
  };
}

function buildArea(chart: Chart, spec: AreaSpec, md?: string, ad?: string): LifeAreaCounsel {
  const h = house(chart, spec.house);
  const lord = h?.lord ?? "—";
  const lordP = planetOf(chart, lord);
  const occupants = chart.planets.filter((p) => p.house === spec.house);

  const ledBy = `This area is led by ${plainOf(lord)}.${conditionPlain(lordP)}`;

  const { today, focusPlanet, detailLines } = periodTouch(chart, spec.house, lord, md, ad, spec.housePlain);

  const lines: string[] = [
    `${lord} rules house ${spec.house}${
      lordP
        ? ` and sits in house ${lordP.house} (${lordP.sign}${conditionTech(lordP)})`
        : ""
    }.`,
    ...detailLines,
  ];
  if (occupants.length) {
    lines.push(
      `In house ${spec.house} now: ${occupants.map((p) => `${p.name} in ${p.sign}${conditionTech(p)}`).join("; ")}.`,
    );
  } else {
    lines.push(`House ${spec.house} has no natal planets sitting in it.`);
  }
  if (spec.also) {
    const also = planetOf(chart, spec.also);
    if (also) {
      lines.push(
        `${spec.also} also speaks here — in ${also.sign}, house ${also.house}${conditionTech(also)}.`,
      );
    }
  }

  return {
    id: spec.id,
    area: spec.area,
    ledBy,
    today,
    focus: focusFor(spec.id, focusPlanet),
    chartDetail: {
      summary: `Chart factors · house ${spec.house} · ${lord}`,
      lines,
    },
  };
}

/** Build the included-with-every-reading "right now" brief + life-area counsel. */
export function buildRightNow(
  chart: Chart,
  intake?: Intake | null,
  freeCounsel?: FreeCounsel | null,
): RightNowBrief {
  const name = intake?.callName || intake?.name || "You";
  const cur = chart.vimshottari.current;
  const st = chart.transits.status;
  const md = cur?.mahadasha;
  const ad = cur?.antardasha;

  let period: RightNowBrief["period"] = null;
  if (cur) {
    const mdEnd =
      cur.md_end ??
      chart.vimshottari.mahadashas.find((m) => m.lord === cur.mahadasha && m.status === "current")?.end;
    period = {
      label: "This chapter",
      meaning: `You're in a longer stretch shaped by ${plainOf(cur.mahadasha)}, with a shorter stretch of ${plainOf(cur.antardasha)}. The cards below apply that to each life area.`,
      chartDetail: {
        summary: "Period names & dates",
        lines: [
          `Mahadasha: ${cur.mahadasha} until ${mdEnd ?? "—"}`,
          `Antardasha: ${cur.antardasha} until ${cur.ad_end}`,
        ],
      },
    };
  }

  const sky: RightNowBrief["sky"] = [];
  if (st.sade_sati) {
    sky.push({
      label: "Slow weather",
      detail: st.sade_sati_phase
        ? `A long patience stretch is on (${st.sade_sati_phase.replace(/_/g, " ")}). Prefer endurance and honest limits in care and mood — not panic moves.`
        : "A long patience stretch is on around emotional weather. Steady care routines first.",
      chartDetail: st.sade_sati_phase
        ? `Sade sati · phase ${st.sade_sati_phase}`
        : "Sade sati active",
    });
  } else if (st.ashtama_shani) {
    sky.push({
      label: "Slow weather",
      detail: "Pressure through deep change is flagged. Keep one structural promise and don't force big leaps.",
      chartDetail: "Ashtama Shani flagged (Saturn 8th from Moon)",
    });
  }

  const areas = AREA_SPECS.map((spec) => buildArea(chart, spec, md, ad));
  const counselById = Object.fromEntries((freeCounsel?.rightNow.areas ?? []).map((a) => [a.id, a]));
  const merged = areas.map((a) => {
    const hit = counselById[a.id];
    if (!hit) return a;
    return { ...a, ledBy: hit.ledBy, today: hit.today, focus: hit.focus };
  });

  return {
    headline: cur
      ? `${name}: what matters in this chapter`
      : `${name}: how the main life areas are led`,
    plain:
      "Simple counsel first — what leads each area, how this chapter colors it, what to focus on. Open chart detail only if you want the planets and houses behind it.",
    period,
    sky,
    areas: merged,
    boundary:
      "Included with every reading. The full protocol (blind past-check you score, then forward reports) is where these notes become a calibrated story with dates and priorities for the decade.",
  };
}
