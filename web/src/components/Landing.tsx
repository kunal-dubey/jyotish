"use client";

export default function Landing({ onSignIn }: { onSignIn: () => void }) {
  return (
    <main className="sky min-h-[calc(100dvh-3.5rem)] relative">
      <div className="orb orb-a drift" aria-hidden />
      <div className="orb orb-b drift" aria-hidden style={{ animationDelay: "-7s" }} />

      <section className="relative mx-auto max-w-[78rem] px-5 md:px-8 min-h-[calc(100dvh-3.5rem)] flex flex-col justify-center py-16 md:py-20">
        <div className="max-w-[38rem] enter">
          <p className="serif text-[clamp(2.75rem,7vw,4.75rem)] leading-[0.95] tracking-tight">
            Jyotish <span className="italic muted">protocol</span>
          </p>
          <h1 className="mt-7 serif text-[clamp(1.45rem,2.8vw,1.85rem)] font-normal leading-snug tracking-tight max-w-[28rem]">
            A natal reading that must earn its trust before it speaks of your future.
          </h1>
          <p className="mt-5 text-[15.5px] muted leading-relaxed max-w-[26rem]">
            The chart is computed, not recalled. A blind past-check comes first — you score it — and only then does the
            rest of the reading open at the volume that score allows.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a href="#/begin" className="btn btn-primary">
              Begin a reading
            </a>
            <button type="button" className="btn btn-ghost" onClick={onSignIn}>
              I already have an account
            </button>
          </div>
        </div>

        <ul className="mt-16 md:mt-24 grid sm:grid-cols-3 gap-8 md:gap-10 max-w-[52rem] enter-slow border-t hair pt-10">
          {[
            {
              t: "Computed chart",
              d: "Rising sign, dashas, and sensitivity from ephemeris — not from memory or a model guess.",
            },
            {
              t: "Blind past-check",
              d: "Concrete claims about periods you already lived. Score them before any forward material appears.",
            },
            {
              t: "Calibrated weight",
              d: "Later reports read your score first, so confidence tracks what the chart actually got right.",
            },
          ].map((x) => (
            <li key={x.t}>
              <p className="eyebrow text-[var(--gold)]">{x.t}</p>
              <p className="mt-2 text-[14px] muted leading-relaxed">{x.d}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
