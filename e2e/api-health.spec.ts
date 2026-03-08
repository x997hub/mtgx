import { test, expect } from "@playwright/test";

test.describe("API Health Checks", () => {
  test("Vercel deployment responds with 200", async ({ request }) => {
    const res = await request.get("/login");
    expect(res.ok()).toBeTruthy();
  });

  test("static assets are served correctly", async ({ request }) => {
    const res = await request.get("/");
    const html = await res.text();
    // Should contain app mount point
    expect(html).toContain("id=\"root\"");
  });

  test("Supabase connectivity via login page", async ({ page }) => {
    const networkErrors: string[] = [];
    page.on("response", (response) => {
      if (response.status() >= 500 && response.url().includes("supabase")) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });
    await page.goto("/login");
    await page.waitForTimeout(3000);
    expect(networkErrors).toHaveLength(0);
  });
});
