import type { Claim, Score } from "@/lib/types";
import { type ReportSection, splitReportSections } from "./ReportDigest";

const HOW_SURE_TITLE =
  /what the score implies|confidence audit|report\s*6|how sure|score implies/i;

const POINTS: Record<Score, number> = { right: 2, unclear: 1, wrong: 0 };

export function partitionReportSections(markdown: string | undefined): {
  howSure: ReportSection[];
  chartNotes: ReportSection[];
} {
  const sections = splitReportSections(markdown ?? "");
  const howSure: ReportSection[] = [];
  const chartNotes: ReportSection[] = [];

  for (const s of sections) {
    if (HOW_SURE_TITLE.test(s.title)) howSure.push(s);
    else chartNotes.push(s);
  }

  return { howSure, chartNotes };
}

/** Practitioner foundation from past output — skip the scorable claim list. */
export function practitionerFoundationMarkdown(past: string | undefined): string {
  const text = (past || "").trim();
  if (!text) return "";
  const sections = splitReportSections(text);
  const kept = sections.filter((s) => !/past-check|report\s*2|^claims$/i.test(s.title));
  const use = kept.length ? kept : sections;
  return use
    .map((s) => (s.id.endsWith("-intro") || s.title === "Overview" ? s.body : `## ${s.title}\n\n${s.body}`))
    .join("\n\n")
    .trim();
}

export function pastScoreSummary(
  claims: Claim[],
  scores: Record<string, Score>,
): { points: number; maxPoints: number; passLine: number; pass: boolean; fitClose: number } {
  const maxPoints = Math.max(0, claims.length * 2);
  const passLine = maxPoints === 0 ? 0 : Math.max(1, Math.round((maxPoints * 7) / 12));
  const points = claims.reduce((sum, c) => sum + (scores[c.id] ? POINTS[scores[c.id]] : 0), 0);
  const fitClose = claims.filter((c) => scores[c.id] === "right").length;
  return { points, maxPoints, passLine, pass: points >= passLine, fitClose };
}

/** Friendly section titles for Life-reader guidance navigation. */
export function lifeSectionLabel(title: string): string {
  const t = title.trim();
  if (/principal pressure|next decade|pressure/i.test(t)) return "This period";
  if (/seasons of the decade|^seasons$/i.test(t)) return "Seasons";
  if (/priorit/i.test(t)) return "Priorities";
  if (/capabilities|what to build/i.test(t)) return "What to build";
  if (/studies/i.test(t)) return "Studies";
  if (/warning|prohibit/i.test(t)) return "Watch-outs";
  if (/advantage/i.test(t)) return "Advantages";
  if (/perception|shift/i.test(t)) return "How you see";
  if (/glossary/i.test(t)) return "Words to know";
  if (/remed|practice/i.test(t)) return "Practices";
  return t;
}
