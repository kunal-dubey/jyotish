// The chart JSON comes from the Python service; only the fields the app reads are typed.

export type Planet = {
  name: string;
  lon: number;
  sign: string;
  sign_index: number;
  deg: string;
  nakshatra: string;
  nakshatra_lord: string;
  pada: number;
  house: number;
  navamsa: string;
  vargottama: boolean;
  dignity: string | null;
  retrograde: boolean;
  sign_lord: string;
};

export type Period = { lord: string; start: string; end: string; status?: "past" | "current" | "future" };
export type Mahadasha = Period & {
  notional_start: string;
  age_start: number;
  age_end: number;
  antardashas: Period[];
};

export type SaturnSpan = { type: "sade_sati" | "ashtama" | "kantaka"; start: string; end: string | null };

export type Chart = {
  input: { date: string; time: string; lat: number; lon: number; tz: string | null; place: string | null; today: string };
  time: {
    local: string;
    utc: string;
    utc_offset_hours: number;
    utc_offset_str: string;
    tz: string | null;
    tz_abbrev: string | null;
    offset_source: string;
    notes: string[];
  };
  settings: { ayanamsa_value: number; ephemeris: string[] };
  ascendant: {
    sign: string;
    sign_index: number;
    deg: string;
    nakshatra: string;
    pada: number;
    navamsa: string;
    lord: string;
    element: string;
  };
  mc: { sign: string; deg: string };
  planets: Planet[];
  nodes: {
    mean: { sign: string; deg: string; nakshatra: string; pada: number };
    true: { sign: string; deg: string; nakshatra: string; pada: number };
    padas_differ: boolean;
    signs_differ: boolean;
  };
  houses: { house: number; sign: string; lord: string; occupants: string[] }[];
  yogakaraka: string[];
  dispositors: { terminus_counts: Record<string, number> };
  tithi: { number: number; name: string; paksha: string; sun_moon_separation: number; near_opposition: boolean };
  sensitivity: {
    lagna: { minutes_earlier_survives: number | null; minutes_later_survives: number | null };
    navamsa_lagna: { minutes_earlier_survives: number | null; minutes_later_survives: number | null };
    moon_nakshatra: { minutes_earlier_survives: number | null; minutes_later_survives: number | null };
    table: { offset_min: number; sign: string; deg: string; navamsa: string }[];
    time_critical: boolean;
  };
  vimshottari: {
    moon_nakshatra: string;
    birth_lord: string;
    balance_years: number;
    mahadashas: Mahadasha[];
    current: {
      mahadasha: string;
      antardasha: string;
      ad_start: string;
      ad_end: string;
      pratyantara: string | null;
    } | null;
  };
  transits: {
    date: string;
    bodies: { body: string; sign: string; deg: string; house_from_moon: number; house_from_lagna: number }[];
    status: { sade_sati: boolean; sade_sati_phase: string | null; ashtama_shani: boolean; kantaka_shani_from_moon: boolean };
    saturn_spans: SaturnSpan[];
  };
  text: string;
};

export type TimeSource = "certificate" | "hospital_record" | "parent_memory" | "rounded" | "guess" | "other";

export type Intake = {
  name: string;
  callName: string;
  date: string;
  time: string;
  timeSource: TimeSource;
  timeSourceNote?: string;
  place: { label: string; lat: number; lon: number; tz: string | null };
  utcOffsetOverride?: number | null;
  // Optional context. Withheld from the model until the past-check is scored.
  occupation?: string;
  practice?: string;
  question?: string;
};

export type Claim = { id: string; period: string; text: string; control: boolean };
export type Score = "right" | "wrong" | "unclear";

export type Status = "chart" | "confirmed" | "past_check" | "scored" | "reports" | "guidance" | "protocol";

export type StageName = "past" | "reports" | "guidance" | "protocol";

export type Reading = {
  id: string;
  createdAt: string;
  updatedAt: string;
  intake: Intake;
  chart: Chart;
  status: Status;
  confirmedAt?: string;
  scores: Record<string, Score>;
  scoreNotes: Record<string, string>;
  scoredAt?: string;
  outputs: {
    past?: string;
    claims?: Claim[];
    reports?: string;
    guidance?: string;
    protocol?: import("./protocolSchema").ProtocolContent;
  };
  usage?: Partial<Record<StageName, { input: number; output: number; cacheRead: number }>>;
};
