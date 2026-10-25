import { z } from "zod";
import { FREE_VARGA_KEYS } from "./freeCounselPack";

const counselTriple = z.object({
  ledBy: z
    .string()
    .describe("Plain language: what kind of force leads this area for this person. No house numbers."),
  today: z
    .string()
    .describe("Plain language: how the running chapter colors this area now. No dasha jargon required."),
  focus: z
    .string()
    .describe("One concrete, actionable focus for this week — specific to this chart, not generic."),
});

const AREA_IDS = ["work", "partnership", "mind", "money", "drive", "learning"] as const;
const areaId = z.enum(AREA_IDS);
const vargaKey = z.enum(FREE_VARGA_KEYS);

/** Structured free-tier counsel from one low-effort LLM call. */
export const FreeCounselLlmSchema = z.object({
  rightNow: z.object({
    areas: z
      .array(
        z.object({
          id: areaId,
          ledBy: counselTriple.shape.ledBy,
          today: counselTriple.shape.today,
          focus: counselTriple.shape.focus,
        }),
      )
      .length(AREA_IDS.length),
  }),
  vargas: z.record(vargaKey, counselTriple),
});

export type FreeCounselLlm = z.infer<typeof FreeCounselLlmSchema>;

export type CounselTriple = z.infer<typeof counselTriple>;

/** Cached on Reading.outputs.freeCounsel */
export type FreeCounsel = {
  source: "llm" | "template";
  generatedAt: string;
  rightNow: {
    areas: { id: string; ledBy: string; today: string; focus: string }[];
  };
  vargas: Record<string, CounselTriple>;
};
