import { test, expect } from "@playwright/test";

test.describe("Smoke Tests — Public Pages", () => {
  test("login page loads and shows Google sign-in button", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/MTGX/i);
    // Should have a Google login button or link
    const googleBtn = page.getByRole("button").filter({ hasText: /google|sign in|войти/i });
    await expect(googleBtn).toBeVisible({ timeout: 10000 });
  });

  test("unauthenticated user is redirected to /login", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("unknown route redirects to login for unauthenticated", async ({ page }) => {
    await page.goto("/some-nonexistent-page");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("login page has no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/login");
    await page.waitForTimeout(3000);
    // Filter out known non-critical errors (failed network requests to supabase, etc.)
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("Failed to load resource") &&
        !e.includes("net::") &&
        !e.includes("favicon")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("login page is responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/login");
    const googleBtn = page.getByRole("button").filter({ hasText: /google|sign in|войти/i });
    await expect(googleBtn).toBeVisible({ timeout: 10000 });
  });
});
