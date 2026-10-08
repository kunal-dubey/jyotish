import type { NextRequest } from "next/server";
import { isResponse, requireUser } from "@/lib/auth";
import { buildProtocolHtml } from "@/lib/protocolHtml";
import { getReading } from "@/lib/store";

type IdCtx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: IdCtx) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const r = await getReading((await ctx.params).id, user.id);
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
