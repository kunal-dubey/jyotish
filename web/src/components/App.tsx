"use client";
import { useEffect, useState } from "react";
import AuthScreen from "./AuthScreen";
import Home from "./Home";
import IntakeForm from "./IntakeForm";
import ReadingView from "./ReadingView";
import { api, type AuthUser } from "./api";

type Route = { name: "home" } | { name: "new" } | { name: "reading"; id: string };

function parse(hash: string): Route {
  const m = /^#\/r\/([a-z0-9-]+)/i.exec(hash);
  if (m) return { name: "reading", id: m[1] };
  if (hash.startsWith("#/new")) return { name: "new" };
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

  async function logout() {
    await api.logout();
    setUser(null);
    window.location.hash = "#/";
  }

  if (!route || user === undefined) return null;

  if (!user) {
    return (
      <div className="min-h-dvh">
        <header className="border-b hair">
          <div className="mx-auto max-w-[78rem] px-5 md:px-8 h-14 flex items-center">
            <span className="serif text-[19px] tracking-tight">
              Jyotish <span className="muted italic">protocol</span>
            </span>
          </div>
        </header>
        <AuthScreen onAuthed={setUser} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b hair">
        <div className="mx-auto max-w-[78rem] px-5 md:px-8 h-14 flex items-center justify-between gap-4">
          <a href="#/" className="serif text-[19px] tracking-tight">
            Jyotish <span className="muted italic">protocol</span>
          </a>
          <div className="flex items-center gap-3">
            <span className="text-[12.5px] muted hidden sm:inline truncate max-w-[12rem]">{user.email}</span>
            {route.name !== "new" && (
              <a href="#/new" className="btn btn-quiet">
                New reading
              </a>
            )}
            <button type="button" className="btn btn-quiet" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      {route.name === "home" && <Home />}
      {route.name === "new" && <IntakeForm onCreated={(r) => (window.location.hash = `#/r/${r.id}`)} />}
      {route.name === "reading" && <ReadingView key={route.id} id={route.id} />}
    </div>
  );
}
