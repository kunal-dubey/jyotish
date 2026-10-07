import type { NextRequest } from "next/server";
import { computeChart } from "@/lib/chartService";
import { validIntake } from "@/lib/intake";
import { isRunning } from "@/lib/stages";
import { deleteReading, getReading, saveReading } from "@/lib/store";
import type { Intake, Reading, Score, Status } from "@/lib/types";

const ORDER: Status[] = ["chart", "confirmed", "past_check", "scored", "reports", "guidance", "protocol"];

function withRunning(r: Reading) {
  return { ...r, generating: isRunning(r.id) };
}

/** Drop everything produced after `to`. */
function resetTo(r: Reading, to: Status) {
  const o = r.outputs;
  const keep = ORDER.indexOf(to);
  r.outputs = {
    past: keep >= 2 ? o.past : undefined,
    claims: keep >= 2 ? o.claims : undefined,
    reports: keep >= 4 ? o.reports : undefined,
    guidance: keep >= 5 ? o.guidance : undefined,
    protocol: keep >= 6 ? o.protocol : undefined,
  };
  if (keep < 3) r.scoredAt = undefined;
  if (keep < 2) {
    r.scores = {};
    r.scoreNotes = {};
  }
  if (keep < 1) r.confirmedAt = undefined;
  r.status = to;
}

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/readings/[id]">) {
  const r = await getReading((await ctx.params).id);
  return r ? Response.json(withRunning(r)) : Response.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/readings/[id]">) {
  await deleteReading((await ctx.params).id);
  return Response.json({ ok: true });
}

type Patch =
  | { action: "confirm" }
  | { action: "recompute"; intake: Intake }
  | { action: "score"; scores: Record<string, Score>; notes: Record<string, string>; final: boolean }
  | { action: "reset"; to: Status }
  | { action: "context"; occupation?: string; practice?: string; question?: string };

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/readings/[id]">) {
  const r = await getReading((await ctx.params).id);
  if (!r) return Response.json({ error: "Not found" }, { status: 404 });
  if (isRunning(r.id)) return Response.json({ error: "A stage is generating; wait for it to finish." }, { status: 409 });
  const p = (await req.json()) as Patch;
  const fail = (error: string) => Response.json({ error }, { status: 400 });

  switch (p.action) {
    case "confirm":
      if (r.status !== "chart") return fail("Already confirmed.");
      r.status = "confirmed";
      r.confirmedAt = new Date().toISOString();
      break;

    case "recompute": {
      const bad = validIntake(p.intake);
      if (bad) return fail(bad);
      try {
        r.chart = await computeChart(p.intake);
      } catch (e) {
        return Response.json({ error: (e as Error).message }, { status: 502 });
      }
      r.intake = p.intake;
      resetTo(r, "chart");
      break;
    }

    case "score": {
      if (r.status !== "past_check" && r.status !== "scored")
        return fail(
          r.status === "chart" || r.status === "confirmed"
            ? "No past-check to score yet."
            : "Scores are locked once later reports exist. Reset to the past-check to change them.",
        );
      const claims = r.outputs.claims ?? [];
      const ids = new Set(claims.map((c) => c.id));
      const valid = new Set(["right", "wrong", "unclear"]);
      r.scores = Object.fromEntries(Object.entries(p.scores ?? {}).filter(([k, v]) => ids.has(k) && valid.has(v)));
      r.scoreNotes = Object.fromEntries(
        Object.entries(p.notes ?? {}).filter(([k, v]) => ids.has(k) && typeof v === "string" && v.trim()),
      );
      if (p.final) {
        const missing = claims.filter((c) => !r.scores[c.id]).map((c) => c.id);
        if (missing.length) return fail(`Score every claim first. Missing: ${missing.join(", ")}`);
        r.status = "scored";
        r.scoredAt = new Date().toISOString();
      } else if (r.status === "scored") {
        r.status = "past_check";
        r.scoredAt = undefined;
      }
      break;
    }

    case "context":
      // Optional context may be edited any time; the prompts only reveal it after scoring.
      r.intake = { ...r.intake, occupation: p.occupation, practice: p.practice, question: p.question };
      break;

    case "reset":
      if (!ORDER.includes(p.to) || ORDER.indexOf(p.to) >= ORDER.indexOf(r.status)) return fail("Can only reset backward.");
      resetTo(r, p.to);
      break;

    default:
      return fail("Unknown action.");
  }
  return Response.json(withRunning(await saveReading(r)));
}
