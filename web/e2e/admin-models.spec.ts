import { expect, test } from "@playwright/test";

const EMAIL = process.env.ADMIN_EMAIL || "admin@test.local";
const PASSWORD = process.env.ADMIN_PASSWORD || "TestPass123!";

test.describe("admin LLM models", () => {
  test("login, assign model, probe catalog with autofix", async ({ page, request }) => {
    // Ensure seed users exist (best-effort; may 401 without SEED_SECRET — login still works if already seeded).
    await request.post("/api/admin/seed").catch(() => null);

    await page.goto("/#/auth");
    await page.getByLabel(/email/i).fill(EMAIL);
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.locator(".account")).toContainText(EMAIL, { timeout: 20_000 });

    // Ensure admin plan via API cookie jar from browser context.
    await page.evaluate(async () => {
      await fetch("/api/auth/plan", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: "admin" }),
      });
    });
    await page.reload();
    await expect(page.getByRole("link", { name: "Models" })).toBeVisible({ timeout: 15_000 });

    await page.goto("/#/admin/models");
    await expect(page.getByTestId("admin-models")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("model-select-past")).toBeVisible();

    await page.getByTestId("model-select-past").selectOption("gemini-2.5-flash");
    await page.getByTestId("model-select-free_counsel").selectOption("gemini-2.5-flash");
    await page.getByRole("button", { name: /Save assignments/i }).click();
    await expect(page.getByText(/updated /i)).toBeVisible({ timeout: 15_000 });

    // Subset probe + autofix (full catalog: npm run models:verify).
    const probe = await page.evaluate(async () => {
      const res = await fetch("/api/admin/models/probe", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          catalogIds: ["gemini-2.5-flash", "claude-sonnet-5.5"],
          features: ["past", "free_counsel"],
          autofix: true,
        }),
      });
      return { status: res.status, body: await res.json() };
    });

    expect(probe.status).toBe(200);
    expect(probe.body.summary.ok + probe.body.summary.failed).toBeGreaterThan(0);
    expect(probe.body.summary.ok).toBeGreaterThan(0);

    await page.reload();
    await expect(page.getByTestId("admin-models")).toBeVisible();
    // At least one catalog row should show a verified strategy after autofix.
    await expect(
      page.locator("tbody").getByText(/catalog|no-anthropic-extras|extras-low-effort|lower-tokens|minimal/).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
