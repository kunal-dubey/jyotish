"use client";
import { useEffect, useState } from "react";
import AdminUsage from "./AdminUsage";
import AuthScreen from "./AuthScreen";
import Home from "./Home";
import Landing from "./Landing";
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

export default function App() {
  const [route, setRoute] = useState<Route | null>(null);
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

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
      <header className="site-header">
        <div className="header-inner mx-auto max-w-[78rem] px-4 sm:px-5 md:px-8 flex items-center justify-between gap-2 sm:gap-4">
          <a href="#/" className="serif text-[17px] sm:text-[19px] tracking-tight shrink-0">
            Jyotish <span className="muted italic">protocol</span>
          </a>
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            {user ? (
              <>
                <span className="text-[12px] muted hidden md:inline truncate max-w-[10rem]">
                  {user.email}
                  <span className="opacity-70"> · {user.plan ?? "free"}</span>
                </span>
                {user.plan === "admin" && (
                  <a href="#/admin/usage" className="btn btn-quiet text-[13px] sm:text-[14px]">
                    Usage
                  </a>
                )}
                {process.env.NODE_ENV !== "production" ? (
                  <select
                    className="text-[12px] bg-transparent muted border hair rounded-full px-2 py-1 max-w-[6.5rem]"
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
                {route.name !== "begin" && (
                  <a href="#/begin" className="btn btn-quiet text-[13px] sm:text-[14px]">
                    <span className="sm:hidden">New</span>
                    <span className="hidden sm:inline">New reading</span>
                  </a>
                )}
                <button type="button" className="btn btn-quiet text-[13px] sm:text-[14px]" onClick={logout}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                {route.name !== "begin" && (
                  <a href="#/begin" className="btn btn-quiet text-[13px] sm:text-[14px]">
                    Begin
                  </a>
                )}
                {route.name !== "auth" && (
                  <a href="#/auth" className="btn btn-ghost text-[13px] sm:text-[14px]">
                    Sign in
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {showLanding && <Landing onSignIn={() => (window.location.hash = "#/auth")} />}
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
      {showHome && <Home />}
      {showAdminUsage && <AdminUsage />}
      {showReading && route.name === "reading" && <ReadingView key={route.id} id={route.id} />}
    </div>
  );
}
