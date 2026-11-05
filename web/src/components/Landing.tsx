"use client";
import CosmicScene from "./CosmicScene";

const STEPS = [
  {
    t: "Your chart",
    d: "Enter a name, birth date, time, and place. We cast the chart and show what it holds.",
  },
  {
    t: "Life in plain words",
    d: "Twelve areas of life — work, home, love, focus — said simply, with the chart behind each one.",
  },
  {
    t: "A check on your past",
    d: "Mark how well short claims fit years you already lived. The forecast stays closed until you do.",
  },
  {
    t: "Reports",
    d: "Then open reports for what's coming — and which paths deserve your attention next.",
  },
] as const;

export default function Landing({
  onSignIn,
  onBegin,
}: {
  onSignIn: () => void;
  onBegin?: () => void;
}) {
  return (
    <main className="app-shell land">
      <section className="land-hero enter">
        <div className="land-hero__copy">
          <p className="land-hero__brand">Jyotish</p>
          <h1 className="land-hero__title">Your chart, checked against your life</h1>
          <p className="land-hero__lede">
            A Vedic astrology reading: see your birth chart in plain words, score how it fits your past, then get
            Reports for what's ahead — only after that check.
          </p>
          <div className="land-hero__actions">
            <button type="button" className="btn btn--primary" onClick={onBegin}>
              Begin a reading
            </button>
            <button type="button" className="btn btn--quiet" onClick={onSignIn}>
              I already have an account
            </button>
          </div>
          <p className="land-hero__plans muted text-[13px] mt-4 leading-relaxed">
            Free includes your birth chart and Chart Atlas. Past-check and Reports are part of the full reading —{" "}
            <a href="#/billing" className="underline underline-offset-2">
              see plans
            </a>
            . You'll need an account to cast and save.
          </p>
        </div>
        <div className="land-hero__visual enter-slow">
          <CosmicScene />
        </div>
      </section>

      <ol className="land-steps enter-slow">
        {STEPS.map((x) => (
          <li key={x.t} className="land-step">
            <h3>{x.t}</h3>
            <p>{x.d}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
