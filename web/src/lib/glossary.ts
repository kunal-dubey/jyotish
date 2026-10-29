/** Core terms from the UX / component specs. Chart-specific lines are filled at render time. */

export type GlossaryTerm = {
  id: string;
  label: string;
  plain: string;
  short: string;
  long: string;
  seeAlso?: string[];
  /** Classical name shown beside the plain label in the term explainer */
  chartLabel?: string;
};

export const CORE_WORDS: GlossaryTerm[] = [
  {
    id: "lagna",
    label: "Lagna",
    plain: "rising sign",
    chartLabel: "Lagna",
    short: "The sign coming up over the eastern horizon at the minute you were born.",
    long: "It is the chart’s starting point. The rising sign becomes the 1st house and every other house is counted on from it, which is why the birth time matters so much: the rising sign changes roughly every two hours.",
    seeAlso: ["house", "sign", "chart"],
  },
  {
    id: "house",
    label: "House",
    plain: "house",
    short: "One of twelve slices of life (money, home, work, partners) that the chart is divided into.",
    long: "Houses are counted from the rising sign. The 1st is the body and presence; the rest follow in order around the chart.",
    seeAlso: ["lagna", "sign", "planet"],
  },
  {
    id: "sign",
    label: "Sign",
    plain: "sign",
    short: "One of the twelve 30° sections of the zodiac a planet or the rising point can sit in.",
    long: "Each sign has a ruling planet and a character. Where the rising sign falls sets which sign rules each house.",
    seeAlso: ["lagna", "house", "planet"],
  },
  {
    id: "planet",
    label: "Planet",
    plain: "planet",
    short: "The nine moving points the chart tracks: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu and Ketu.",
    long: "Each planet owns themes and periods of life. Where it sits (sign and house) colours how those themes show up.",
    seeAlso: ["house", "sign", "dasha"],
  },
  {
    id: "dasha",
    label: "Dasha",
    plain: "period",
    chartLabel: "Dasha",
    short: "A chapter of life run by one planet. Jyotish times these chapters from the Moon’s nakshatra at birth.",
    long: "The current mahadasha is the broad chapter; shorter antardashas sit inside it. The atlas and reports lean on which chapter is running.",
    seeAlso: ["planet", "nakshatra", "mahadasha", "antardasha"],
  },
  {
    id: "nakshatra",
    label: "Nakshatra",
    plain: "lunar mansion",
    chartLabel: "Nakshatra",
    short: "One of twenty-seven Moon mansions. The Moon’s nakshatra at birth sets the dasha clock.",
    long: "Each nakshatra has a lord. That lord starts the first mahadasha; the rest follow a fixed sequence.",
    seeAlso: ["dasha", "planet", "pada"],
  },
  {
    id: "chart",
    label: "South Indian chart",
    plain: "South Indian chart",
    short: "A square chart where signs stay in fixed boxes and the rising sign is marked.",
    long: "Unlike a round wheel, the South Indian layout keeps each sign in the same box. The rising sign is tinted so you can count houses from it.",
    seeAlso: ["lagna", "house", "sign"],
  },
  {
    id: "mahadasha",
    label: "Mahadasha",
    plain: "longer chapter",
    chartLabel: "Mahadasha",
    short: "The long life-chapter run by one planet — often years to decades.",
    long: "Vimshottari dasha divides life into sequential chapters. The mahadasha is the outer clock; shorter antardashas sit inside it. The atlas and reports lean on which mahadasha is running.",
    seeAlso: ["dasha", "antardasha", "planet"],
  },
  {
    id: "antardasha",
    label: "Antardasha",
    plain: "shorter chapter",
    chartLabel: "Antardasha",
    short: "A shorter chapter inside the current mahadasha, run by a second planet.",
    long: "While the mahadasha sets the broad tone, the antardasha colours the near term — months to a few years. Convergences of antardasha starts with heavy transits are where past-check claims often land.",
    seeAlso: ["dasha", "mahadasha", "planet"],
  },
  {
    id: "yogakaraka",
    label: "Yogakaraka",
    plain: "special support planet",
    chartLabel: "Yogakaraka",
    short: "For some rising signs, one planet that rules both an angle and a trine — unusually helpful.",
    long: "It exists only for certain lagnas (for example Saturn for Taurus and Libra). When present, that planet’s periods and placements carry extra weight in the reading.",
    seeAlso: ["lagna", "planet", "house"],
  },
  {
    id: "sade_sati",
    label: "Sade sati",
    plain: "long patience stretch",
    chartLabel: "Sade sati",
    short: "Saturn’s roughly seven-and-a-half-year passage across the Moon’s sign and the signs beside it.",
    long: "Classical timing marks three phases (rising, peak, setting). The product surfaces it as slow weather around mood and care — endurance first, not panic moves.",
    seeAlso: ["planet", "nakshatra"],
  },
  {
    id: "pada",
    label: "Pada",
    plain: "quarter",
    chartLabel: "Pada",
    short: "One of four equal quarters of a nakshatra. The Moon’s pada at birth starts the dasha clock.",
    long: "Each pada is 3°20′. Fine birth-time error can change the Moon’s pada and therefore the dasha sequence — which is why the chart screen shows how many minutes the Moon nakshatra survives.",
    seeAlso: ["nakshatra", "dasha", "lagna"],
  },
];

export const GLOSSARY: Record<string, GlossaryTerm> = Object.fromEntries(CORE_WORDS.map((t) => [t.id, t]));

export function termByPlain(plain: string): GlossaryTerm | undefined {
  const key = plain.trim().toLowerCase();
  return CORE_WORDS.find((t) => t.plain.toLowerCase() === key || t.label.toLowerCase() === key || t.id === key);
}
