import { test, expect } from "@playwright/test";
import {
  adminClient,
  getProfile,
  ensureTestUser,
} from "./helpers/supabase-admin";
import { profileUpdateData } from "./helpers/test-data";

let testUserId: string;

test.beforeAll(async () => {
  const user = await ensureTestUser();
  testUserId = user.id;
});

test.describe("Profile Edit — Integration", () => {
  test("edit display name and bio", async ({ page }) => {
    // 1. Save original profile state
    const original = await getProfile(testUserId);
    expect(original).toBeTruthy();

    const updates = profileUpdateData();

    try {
      // 2. Navigate to profile edit
      await page.goto("/profile/edit");
      await page.waitForLoadState("networkidle");

      // 3. Wait for form to load — display name should have a value
      const displayNameInput = page.locator("input#displayName");
      await expect(displayNameInput).toHaveValue(/.+/, { timeout: 15000 });

      // 4. Clear and fill display name
      await displayNameInput.clear();
      await displayNameInput.fill(updates.displayName);

      // 5. Clear and fill bio
      const bioInput = page.locator("textarea#bio");
      await bioInput.clear();
      await bioInput.fill(updates.bio);

      // 6. Click Save
      await page.getByRole("button", { name: /save/i }).click();

      // 7. Wait for navigation to /profile
      await page.waitForURL(/\/profile(?!\/edit)/, { timeout: 15000 });

      // 8. Verify in DB
      const updated = await getProfile(testUserId);
      expect(updated?.display_name).toBe(updates.displayName);
      expect(updated?.bio).toBe(updates.bio);
    } finally {
      // 9. Revert profile to original values
      await adminClient
        .from("profiles")
        .update({
          display_name: original!.display_name,
          bio: original!.bio,
        })
        .eq("id", testUserId);
    }
  });

  test("edit arena username", async ({ page }) => {
    // 1. Save original profile state
    const original = await getProfile(testUserId);
    expect(original).toBeTruthy();

    const updates = profileUpdateData();

    try {
      // 2. Navigate to profile edit
      await page.goto("/profile/edit");
      await page.waitForLoadState("networkidle");

      // Wait for form to load
      const displayNameInput = page.locator("input#displayName");
      await expect(displayNameInput).toHaveValue(/.+/, { timeout: 15000 });

      // 3. Clear and fill arena username
      const arenaInput = page.locator("input#arena_username");
      await arenaInput.clear();
      await arenaInput.fill(updates.arenaUsername);

      // 4. Click Save
      await page.getByRole("button", { name: /save/i }).click();

      // 5. Wait for navigation to /profile
      await page.waitForURL(/\/profile(?!\/edit)/, { timeout: 15000 });

      // 6. Verify in DB
      const updated = await getProfile(testUserId);
      expect(updated?.arena_username).toBe(updates.arenaUsername);
    } finally {
      // 7. Revert profile to original values
      await adminClient
        .from("profiles")
        .update({
          arena_username: original!.arena_username,
        })
        .eq("id", testUserId);
    }
  });
});
