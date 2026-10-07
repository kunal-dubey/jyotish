import { z } from "zod";

// Fonts the protocol page may load from Google Fonts. The model picks from these.
export const DISPLAY_FONTS = [
  "Cormorant Garamond", "Fraunces", "Spectral", "Cinzel", "Marcellus", "Tenor Sans",
  "Instrument Serif", "EB Garamond", "Libre Caslon Display", "Syne", "Bricolage Grotesque",
  "Josefin Sans", "Yeseva One", "Philosopher", "Gloock", "Young Serif",
] as const;
export const BODY_FONTS = [
  "Source Serif 4", "Literata", "Newsreader", "Crimson Pro", "Alegreya", "Lora",
  "IBM Plex Sans", "Work Sans", "Karla", "Libre Franklin", "Alegreya Sans", "Figtree", "Atkinson Hyperlegible",
] as const;

const hex = z.string().describe("CSS hex colour, #rrggbb");
const palette = z.object({
  ground: hex.describe("page background"),
  surface: hex.describe("card background, distinct from ground"),
  ink: hex.describe("body text; at least 7:1 contrast on ground"),
  muted: hex.describe("secondary text; at least 4.5:1 on ground"),
  accent: hex.describe("primary accent for marks, needle, today highlight"),
  accentSoft: hex.describe("low-intensity accent wash for fills"),
  line: hex.describe("hairlines and borders"),
  warn: hex.describe("used only for the standing prohibition box"),
});

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export const ProtocolSchema = z.object({
  design: z.object({
    rationale: z.string().describe("Two or three sentences: what in this chart the palette and type come from."),
    light: palette,
    dark: palette,
    displayFont: z.enum(DISPLAY_FONTS),
    bodyFont: z.enum(BODY_FONTS),
    motif: z.string().describe("A short phrase naming the visual motif, e.g. 'river stones' or 'a bow drawn back'."),
  }),
  days: z
    .array(
      z.object({
        weekday: z.enum(WEEKDAYS),
        planet: z.string(),
        condition: z.string().describe("This planet's actual condition in this chart, one or two sentences."),
        theme: z.string().describe("A plain title for the day, a few words."),
        instructions: z
          .array(
            z.object({
              action: z.string().describe("A concrete instruction."),
              asRemedy: z.string().describe("Why it works as a planetary remedy."),
              asHygiene: z.string().describe("Why it is plain good practice for this person regardless of belief."),
            }),
          )
          .describe("Four or five instructions."),
        avoid: z.string().describe("One thing to avoid on this day."),
      }),
    )
    .describe("Exactly seven, Sunday through Saturday."),
  seasons: z
    .array(
      z.object({
        key: z.string().describe("Exactly one of the season keys supplied, e.g. 'Mercury-Venus'."),
        label: z.string().describe("A short plain name for the season."),
        summary: z.string().describe("Two or three plain sentences."),
        pressure: z.enum(["light", "moderate", "heavy"]),
      }),
    )
    .describe("One entry per season key supplied, in order."),
  prohibition: z.object({
    present: z.boolean().describe("False if the chart does not support a standing prohibition."),
    text: z.string(),
    start: z.string().describe("YYYY-MM-DD, or empty"),
    end: z.string().describe("YYYY-MM-DD, or empty"),
    reason: z.string(),
  }),
  counsel: z.object({
    principalPressure: z.string().describe("The next decade's principal pressure and when it runs, a short paragraph."),
    priorities: z.array(z.string()).describe("Ranked."),
    naturalCapabilities: z.array(z.string()),
    trainedCapabilities: z.array(z.string()).describe("Ones that must be trained against temperament."),
    scripturalStudies: z.array(z.string()),
    embodiedStudies: z.array(z.string()),
    warnings: z.array(z.string()),
    advantages: z.array(z.string()),
    perceptionShifts: z.array(z.string()),
    decisionRules: z.array(z.string()).describe("If-then rules calibrated to this chart's specific failure modes."),
  }),
  remedies: z.array(
    z.object({
      planet: z.string(),
      practice: z.string(),
      whatItDoes: z.string().describe("What the practice does to the practitioner, decoded."),
      caution: z.string(),
    }),
  ),
  gemstoneNote: z.string().describe("Blunt note on gemstones for this chart."),
  ledger: z
    .array(
      z.object({
        id: z.string().describe("short slug"),
        label: z.string().describe("A mark the person can tick daily, a few words."),
        why: z.string().describe("One sentence on why this chart must hold it."),
      }),
    )
    .describe("Five or six marks, drawn from what the chart must hold rather than achieve."),
  glossary: z.object({
    houses: z.array(z.object({ house: z.number(), holds: z.string(), yours: z.string() })).describe("All twelve."),
    planets: z.array(z.object({ name: z.string(), character: z.string(), portfolio: z.string() })).describe("All nine."),
    terms: z.array(z.object({ term: z.string(), definition: z.string() })).describe("About a dozen."),
  }),
});

export type ProtocolContent = z.infer<typeof ProtocolSchema>;
