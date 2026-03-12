import { test, expect } from "@playwright/test";
import { join, dirname } from "path";
import { writeFileSync, existsSync, unlinkSync } from "fs";
import { fileURLToPath } from "url";
import {
  adminClient,
  getProfile,
  ensureTestUser,
} from "./helpers/supabase-admin";
import { profileUpdateData } from "./helpers/test-data";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let testUserId: string;

test.beforeAll(async () => {
  const user = await ensureTestUser();
  testUserId = user.id;
});

// Serial to avoid race conditions: each test saves ALL profile fields
test.describe.serial("Profile Edit — Integration", () => {
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

      // 6. Verify main Save button is enabled before clicking
      const saveButton = page.locator("div.flex.gap-3 > button").last();
      await expect(saveButton).toBeEnabled({ timeout: 5000 });
      await saveButton.click();

      // 7. Wait for toast OR navigation to /profile
      await page.waitForURL(/\/profile(?!\/edit)/, { timeout: 20000 });

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

      // Verify the value was set correctly
      await expect(arenaInput).toHaveValue(updates.arenaUsername);

      // 4. Click the main Save button (in the action bar, not section Save buttons)
      const saveButton = page.locator("div.flex.gap-3 > button").last();
      await expect(saveButton).toBeEnabled({ timeout: 5000 });
      await saveButton.click();

      // 5. Wait for navigation to /profile
      await page.waitForURL(/\/profile(?!\/edit)/, { timeout: 20000 });

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

  test("upload avatar photo", async ({ page }) => {
    // 1. Save original profile state
    const original = await getProfile(testUserId);
    expect(original).toBeTruthy();

    // 2. Create a minimal test PNG file (1x1 red pixel)
    const testImagePath = join(__dirname, "test-avatar.png");
    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
      "base64"
    );
    writeFileSync(testImagePath, pngBuffer);

    try {
      // 3. Navigate to profile edit
      await page.goto("/profile/edit");
      await page.waitForLoadState("networkidle");

      // 4. Wait for form to load
      const displayNameInput = page.locator("input#displayName");
      await expect(displayNameInput).toHaveValue(/.+/, { timeout: 15000 });

      // 5. Upload avatar via hidden file input
      const fileInput = page.locator('input[type="file"][accept="image/*"]');
      await fileInput.setInputFiles(testImagePath);

      // 6. Wait for upload to complete
      await page.waitForTimeout(3000);

      // 7. Click Save
      const saveButton = page.locator("div.flex.gap-3 > button").last();
      await expect(saveButton).toBeEnabled({ timeout: 5000 });
      await saveButton.click();

      // 8. Wait for navigation to /profile
      await page.waitForURL(/\/profile(?!\/edit)/, { timeout: 20000 });

      // 9. Verify avatar_url in DB
      const updated = await getProfile(testUserId);
      expect(updated?.avatar_url).toBeTruthy();
      expect(updated!.avatar_url).toContain("/storage/v1/object/public/avatars/");
      expect(updated!.avatar_url).toContain(testUserId);
    } finally {
      // 10. Cleanup: delete uploaded file from storage + revert avatar_url
      const updated = await getProfile(testUserId);
      if (updated?.avatar_url?.includes("/storage/v1/object/public/avatars/")) {
        const storagePath = updated.avatar_url.split("/storage/v1/object/public/avatars/")[1];
        if (storagePath) {
          await adminClient.storage.from("avatars").remove([storagePath]);
        }
      }

      // Revert avatar_url to original
      await adminClient
        .from("profiles")
        .update({ avatar_url: original!.avatar_url })
        .eq("id", testUserId);

      // Remove test file
      if (existsSync(testImagePath)) {
        unlinkSync(testImagePath);
      }
    }
  });
});
