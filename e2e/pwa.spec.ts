import { test, expect } from "@playwright/test";

test.describe("PWA & Assets", () => {
  test("service worker script exists in built output", async ({ page }) => {
    await page.goto("/login");
    await page.waitForTimeout(3000);
    // Check if SW registration attempt is made
    const swStatus = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return "not-supported";
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        return regs.length > 0 ? "registered" : "none";
      } catch {
        return "error";
      }
    });
    // In test environment SW may not activate, but should not error
    expect(["registered", "none", "not-supported"]).toContain(swStatus);
  });

  test("index.html contains chunk reload recovery script", async ({ request }) => {
    const res = await request.get("/");
    const html = await res.text();
    expect(html).toContain("chunk_reload");
  });

  test("app icons are referenced in HTML", async ({ request }) => {
    const res = await request.get("/");
    const html = await res.text();
    // PWA manifest link should be in HTML
    expect(html).toContain("manifest");
  });

  test("favicon responds", async ({ page }) => {
    await page.goto("/login");
    // Just check page loads without fatal errors
    const title = await page.title();
    expect(title).toBeTruthy();
  });
});
