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
    t: "Ahead, and where to focus",
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
          <h1 className="land-hero__title">Your chart, checked against your life</h1>
          <p className="land-hero__lede">
            Jyotish is an astrology reading: see your birth chart in plain words, score how it fits your past, then get
            reports for what&apos;s ahead and where to focus.
          </p>
          <div className="land-hero__actions">
            <button type="button" className="btn btn-primary" onClick={onBegin}>
              Begin a reading
            </button>
            <button type="button" className="btn btn-quiet" onClick={onSignIn}>
              I already have an account
            </button>
          </div>
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
