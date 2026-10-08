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
    <main className="sky min-h-[calc(100dvh-3.5rem)] relative">
      <div className="orb orb-a drift" aria-hidden />
      <div className="mx-auto max-w-[26rem] px-5 py-16 md:py-24 enter">
        <p className="eyebrow text-[var(--gold)]">Your readings, kept</p>
        <h1 className="serif text-[36px] leading-tight tracking-tight mt-2">
          {mode === "login" ? "Welcome back" : "Create an account"}
        </h1>
        <p className="mt-3 text-[15px] muted leading-relaxed">
          Charts, scores, and protocols stay with your account so nothing is recomputed by accident.
        </p>
        <form onSubmit={submit} className="mt-8 grid gap-4">
          {mode === "register" && (
            <label className="field">
              <span>Name</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
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
            {busy ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-[13px] muted">
          {mode === "login" ? (
            <>
              New here?{" "}
              <button type="button" className="underline underline-offset-2" onClick={() => setMode("register")}>
                Create an account
              </button>
              {" · "}
              <a href="#/begin" className="underline underline-offset-2">
                Or begin as a guest
              </a>
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
      </div>
    </main>
  );
}
