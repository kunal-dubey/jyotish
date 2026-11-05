"use client";
import { useEffect, useState } from "react";
import { canAccessPaid, type UserPlan } from "@/lib/plans";
import { api, type AuthUser } from "./api";

const FREE_INCLUDES = [
  "Birth chart cast and confirm",
  "Chart Atlas — life areas in plain words",
  "Right-now focus cards",
];

const FULL_INCLUDES = [
  "Past-check — score claims against years you already lived",
  "Reports 3–6 after the past-check",
  "Plain-language guidance",
  "Living protocol page",
];

function statusFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash;
  const q = hash.indexOf("?");
  if (q < 0) return null;
  return new URLSearchParams(hash.slice(q + 1)).get("status");
}

export default function BillingPage({
  user,
  onUser,
  onSignIn,
}: {
  user: AuthUser | null;
  onUser: (u: AuthUser) => void;
  onSignIn: () => void;
}) {
  const plan = (user?.plan ?? "free") as UserPlan;
  const paid = user ? canAccessPaid(plan) : false;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [returnStatus, setReturnStatus] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setReturnStatus(statusFromHash());
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    if (returnStatus === "success") {
      setInfo("If checkout completed, your plan may take a moment to update — refresh or reopen this page.");
    } else if (returnStatus === "cancel") {
      setInfo("Checkout was cancelled. Your free chart and atlas stay available.");
    }
  }, [returnStatus]);

  async function checkout() {
    if (!user) {
      onSignIn();
      return;
    }
    setBusy(true);
    setErr(null);
    setInfo(null);
    try {
      const origin = window.location.origin;
      const result = await api.createCheckout({
        successUrl: `${origin}/#/billing?status=success`,
        cancelUrl: `${origin}/#/billing?status=cancel`,
      });
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      setInfo("Checkout session created, but no redirect URL was returned.");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (/not configured|BILLING_NOT_CONFIGURED|501/i.test(message)) {
        setInfo(
          "Checkout is being connected. You can keep using the free chart and atlas; full reading unlocks when billing goes live.",
        );
      } else {
        setErr(message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="sky min-h-[calc(100dvh-3.5rem)]">
      <div className="mx-auto max-w-[40rem] px-4 sm:px-5 md:px-8 py-8 sm:py-12 grid gap-8 enter" data-testid="billing-page">
        <header className="grid gap-3">
          <h1 className="serif text-[clamp(1.8rem,5vw,2.8rem)] leading-tight">Plans</h1>
          <p className="muted text-[15px] leading-relaxed">
            Free covers your chart and atlas. The full reading adds the past-check and Reports — forecasts stay closed
            until you score years you already lived.
          </p>
          {user ? (
            <p className="text-[14px]">
              Current plan: <strong>{plan}</strong>
              {paid ? " — full reading unlocked." : " — chart and atlas only."}
            </p>
          ) : (
            <p className="text-[14px] muted">Sign in to start checkout. An account is required to cast a chart.</p>
          )}
        </header>

        <section className="panel-soft px-4 py-4 grid gap-3" aria-label="Free">
          <h2 className="text-[15px] font-medium">Free</h2>
          <ul className="grid gap-2 text-[14px] muted">
            {FREE_INCLUDES.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <section className="panel-soft px-4 py-4 grid gap-3" aria-label="Full reading">
          <h2 className="text-[15px] font-medium">Full reading</h2>
          <ul className="grid gap-2 text-[14px] muted">
            {FULL_INCLUDES.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="text-[13px] muted">Pricing appears at checkout when billing is connected.</p>
          {!paid ? (
            <button
              type="button"
              className="btn btn--primary w-full sm:w-auto"
              disabled={busy}
              onClick={() => void checkout()}
            >
              {busy ? "Starting checkout…" : user ? "Continue to checkout" : "Sign in to continue"}
            </button>
          ) : (
            <p className="text-[14px]">You already have access to past-check and Reports.</p>
          )}
        </section>

        {info && <p className="note note-warn">{info}</p>}
        {err && <p className="note note-bad">{err}</p>}

        <div className="flex flex-wrap gap-2">
          <a href="#/" className="btn btn--ghost btn--sm">
            {user ? "Back to readings" : "Back"}
          </a>
          {process.env.NODE_ENV !== "production" && user && !paid ? (
            <button
              type="button"
              className="btn btn--tinted btn--sm"
              onClick={async () => {
                try {
                  onUser(await api.setPlan("paid"));
                } catch (e) {
                  setErr(e instanceof Error ? e.message : String(e));
                }
              }}
            >
              QA: unlock paid
            </button>
          ) : null}
        </div>
      </div>
    </main>
  );
}
