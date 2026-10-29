"use client";
import { useEffect, useState } from "react";
import AdminUsage from "./AdminUsage";
import AuthScreen from "./AuthScreen";
import Home from "./Home";
import Landing from "./Landing";
import NewReadingDialog from "./NewReadingDialog";
import Onboarding from "./Onboarding";
import ReadingView from "./ReadingView";
import { api, type AuthUser } from "./api";

type Route =
  | { name: "home" }
  | { name: "begin" }
  | { name: "auth" }
  | { name: "admin-usage" }
  | { name: "reading"; id: string };

function parse(hash: string): Route {
  const m = /^#\/r\/([a-z0-9-]+)/i.exec(hash);
  if (m) return { name: "reading", id: m[1] };
  if (hash.startsWith("#/begin") || hash.startsWith("#/new")) return { name: "begin" };
  if (hash.startsWith("#/auth")) return { name: "auth" };
  if (hash.startsWith("#/admin/usage")) return { name: "admin-usage" };
  return { name: "home" };
}

function BrandMark() {
  return (
    <svg className="brand__mark" viewBox="0 0 24 24" aria-hidden focusable="false">
      <rect x="1" y="1" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="7" y="7" width="10" height="10" fill="currentColor" />
    </svg>
  );
}

function Shell() {
  const [route, setRoute] = useState<Route | null>(null);
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    const on = () => setRoute(parse(window.location.hash));
    on();
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  useEffect(() => {
    api.me().then(setUser, () => setUser(null));
  }, []);

  useEffect(() => {
    if (user === null && (route?.name === "reading" || route?.name === "admin-usage")) {
      window.location.hash = "#/auth";
    }
    if (user && route?.name === "admin-usage" && user.plan !== "admin") {
      window.location.hash = "#/";
    }
  }, [user, route]);

  async function logout() {
    await api.logout();
    setUser(null);
    window.location.hash = "#/";
  }

  if (!route || user === undefined) {
    return (
      <div className="sky min-h-dvh grid place-items-center">
        <span className="pulse" aria-hidden />
      </div>
    );
  }

  const showAuth = !user && (route.name === "auth" || route.name === "reading" || route.name === "admin-usage");
  const showLanding = !user && route.name === "home";
  const showBegin = route.name === "begin";
  const showReading = !!user && route.name === "reading";
  const showHome = !!user && route.name === "home";
  const showAdminUsage = !!user && user.plan === "admin" && route.name === "admin-usage";

  return (
    <div className="min-h-dvh">
      <header className="topbar site-header">
        <div className="topbar__in">
          <a href="#/" className="brand" aria-label="Jyotish, back to all readings">
            <BrandMark />
            <span className="brand__name">Jyotish</span>
          </a>

          <div className="topbar__spacer" />

          {user ? (
            <>
              <span className="account">{user.email}</span>
              {user.plan === "admin" && (
                <a href="#/admin/usage" className="btn btn--ghost btn--sm">
                  Usage
                </a>
              )}
              {process.env.NODE_ENV !== "production" ? (
                <select
                  className="text-[12px] bg-[var(--s2)] muted rounded-[10px] px-2 py-1 max-w-[6.5rem] min-h-10"
                  aria-label="QA plan"
                  value={user.plan ?? "free"}
                  onChange={async (e) => {
                    try {
                      const next = await api.setPlan(e.target.value as "free" | "paid" | "admin");
                      setUser(next);
                      if (window.location.hash.startsWith("#/r/")) window.location.reload();
                    } catch (err) {
                      alert(err instanceof Error ? err.message : String(err));
                    }
                  }}
                >
                  <option value="free">free</option>
                  <option value="paid">paid</option>
                  <option value="admin">admin</option>
                </select>
              ) : null}
              <button type="button" className="btn btn--tinted btn--sm" onClick={() => setNewOpen(true)}>
                + New Reading
              </button>
              <button type="button" className="btn btn--quiet btn--sm" onClick={logout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn--tinted btn--sm" onClick={() => setNewOpen(true)}>
                Begin
              </button>
              {route.name !== "auth" && (
                <a href="#/auth" className="btn btn--ghost btn--sm">
                  Sign in
                </a>
              )}
            </>
          )}
        </div>
      </header>

      {showLanding && (
        <Landing
          onSignIn={() => (window.location.hash = "#/auth")}
          onBegin={() => setNewOpen(true)}
        />
      )}
      {showAuth && (
        <AuthScreen
          onAuthed={(u) => {
            setUser(u);
            window.location.hash = "#/";
          }}
        />
      )}
      {showBegin && (
        <Onboarding
          user={user}
          onAuthed={setUser}
          onCreated={(r) => (window.location.hash = `#/r/${r.id}`)}
        />
      )}
      {showHome && <Home onNewReading={() => setNewOpen(true)} />}
      {showAdminUsage && <AdminUsage />}
      {showReading && route.name === "reading" && <ReadingView key={route.id} id={route.id} />}

      <footer className="site-foot">
        <p>Prototype. Sample chart and interpretation copy, not medical, financial or legal advice.</p>
      </footer>

      <NewReadingDialog
        open={newOpen}
        user={user ?? null}
        onAuthed={setUser}
        onCreated={(r) => {
          setNewOpen(false);
          window.location.hash = `#/r/${r.id}`;
        }}
        onClose={() => setNewOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return <Shell />;
}
