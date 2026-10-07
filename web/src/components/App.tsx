"use client";
import { useEffect, useState } from "react";
import Home from "./Home";
import IntakeForm from "./IntakeForm";
import ReadingView from "./ReadingView";
import { go } from "./nav";

type Route = { name: "home" } | { name: "new" } | { name: "reading"; id: string };

function parse(hash: string): Route {
  const m = /^#\/r\/([a-z0-9-]+)/i.exec(hash);
  if (m) return { name: "reading", id: m[1] };
  if (hash.startsWith("#/new")) return { name: "new" };
  return { name: "home" };
}

export default function App() {
  const [route, setRoute] = useState<Route | null>(null);
  useEffect(() => {
    const on = () => setRoute(parse(window.location.hash));
    on();
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  if (!route) return null;
  return (
    <div className="min-h-dvh">
      <header className="border-b hair">
        <div className="mx-auto max-w-[78rem] px-5 md:px-8 h-14 flex items-center justify-between">
          <a href="#/" className="serif text-[19px] tracking-tight">
            Jyotish <span className="muted italic">protocol</span>
          </a>
          {route.name !== "new" && (
            <a href="#/new" className="btn btn-quiet">
              New reading
            </a>
          )}
        </div>
      </header>
      {route.name === "home" && <Home />}
      {route.name === "new" && <IntakeForm onCreated={(r) => go(`#/r/${r.id}`)} />}
      {route.name === "reading" && <ReadingView key={route.id} id={route.id} />}
    </div>
  );
}
