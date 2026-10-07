import type { NextRequest } from "next/server";
import { buildProtocolHtml } from "@/lib/protocolHtml";
import { getReading } from "@/lib/store";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/readings/[id]/protocol">) {
  const r = await getReading((await ctx.params).id);
  if (!r?.outputs.protocol) return new Response("No protocol yet.", { status: 404 });
  const html = buildProtocolHtml(r);
  const download = req.nextUrl.searchParams.has("download");
  const fname = `${(r.intake.callName || r.intake.name).replace(/[^a-z0-9]+/gi, "-")}-protocol.html`;
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...(download ? { "content-disposition": `attachment; filename="${fname}"` } : {}),
    },
  });
}
