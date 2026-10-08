"use client";
import { useEffect, useState } from "react";
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
  | { name: "reading"; id: string };

function parse(hash: string): Route {
  const m = /^#\/r\/([a-z0-9-]+)/i.exec(hash);
  if (m) return { name: "reading", id: m[1] };
  if (hash.startsWith("#/begin") || hash.startsWith("#/new")) return { name: "begin" };
  if (hash.startsWith("#/auth")) return { name: "auth" };
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
    if (user === null && route?.name === "reading") window.location.hash = "#/auth";
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

  const showAuth = !user && (route.name === "auth" || route.name === "reading");
  const showLanding = !user && route.name === "home";
  const showBegin = route.name === "begin";
  const showReading = !!user && route.name === "reading";
  const showHome = !!user && route.name === "home";

  return (
    <div className="min-h-dvh">
      <header className="site-header">
        <div className="mx-auto max-w-[78rem] px-5 md:px-8 h-14 flex items-center justify-between gap-4">
          <a href="#/" className="serif text-[19px] tracking-tight">
            Jyotish <span className="muted italic">protocol</span>
          </a>
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <>
                <span className="text-[12.5px] muted hidden sm:inline truncate max-w-[12rem]">{user.email}</span>
                {route.name !== "begin" && (
                  <a href="#/begin" className="btn btn-quiet">
                    New reading
                  </a>
                )}
                <button type="button" className="btn btn-quiet" onClick={logout}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                {route.name !== "begin" && (
                  <a href="#/begin" className="btn btn-quiet">
                    Begin
                  </a>
                )}
                {route.name !== "auth" && (
                  <a href="#/auth" className="btn btn-ghost">
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
      {showReading && route.name === "reading" && <ReadingView key={route.id} id={route.id} />}
    </div>
  );
}
