import type { NextRequest } from "next/server";
import { isResponse, requireUser } from "@/lib/auth";
import { gateError, isRunning, runStage, stageAlreadyDone, type StageEvent } from "@/lib/stages";
import { getReading } from "@/lib/store";
import type { StageName } from "@/lib/types";

const STAGES: StageName[] = ["past", "reports", "guidance", "protocol"];

type StageCtx = { params: Promise<{ id: string; stage: string }> };

/** Streams newline-delimited JSON events while one stage generates. */
export async function POST(_req: NextRequest, ctx: StageCtx) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const { id, stage } = await ctx.params;
  if (!STAGES.includes(stage as StageName)) return Response.json({ error: "Unknown stage" }, { status: 404 });
  const r = await getReading(id, user.id);
  if (!r) return Response.json({ error: "Not found" }, { status: 404 });
  const blocked = gateError(r, stage as StageName);
  if (blocked) return Response.json({ error: blocked }, { status: 409 });
  if (isRunning(id)) return Response.json({ error: "Already generating." }, { status: 409 });

  // Reuse stored stage output — no Anthropic call unless the user regenerated (cleared outputs via reset).
  if (stageAlreadyDone(r, stage as StageName)) {
    const enc = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(enc.encode(JSON.stringify({ type: "status", text: "Using saved stage" }) + "\n"));
        controller.enqueue(enc.encode(JSON.stringify({ type: "done", reading: r }) + "\n"));
        controller.close();
      },
    });
    return new Response(body, { headers: { "content-type": "application/x-ndjson", "cache-control": "no-store" } });
  }

  const enc = new TextEncoder();
  let open = true;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (e: StageEvent) => {
        if (!open) return;
        try {
          controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
        } catch {
          open = false;
        }
      };
      // If the browser goes away, the stage still finishes and saves.
      runStage(r, stage as StageName, emit).finally(() => {
        if (!open) return;
        open = false;
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      open = false;
    },
  });
  return new Response(body, { headers: { "content-type": "application/x-ndjson", "cache-control": "no-store" } });
}
