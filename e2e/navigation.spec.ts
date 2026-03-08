import { test, expect } from "@playwright/test";

test.describe("Navigation & Protected Routes", () => {
  test("all protected routes redirect to /login when unauthenticated", async ({ page }) => {
    const protectedRoutes = [
      "/",
      "/events/new",
      "/events/some-id",
      "/players",
      "/clubs",
      "/profile",
      "/profile/edit",
      "/notifications",
      "/settings",
      "/admin",
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForURL(/\/login/, { timeout: 10000 });
      expect(page.url()).toContain("/login");
    }
  });

  test("/onboarding redirects to /login when unauthenticated", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });
});
