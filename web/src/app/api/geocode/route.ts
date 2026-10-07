import { geocode } from "@/lib/chartService";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return Response.json({ results: [] });
  try {
    return Response.json(await geocode(q));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
