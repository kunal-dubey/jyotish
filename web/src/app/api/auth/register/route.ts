import { cookies } from "next/headers";
import { createUser, sessionCookieOptions, signSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; password?: string; name?: string };
    if (!body.email || !body.password) {
      return Response.json({ error: "Email and password are required." }, { status: 400 });
    }
    const user = await createUser(body.email, body.password, body.name);
    const token = await signSession(user);
    const jar = await cookies();
    jar.set(sessionCookieOptions(token));
    return Response.json({ id: user.id, email: user.email, name: user.name });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("already exists") ? 409 : 400;
    return Response.json({ error: msg }, { status });
  }
}
