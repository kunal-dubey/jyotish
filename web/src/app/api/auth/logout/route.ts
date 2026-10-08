import { cookies } from "next/headers";
import { clearSessionCookieOptions } from "@/lib/auth";

export async function POST() {
  const jar = await cookies();
  jar.set(clearSessionCookieOptions());
  return Response.json({ ok: true });
}
