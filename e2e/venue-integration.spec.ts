import { test, expect } from "@playwright/test";
import {
  adminClient,
  getVenue,
  deleteVenue,
  ensureTestUser,
} from "./helpers/supabase-admin";
import { venueData } from "./helpers/test-data";

let testUserId: string;

test.beforeAll(async () => {
  const user = await ensureTestUser();
  testUserId = user.id;
});

test.describe("Venue Management — Integration", () => {
  test("create a new venue", async ({ page }) => {
    const data = venueData();
    let createdVenueId: string | null = null;

    try {
      // 1. Navigate to venue creation page
      await page.goto("/venues/new");
      await page.waitForLoadState("networkidle");

      // 2. Fill venue name
      const nameInput = page.locator("input#venue-name");
      await expect(nameInput).toBeVisible({ timeout: 15000 });
      await nameInput.fill(data.name);

      // 3. Fill address — the next input after venue-name
      const addressInput = page.locator("input#venue-name ~ input, input#venue-name + * input, input[name='address'], input[placeholder*='ddress']").first();
      // Fallback: if no specific selector works, get the second text input in the form
      if (await addressInput.count() === 0) {
        const allInputs = page.locator("form input[type='text'], form input:not([type])");
        const secondInput = allInputs.nth(1);
        await secondInput.fill(data.address);
      } else {
        await addressInput.fill(data.address);
      }

      // 4. Select city from Radix dropdown
      const cityCombobox = page.getByRole("combobox").first();
      await cityCombobox.click();
      await page.getByRole("option", { name: /tel aviv/i }).click();

      // 5. Toggle some format buttons (pauper, commander)
      for (const format of data.formats) {
        const formatBtn = page.getByRole("button", { name: new RegExp(format, "i") });
        // Only click if not already selected (check aria-pressed or data attribute)
        const isPressed = await formatBtn.getAttribute("aria-pressed");
        if (isPressed !== "true") {
          await formatBtn.click();
        }
      }

      // 6. Click Save
      await page.getByRole("button", { name: /save/i }).click();

      // 7. Wait for navigation to /venues/:id
      await page.waitForURL(/\/venues\/[a-f0-9-]+$/i, { timeout: 15000 });

      // 8. Extract venue ID from URL
      const url = page.url();
      const match = url.match(/\/venues\/([a-f0-9-]+)/i);
      expect(match).toBeTruthy();
      createdVenueId = match![1];

      // 9. Verify in DB
      const venue = await getVenue(createdVenueId);
      expect(venue).toBeTruthy();
      expect(venue!.name).toBe(data.name);
      expect(venue!.city).toBe(data.city);
    } finally {
      // 10. Cleanup: delete venue
      if (createdVenueId) {
        await deleteVenue(createdVenueId);
      }
    }
  });

  test("edit an existing venue", async ({ page }) => {
    const data = venueData();
    let venueId: string | null = null;

    try {
      // 1. Create venue directly via adminClient
      const { data: created, error } = await adminClient
        .from("venues")
        .insert({
          name: data.name,
          city: data.city,
          address: data.address,
          formats: data.formats,
          owner_id: testUserId,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(created).toBeTruthy();
      venueId = created!.id;

      // 2. Navigate to edit page
      await page.goto(`/venues/${venueId}/edit`);
      await page.waitForLoadState("networkidle");

      // 3. Wait for form to populate
      const nameInput = page.locator("input#venue-name");
      await expect(nameInput).toHaveValue(data.name, { timeout: 15000 });

      // 4. Change name
      const newName = `E2E Updated Venue ${Date.now().toString(36)}`;
      await nameInput.clear();
      await nameInput.fill(newName);

      // 5. Click Save
      await page.getByRole("button", { name: /save/i }).click();

      // 6. Wait for navigation away from edit page
      await page.waitForURL(/\/venues\/[a-f0-9-]+(?!\/edit)/i, { timeout: 15000 });

      // 7. Verify updated name in DB
      const updated = await getVenue(venueId);
      expect(updated).toBeTruthy();
      expect(updated!.name).toBe(newName);
    } finally {
      // 8. Cleanup: delete venue
      if (venueId) {
        await deleteVenue(venueId);
      }
    }
  });
});
