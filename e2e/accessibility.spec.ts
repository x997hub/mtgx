import { test, expect } from "@playwright/test";

test.describe("Accessibility — Login Page", () => {
  test("login page has heading", async ({ page }) => {
    await page.goto("/login");
    await page.waitForTimeout(2000);
    // May use h1, h2, or role="heading"
    const headings = page.getByRole("heading");
    const count = await headings.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("Google sign-in button has accessible name", async ({ page }) => {
    await page.goto("/login");
    const btn = page.getByRole("button").filter({ hasText: /google|sign in|войти/i });
    await expect(btn).toBeVisible({ timeout: 10000 });
    const name = await btn.getAttribute("aria-label") || await btn.innerText();
    expect(name.length).toBeGreaterThan(0);
  });

  test("page has lang attribute", async ({ page }) => {
    await page.goto("/login");
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBeTruthy();
  });

  test("interactive elements have minimum touch target size", async ({ page }) => {
    await page.goto("/login");
    await page.waitForTimeout(2000);
    const buttons = page.getByRole("button");
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(40);
      }
    }
  });
});
