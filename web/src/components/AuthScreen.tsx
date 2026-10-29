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
    <main className="sky">
      <div className="app-shell" style={{ maxWidth: "28rem" }}>
        <div className="enter panel">
          <h1 className="stage-title" style={{ fontSize: "clamp(28px, 5vw, 40px)" }}>
            {mode === "login" ? "Welcome back" : "Create an account"}
          </h1>
          <p className="muted" style={{ marginTop: -8 }}>
            Readings stay with your account so you can return without starting over.
          </p>
          <form onSubmit={submit} className="grid gap-4 mt-2">
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
            <button type="submit" className="btn btn-primary w-full" disabled={busy}>
              {busy ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>
          <p className="text-[14px] muted">
            {mode === "login" ? (
              <>
                New here?{" "}
                <button type="button" className="see-more" onClick={() => setMode("register")}>
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already registered?{" "}
                <button type="button" className="see-more" onClick={() => setMode("login")}>
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}
