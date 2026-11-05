#!/usr/bin/env node
/**
 * Probe every catalog model for key features, persist autofix knobs, retry failures.
 *
 * Usage (web server must be running on BASE_URL):
 *   node scripts/verify-models.mjs
 *   BASE_URL=http://localhost:3000 ADMIN_EMAIL=admin@test.local ADMIN_PASSWORD=TestPass123! node scripts/verify-models.mjs
 *
 * Env:
 *   BASE_URL (default http://127.0.0.1:3000)
 *   ADMIN_EMAIL / ADMIN_PASSWORD (default seeded admin)
 *   FEATURES=past,free_counsel,protocol
 *   MAX_ROUNDS=3
 *   CATALOG_IDS=gemini-2.5-flash,claude-sonnet-5.5  (optional subset)
 */

const BASE = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const EMAIL = process.env.ADMIN_EMAIL || "admin@test.local";
const PASSWORD = process.env.ADMIN_PASSWORD || "TestPass123!";
const FEATURES = (process.env.FEATURES || "past,free_counsel,protocol")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const MAX_ROUNDS = Math.max(1, Number(process.env.MAX_ROUNDS || 3) || 3);
const CATALOG_IDS = process.env.CATALOG_IDS
  ? process.env.CATALOG_IDS.split(",").map((s) => s.trim()).filter(Boolean)
  : undefined;

function cookieJar() {
  const jar = new Map();
  return {
    store(res) {
      const raw = res.headers.getSetCookie?.() ?? [];
      for (const line of raw) {
        const [pair] = line.split(";");
        const eq = pair.indexOf("=");
        if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
      }
      // Node < 20 fallback
      const single = res.headers.get("set-cookie");
      if (single && raw.length === 0) {
        const [pair] = single.split(";");
        const eq = pair.indexOf("=");
        if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
      }
    },
    header() {
      return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
    },
  };
}

async function main() {
  const cookies = cookieJar();
  console.log(`[verify-models] login ${EMAIL} @ ${BASE}`);
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  cookies.store(login);
  if (!login.ok) {
    const body = await login.text();
    throw new Error(`Login failed ${login.status}: ${body}`);
  }
  const user = await login.json();
  if (user.plan !== "admin") {
    console.warn(`[verify-models] user plan is ${user.plan}; flipping to admin`);
    const planRes = await fetch(`${BASE}/api/auth/plan`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: cookies.header() },
      body: JSON.stringify({ plan: "admin" }),
    });
    cookies.store(planRes);
    if (!planRes.ok) throw new Error(`Plan flip failed: ${await planRes.text()}`);
  }

  let failedKeys = null;
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    console.log(`[verify-models] round ${round}/${MAX_ROUNDS} features=${FEATURES.join(",")}`);
    const body = {
      all: true,
      autofix: true,
      features: FEATURES,
      ...(CATALOG_IDS ? { catalogIds: CATALOG_IDS } : {}),
      ...(failedKeys
        ? {
            catalogIds: [...new Set(failedKeys.map((k) => k.split("::")[0]))],
            features: [...new Set(failedKeys.map((k) => k.split("::")[1]))],
          }
        : {}),
    };
    const res = await fetch(`${BASE}/api/admin/models/probe`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: cookies.header() },
      body: JSON.stringify(body),
    });
    cookies.store(res);
    const report = await res.json();
    if (!res.ok) throw new Error(report.error || `Probe HTTP ${res.status}`);

    for (const r of report.results) {
      const tag = `${r.catalogId || r.model}::${r.feature}`;
      const last = r.attempts?.at(-1);
      console.log(
        `  ${r.ok ? "OK  " : "FAIL"} ${tag.padEnd(40)} ${r.winningStrategy || last?.error || ""}`.slice(0, 140),
      );
    }
    console.log(`[verify-models] summary ok=${report.summary.ok} failed=${report.summary.failed}`);

    failedKeys = report.results.filter((r) => !r.ok).map((r) => `${r.catalogId || r.model}::${r.feature}`);
    if (failedKeys.length === 0) {
      console.log("[verify-models] all probes passed");
      process.exit(0);
    }
    console.log(`[verify-models] ${failedKeys.length} still failing — retrying with persisted overrides`);
  }

  console.error("[verify-models] some models still failing after autofix rounds");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
