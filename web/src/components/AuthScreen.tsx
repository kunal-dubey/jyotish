"use client";
import { useState } from "react";
import { api, type AuthUser } from "./api";

export default function AuthScreen({ onAuthed }: { onAuthed: (u: AuthUser) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const user =
        mode === "login"
          ? await api.login(email, password)
          : await api.register(email, password, name || undefined);
      onAuthed(user);
    } catch (ex) {
      setErr((ex as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-[26rem] px-5 py-16 md:py-24">
      <h1 className="serif text-[36px] leading-tight tracking-tight">
        {mode === "login" ? "Sign in" : "Create an account"}
      </h1>
      <p className="mt-3 text-[15px] muted leading-relaxed">
        Readings are stored per account so charts and scored stages are not recomputed.
      </p>
      <form onSubmit={submit} className="mt-8 grid gap-4">
        {mode === "register" && (
          <label className="field">
            <span>Name</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </label>
        )}
        <label className="field">
          <span>Email</span>
          <input
            className="input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            className="input"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </label>
        {err && <p className="note note-bad">{err}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Working…" : mode === "login" ? "Sign in" : "Register"}
        </button>
      </form>
      <p className="mt-6 text-[13px] muted">
        {mode === "login" ? (
          <>
            No account?{" "}
            <button type="button" className="underline underline-offset-2" onClick={() => setMode("register")}>
              Register
            </button>
          </>
        ) : (
          <>
            Already registered?{" "}
            <button type="button" className="underline underline-offset-2" onClick={() => setMode("login")}>
              Sign in
            </button>
          </>
        )}
      </p>
    </main>
  );
}
