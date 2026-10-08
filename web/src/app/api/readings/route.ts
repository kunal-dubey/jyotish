import { computeChart } from "@/lib/chartService";
import { isResponse, requireUser } from "@/lib/auth";
import { validIntake } from "@/lib/intake";
import { listReadings, saveReading } from "@/lib/store";
import type { Intake, Reading } from "@/lib/types";

export async function GET() {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const all = await listReadings(user.id);
  return Response.json(
    all.map((r) => ({
      id: r.id,
      name: r.intake.callName || r.intake.name,
      date: r.intake.date,
      place: r.intake.place.label,
      lagna: r.chart.ascendant.sign,
      status: r.status,
      updatedAt: r.updatedAt,
    })),
  );
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const intake = (await req.json()) as Intake;
  const bad = validIntake(intake);
  if (bad) return Response.json({ error: bad }, { status: 400 });
  try {
    const chart = await computeChart(intake);
    const slug =
      intake.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "reading";
    const now = new Date().toISOString();
    const r: Reading = {
      id: `${slug}-${crypto.randomUUID().slice(0, 6)}`,
      userId: user.id,
      createdAt: now,
      updatedAt: now,
      intake,
      chart,
      status: "chart",
      scores: {},
      scoreNotes: {},
      outputs: {},
    };
    return Response.json(await saveReading(r));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
