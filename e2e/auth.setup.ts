import { test as setup, expect } from "@playwright/test";
import {
  ensureTestUser,
  ensureTestProfile,
  SUPABASE_URL,
  ANON_KEY,
} from "./helpers/supabase-admin";

const AUTH_FILE = "e2e/.auth/user.json";
const TEST_EMAIL = "e2e-test@mtgx.app";
const TEST_PASSWORD = "E2eTestPass123!";

setup("authenticate test user", async ({ page }) => {
  // Ensure user and profile exist first
  const testUser = await ensureTestUser();
  await ensureTestProfile(testUser.id);

  // Navigate to the app
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  // Sign in via Supabase GoTrue REST API directly in the browser.
  // This is equivalent to what the SDK's signInWithPassword does.
  // The result will be stored in localStorage by us in the SDK's expected format.
  const sessionData = await page.evaluate(
    async ({ supabaseUrl, anonKey, email, password }) => {
      // Call GoTrue token endpoint
      const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`GoTrue sign-in failed (${response.status}): ${err}`);
      }

      const session = await response.json();

      // Store in localStorage in the format Supabase SDK v2 expects
      const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
      const storageKey = `sb-${projectRef}-auth-token`;

      // The SDK stores the session as a JSON object
      localStorage.setItem(storageKey, JSON.stringify(session));

      return {
        success: true,
        userId: session.user?.id,
        hasToken: !!session.access_token,
      };
    },
    {
      supabaseUrl: SUPABASE_URL,
      anonKey: ANON_KEY,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }
  );

  expect(sessionData.success).toBe(true);
  expect(sessionData.hasToken).toBe(true);

  // Reload the page so the app's Supabase client picks up the session
  await page.reload();
  await page.waitForLoadState("networkidle");

  // Wait for auth to be processed and redirect
  await page.waitForTimeout(3000);

  // Verify we're authenticated — should NOT be on /login
  const url = page.url();
  expect(url).not.toContain("/login");

  // Save storage state for other tests to reuse
  await page.context().storageState({ path: AUTH_FILE });
});
