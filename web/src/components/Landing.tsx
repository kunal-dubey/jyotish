"use client";
import { INCLUDED_SHOWCASE } from "@/lib/modules";

export default function Landing({ onSignIn }: { onSignIn: () => void }) {
  return (
    <main className="sky min-h-[calc(100dvh-3.5rem)] relative">
      <div className="orb orb-a drift" aria-hidden />
      <div className="orb orb-b drift" aria-hidden style={{ animationDelay: "-7s" }} />

      <section className="relative mx-auto max-w-[78rem] px-4 sm:px-5 md:px-8 min-h-[calc(100dvh-3.5rem)] flex flex-col justify-center py-12 sm:py-16 md:py-20">
        <div className="max-w-[38rem] enter min-w-0">
          <p className="serif text-[clamp(2.4rem,9vw,4.75rem)] leading-[0.95] tracking-tight">
            Jyotish <span className="italic muted">protocol</span>
          </p>
          <h1 className="mt-6 sm:mt-7 serif text-[clamp(1.3rem,4.2vw,1.85rem)] font-normal leading-snug tracking-tight max-w-[28rem]">
            A natal reading that must earn its trust before it speaks of your future.
          </h1>
          <p className="mt-4 sm:mt-5 text-[15px] sm:text-[15.5px] muted leading-relaxed max-w-[26rem]">
            The chart is computed, not recalled. You start with counsel you can use — what leads each life area, how
            this period sits, what to focus on — then deeper atlas detail, and only later a blind past-check before
            forward protocol opens.
          </p>
          <div className="mt-8 sm:mt-9 btn-row btn-row-stack sm:flex-row sm:items-center">
            <a href="#/begin" className="btn btn-primary">
              Begin a reading
            </a>
            <button type="button" className="btn btn-ghost" onClick={onSignIn}>
              I already have an account
            </button>
          </div>
        </div>

        <ul className="mt-12 sm:mt-16 md:mt-24 grid sm:grid-cols-3 gap-7 sm:gap-8 md:gap-10 max-w-[52rem] enter-slow border-t hair pt-8 sm:pt-10">
          {[
            {
              t: "Computed chart",
              d: "Rising sign, periods, and birth-time sensitivity from ephemeris — not from memory or a model guess.",
            },
            {
              t: "Right now + atlas",
              d: "Led by · this period · focus for work, partnership, mind, money, drive, and learning — then open any area for more.",
            },
            {
              t: "Blind past-check",
              d: "Concrete claims about periods you already lived. Score them before any forward material appears.",
            },
          ].map((x) => (
            <li key={x.t}>
              <p className="eyebrow text-[var(--gold)]">{x.t}</p>
              <p className="mt-2 text-[14px] muted leading-relaxed">{x.d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="relative mx-auto max-w-[78rem] px-4 sm:px-5 md:px-8 pb-16 sm:pb-24 enter-slow">
        <div className="border-t hair pt-10 sm:pt-14 max-w-[52rem]">
          <p className="eyebrow text-[var(--gold)]">With every reading</p>
          <h2 className="serif text-[clamp(1.6rem,4vw,2.25rem)] leading-tight mt-2 max-w-[28rem]">
            Your chart atlas arrives first — in language you can actually use.
          </h2>
          <p className="mt-4 muted text-[15px] leading-relaxed max-w-[32rem]">
            No jargon wall. Each area leads with what factors it, how the running period colors it, and one focus line —
            placements are there when you want the map behind the counsel.
          </p>
          <ul className="mt-8 sm:mt-10 grid sm:grid-cols-2 gap-x-10 gap-y-7">
            {INCLUDED_SHOWCASE.map((x) => (
              <li key={x.label}>
                <p className="text-[15px] font-medium">{x.label}</p>
                <p className="mt-1.5 text-[14px] muted leading-relaxed">{x.plain}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-12 sm:mt-16 max-w-[36rem] border-t hair pt-10">
          <p className="eyebrow">Full protocol</p>
          <h3 className="serif text-[clamp(1.35rem,3vw,1.75rem)] leading-tight mt-2">
            Then the reading that must prove itself.
          </h3>
          <p className="mt-3 muted text-[14.5px] leading-relaxed">
            Blind past-check scored by you, forward reports calibrated to that score, decade guidance, and a living
            protocol page that keeps recomputing as time moves. The atlas stays yours either way.
          </p>
          <a href="#/begin" className="btn btn-primary mt-7">
            Begin a reading
          </a>
        </div>
      </section>
    </main>
  );
}
