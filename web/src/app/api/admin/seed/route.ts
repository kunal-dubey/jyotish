import { authorizeSeedRequest, seedUsers } from "@/lib/seedUsers";

/**
 * POST /api/admin/seed
 * Authorization: Bearer <SEED_SECRET or AUTH_SECRET>
 *
 * Upserts QA users + promotes owner admin. Runs on the deployment's Mongo
 * (works in production where Sensitive env vars are available at runtime).
 */
export async function POST(req: Request) {
  if (!authorizeSeedRequest(req)) {
    return Response.json(
      { error: "Unauthorized. Pass Bearer SEED_SECRET (or AUTH_SECRET).", code: "SEED_UNAUTHORIZED" },
      { status: 401 },
    );
  }

  try {
    const report = await seedUsers();
    return Response.json(report);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
