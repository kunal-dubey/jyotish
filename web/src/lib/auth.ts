import "server-only";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { ObjectId } from "mongodb";
import { getDb } from "./db";

export const SESSION_COOKIE = "jyotish_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type SessionUser = { id: string; email: string; name?: string };

type UserDoc = {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  name?: string;
  createdAt: string;
};

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET missing or too short. Set it in web/.env.local.");
  return new TextEncoder().encode(s);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name ?? "" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.sub !== "string") return null;
    return {
      id: payload.sub,
      email: String(payload.email ?? ""),
      name: payload.name ? String(payload.name) : undefined,
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  };
}

export function clearSessionCookieOptions() {
  return {
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** Returns the signed-in user or a 401 Response. */
export async function requireUser(): Promise<SessionUser | Response> {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  return user;
}

export function isResponse(x: SessionUser | Response): x is Response {
  return x instanceof Response;
}

export async function findUserByEmail(email: string): Promise<UserDoc | null> {
  const db = await getDb();
  return db.collection<UserDoc>("users").findOne({ email: email.toLowerCase().trim() });
}

export async function createUser(email: string, password: string, name?: string): Promise<SessionUser> {
  const db = await getDb();
  const normalized = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error("Enter a valid email.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
  const existing = await findUserByEmail(normalized);
  if (existing) throw new Error("An account with that email already exists.");
  const doc: Omit<UserDoc, "_id"> & { _id?: ObjectId } = {
    email: normalized,
    passwordHash: await hashPassword(password),
    name: name?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  const res = await db.collection("users").insertOne(doc);
  return { id: res.insertedId.toString(), email: normalized, name: doc.name };
}

export async function authenticate(email: string, password: string): Promise<SessionUser> {
  const user = await findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new Error("Invalid email or password.");
  }
  return { id: user._id.toString(), email: user.email, name: user.name };
}
