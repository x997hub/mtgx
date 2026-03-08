import { test, expect } from "@playwright/test";

test.describe("Performance & Loading", () => {
  test("login page loads within 5 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/login");
    await page.getByRole("button").filter({ hasText: /google|sign in|войти/i }).waitFor({ timeout: 10000 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  test("no broken JS/CSS resources on login page", async ({ page }) => {
    const failedResources: string[] = [];
    page.on("response", (response) => {
      if (
        response.status() >= 400 &&
        (response.url().endsWith(".js") || response.url().endsWith(".css"))
      ) {
        failedResources.push(`${response.status()} ${response.url()}`);
      }
    });
    await page.goto("/login");
    await page.waitForTimeout(3000);
    expect(failedResources).toHaveLength(0);
  });

  test("no uncaught JS exceptions on login page", async ({ page }) => {
    const exceptions: string[] = [];
    page.on("pageerror", (err) => {
      exceptions.push(err.message);
    });
    await page.goto("/login");
    await page.waitForTimeout(3000);
    expect(exceptions).toHaveLength(0);
  });
});
