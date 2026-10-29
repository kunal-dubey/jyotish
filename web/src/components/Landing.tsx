"use client";
import DemoScorecard from "./DemoScorecard";

export default function Landing({
  onSignIn,
  onBegin,
}: {
  onSignIn: () => void;
  onBegin?: () => void;
}) {
  return (
    <main className="app-shell">
      <section className="land-hero enter">
        <div className="land-hero__copy">
          <h1 className="land-hero__title">A reading that checks itself</h1>
          <p className="land-hero__lede">
            Confirm the birth moment, read the atlas in plain words, then score the past before any forward counsel
            opens.
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
        <div className="land-hero__stage enter-slow" data-ui>
          <p className="text-[13px] muted mb-4">Try it — mark a sample claim</p>
          <DemoScorecard />
        </div>
      </section>

      <ol className="land-steps enter-slow">
        {[
          {
            t: "Birth chart",
            d: "A name, a birth moment, and a place. You confirm the details once.",
          },
          {
            t: "Chart atlas",
            d: "Life areas in plain language. Open any one for why, then the chart behind it.",
          },
          {
            t: "Past-check, then reports",
            d: "Score claims about years you already lived. Forward path opens only after.",
          },
        ].map((x) => (
          <li key={x.t} className="land-step">
            <h3>{x.t}</h3>
            <p>{x.d}</p>
          </li>
        ))}
      </ol>

      <section className="land-close enter-slow">
        <h2>Start with four quiet facts</h2>
        <p>Name, date, time, place. Astrology words with a dotted underline explain themselves when you hover or tap them.</p>
        <button type="button" className="btn" onClick={onBegin}>
          Begin a reading
        </button>
      </section>
    </main>
  );
}
