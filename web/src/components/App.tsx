"use client";
import { useEffect, useState } from "react";
import AdminUsage from "./AdminUsage";
import AuthScreen from "./AuthScreen";
import CosmicLoader from "./CosmicLoader";
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
  const [route, setRoute] = useState<Route>({ name: "home" });
  // null = signed out (or auth still resolving for public routes). undefined only while
  // a protected route is waiting on /api/auth/me — never block the whole landing page.
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  function openNewReading() {
    setNewOpen(true);
  }
  function closeNewReading() {
    setNewOpen(false);
  }

  useEffect(() => {
    const on = () => setRoute(parse(window.location.hash));
    on();
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    // Generous timeout — abort must not fake a sign-out while Mongo is slow.
    const timer = window.setTimeout(() => ctrl.abort(), 12_000);

    async function restoreSession() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include", signal: ctrl.signal });
        if (cancelled) return;
        if (res.status === 401) {
          setUser(null);
          return;
        }
        if (!res.ok) {
          // Transient server error — keep signed-out UI but don't treat as logout event.
          setUser(null);
          return;
        }
        setUser((await res.json()) as AuthUser);
      } catch (err) {
        if (cancelled) return;
        // Abort / network: retry once without abort so a slow Mongo boot can still restore.
        const aborted = err instanceof DOMException && err.name === "AbortError";
        if (aborted) {
          try {
            const res = await fetch("/api/auth/me", { credentials: "include" });
            if (cancelled) return;
            if (res.ok) {
              setUser((await res.json()) as AuthUser);
              return;
            }
          } catch {
            /* fall through */
          }
        }
        setUser(null);
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    }

    void restoreSession();
    return () => {
      cancelled = true;
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    if (!user && (route.name === "reading" || route.name === "admin-usage")) {
      window.location.hash = "#/auth";
    }
    if (user && route.name === "admin-usage" && user.plan !== "admin") {
      window.location.hash = "#/";
    }
  }, [authChecked, user, route]);

  async function logout() {
    await api.logout();
    setUser(null);
    window.location.hash = "#/";
  }

  // Brief chart-wheel boot while session resolves. Auth aborts at 3s so this
  // can never stick; public begin/auth routes paint without waiting.
  if (!authChecked && (route.name === "home" || route.name === "reading" || route.name === "admin-usage")) {
    return <CosmicLoader size="lg" fullPage label="Loading" />;
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
            <div className="topbar__actions">
              <span className="account">{user.email}</span>
              {user.plan === "admin" && (
                <a href="#/admin/usage" className="btn btn--ghost btn--sm topbar__usage">
                  Usage
                </a>
              )}
              {process.env.NODE_ENV !== "production" ? (
                <select
                  className="topbar__plan"
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
              <button type="button" className="btn btn--tinted btn--sm" onClick={openNewReading}>
                <span className="topbar__new-full">+ New Reading</span>
                <span className="topbar__new-short">+ New</span>
              </button>
              <button type="button" className="btn btn--quiet btn--sm" onClick={logout}>
                Sign out
              </button>
            </div>
          ) : (
            <div className="topbar__actions">
              <button type="button" className="btn btn--tinted btn--sm" onClick={openNewReading}>
                Begin
              </button>
              {route.name !== "auth" && (
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => (window.location.hash = "#/auth")}>
                  Sign in
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {showLanding && (
        <Landing
          onSignIn={() => (window.location.hash = "#/auth")}
          onBegin={openNewReading}
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
      {showHome && <Home onNewReading={openNewReading} />}
      {showAdminUsage && <AdminUsage />}
      {showReading && route.name === "reading" && <ReadingView key={route.id} id={route.id} />}

      <footer className="site-foot">
        <p>Prototype. Sample chart and interpretation copy, not medical, financial or legal advice.</p>
      </footer>

      {newOpen ? (
        <NewReadingDialog
          open
          user={user ?? null}
          onAuthed={setUser}
          onCreated={(r) => {
            closeNewReading();
            window.location.hash = `#/r/${r.id}`;
          }}
          onClose={closeNewReading}
        />
      ) : null}
    </div>
  );
}

export default function App() {
  return <Shell />;
}
