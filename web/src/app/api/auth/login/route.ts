import { cookies } from "next/headers";
import { authenticate, sessionCookieOptions, signSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    if (!body.email || !body.password) {
      return Response.json({ error: "Email and password are required." }, { status: 400 });
    }
    const user = await authenticate(body.email, body.password);
    const token = await signSession(user);
    const jar = await cookies();
    jar.set(sessionCookieOptions(token));
    return Response.json({ id: user.id, email: user.email, name: user.name });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 401 });
  }
}
