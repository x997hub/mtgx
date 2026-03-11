/* eslint-disable @typescript-eslint/no-explicit-any */
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import { InvitePreferencesSettings } from "../InvitePreferencesSettings";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
  toast: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@example.com" },
    profile: null,
    isLoading: false,
  }),
}));

const mockUpsert = vi.fn();
const mockUpdateDnd = vi.fn();
let mockPrefs: Record<string, unknown> | null = null;
let mockIsLoading = false;
let mockIsUpdating = false;

vi.mock("@/hooks/useInvitePreferences", () => ({
  useInvitePreferences: () => ({
    prefs: mockPrefs,
    isLoading: mockIsLoading,
    upsert: mockUpsert,
    updateDnd: mockUpdateDnd,
    isUpdating: mockIsUpdating,
  }),
}));

describe("InvitePreferencesSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    mockIsUpdating = false;
    mockPrefs = null;
    mockUpsert.mockResolvedValue({});
    mockUpdateDnd.mockResolvedValue({});
  });

  // ── Loading state ──

  it("renders nothing when loading", () => {
    mockIsLoading = true;
    const { container } = renderWithProviders(<InvitePreferencesSettings />);
    expect(container.firstChild).toBeNull();
  });

  // ── Default / empty state ──

  it("renders the card header and isOpen toggle", () => {
    renderWithProviders(<InvitePreferencesSettings />);
    expect(screen.getByText("invite_prefs_title")).toBeInTheDocument();
    expect(screen.getByText("invite_prefs_description")).toBeInTheDocument();
    expect(screen.getByText("invite_open")).toBeInTheDocument();
  });

  it("does not show schedule/formats/visibility/dnd when isOpen is false", () => {
    renderWithProviders(<InvitePreferencesSettings />);
    expect(screen.queryByText("invite_schedule")).not.toBeInTheDocument();
    expect(screen.queryByText("invite_formats")).not.toBeInTheDocument();
    expect(screen.queryByText("invite_visibility")).not.toBeInTheDocument();
    expect(screen.queryByText("dnd_mode")).not.toBeInTheDocument();
  });

  it("always shows the save button", () => {
    renderWithProviders(<InvitePreferencesSettings />);
    expect(screen.getByText("save")).toBeInTheDocument();
  });

  // ── isOpen toggle ──

  it("shows all fields when isOpen is toggled on", async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvitePreferencesSettings />);

    await user.click(screen.getByText("invite_open"));

    expect(screen.getByText("invite_schedule")).toBeInTheDocument();
    expect(screen.getByText("invite_formats")).toBeInTheDocument();
    expect(screen.getByText("invite_visibility")).toBeInTheDocument();
    expect(screen.getByText("dnd_mode")).toBeInTheDocument();
  });

  it("hides fields when isOpen is toggled off again", async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvitePreferencesSettings />);

    // Toggle on
    await user.click(screen.getByText("invite_open"));
    expect(screen.getByText("invite_schedule")).toBeInTheDocument();

    // Toggle off
    await user.click(screen.getByText("invite_open"));
    expect(screen.queryByText("invite_schedule")).not.toBeInTheDocument();
  });

  // ── Schedule grid ──

  it("renders schedule grid with 7 days x 2 slots when open", async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvitePreferencesSettings />);

    await user.click(screen.getByText("invite_open"));

    // 7 day headers
    const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    for (const day of days) {
      expect(screen.getByText(day)).toBeInTheDocument();
    }

    // 2 slot row labels
    expect(screen.getByText("day_slot")).toBeInTheDocument();
    expect(screen.getByText("evening_slot")).toBeInTheDocument();
  });

  it("clicking a schedule cell cycles the state", async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvitePreferencesSettings />);

    await user.click(screen.getByText("invite_open"));

    // Find the first cell button (sun_day) — initially "false" (unavailable)
    const sunDayButton = screen.getByLabelText("sun day_slot: unavailable");
    await user.click(sunDayButton);

    // After click it should cycle to "true" (available)
    expect(
      screen.getByLabelText("sun day_slot: available")
    ).toBeInTheDocument();
  });

  // ── Format toggles ──

  it("renders all format buttons when open", async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvitePreferencesSettings />);

    await user.click(screen.getByText("invite_open"));

    expect(screen.getByText("pauper")).toBeInTheDocument();
    expect(screen.getByText("commander")).toBeInTheDocument();
    expect(screen.getByText("standard")).toBeInTheDocument();
    expect(screen.getByText("draft")).toBeInTheDocument();
  });

  it("toggling a format adds it and clicking again removes it", async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvitePreferencesSettings />);

    await user.click(screen.getByText("invite_open"));

    // Click pauper to select it
    await user.click(screen.getByText("pauper"));

    // Save and check formats include pauper
    await user.click(screen.getByText("save"));

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          formats: ["pauper"],
        })
      );
    });
  });

  it("toggling format off removes it from selection", async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvitePreferencesSettings />);

    await user.click(screen.getByText("invite_open"));

    // Click pauper to add, then click again to remove
    await user.click(screen.getByText("pauper"));
    await user.click(screen.getByText("pauper"));

    await user.click(screen.getByText("save"));

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          formats: [],
        })
      );
    });
  });

  // ── Visibility select ──

  it("renders visibility select when open", async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvitePreferencesSettings />);

    await user.click(screen.getByText("invite_open"));

    expect(screen.getByText("invite_visibility")).toBeInTheDocument();
  });

  // ── DND mode ──

  it("renders DND section when open", async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvitePreferencesSettings />);

    await user.click(screen.getByText("invite_open"));

    expect(screen.getByText("dnd_mode")).toBeInTheDocument();
    // DND button — no date set yet so shows "dnd_disable"
    expect(screen.getByText("dnd_disable")).toBeInTheDocument();
  });

  it("DND button text changes when date is entered", async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvitePreferencesSettings />);

    await user.click(screen.getByText("invite_open"));

    const dateInput = screen.getByDisplayValue("");
    await user.type(dateInput, "2026-12-31T23:59");

    // Now button should say "dnd_enable"
    expect(screen.getByText("dnd_enable")).toBeInTheDocument();
  });

  it("clicking DND button with date calls updateDnd with ISO string", async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvitePreferencesSettings />);

    await user.click(screen.getByText("invite_open"));

    const dateInput = screen.getByDisplayValue("");
    await user.type(dateInput, "2026-12-31T23:59");

    await user.click(screen.getByText("dnd_enable"));

    await waitFor(() => {
      expect(mockUpdateDnd).toHaveBeenCalledWith(
        expect.stringContaining("2026-12-31")
      );
    });
  });

  it("clicking DND button with date shows success toast", async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvitePreferencesSettings />);

    await user.click(screen.getByText("invite_open"));

    const dateInput = screen.getByDisplayValue("");
    await user.type(dateInput, "2026-12-31T23:59");

    await user.click(screen.getByText("dnd_enable"));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({ title: "dnd_enable" });
    });
  });

  it("clicking DND button without date calls updateDnd with null", async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvitePreferencesSettings />);

    await user.click(screen.getByText("invite_open"));

    // No date entered, button shows dnd_disable
    await user.click(screen.getByText("dnd_disable"));

    await waitFor(() => {
      expect(mockUpdateDnd).toHaveBeenCalledWith(null);
    });
  });

  it("clicking DND button without date shows disable toast", async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvitePreferencesSettings />);

    await user.click(screen.getByText("invite_open"));

    await user.click(screen.getByText("dnd_disable"));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({ title: "dnd_disable" });
    });
  });

  it("DND error shows destructive toast", async () => {
    mockUpdateDnd.mockRejectedValue(new Error("fail"));
    const user = userEvent.setup();
    renderWithProviders(<InvitePreferencesSettings />);

    await user.click(screen.getByText("invite_open"));
    await user.click(screen.getByText("dnd_disable"));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "error",
        variant: "destructive",
      });
    });
  });

  // ── Save ──

  it("save calls upsert with correct payload when isOpen=false", async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvitePreferencesSettings />);

    // isOpen defaults to false, just click save
    await user.click(screen.getByText("save"));

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-1",
          is_open: false,
          formats: [],
          visibility: "all",
        })
      );
    });
  });

  it("save calls upsert with is_open=true and converted boolean slots", async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvitePreferencesSettings />);

    // Toggle open
    await user.click(screen.getByText("invite_open"));

    await user.click(screen.getByText("save"));

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-1",
          is_open: true,
          available_slots: expect.any(Object),
          formats: expect.any(Array),
          visibility: "all",
        })
      );
    });
  });

  it("save shows success toast", async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvitePreferencesSettings />);

    await user.click(screen.getByText("save"));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({ title: "profile_saved" });
    });
  });

  it("save shows error toast on failure", async () => {
    mockUpsert.mockRejectedValue(new Error("fail"));
    const user = userEvent.setup();
    renderWithProviders(<InvitePreferencesSettings />);

    await user.click(screen.getByText("save"));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "error",
        variant: "destructive",
      });
    });
  });

  it("save button is disabled while isUpdating", () => {
    mockIsUpdating = true;
    renderWithProviders(<InvitePreferencesSettings />);

    const saveButton = screen.getByText("save").closest("button");
    expect(saveButton).toBeDisabled();
  });

  // ── Data restore from existing preferences ──

  it("populates isOpen from existing preferences", () => {
    mockPrefs = {
      is_open: true,
      available_slots: { sun_day: true, sun_evening: false },
      formats: ["pauper", "commander"],
      visibility: "played_together",
      dnd_until: null,
    };

    renderWithProviders(<InvitePreferencesSettings />);

    // When is_open=true in prefs, the settings should be visible
    expect(screen.getByText("invite_schedule")).toBeInTheDocument();
    expect(screen.getByText("invite_formats")).toBeInTheDocument();
    expect(screen.getByText("invite_visibility")).toBeInTheDocument();
  });

  it("populates fields from existing preferences and saves correctly", async () => {
    mockPrefs = {
      is_open: true,
      available_slots: { sun_day: true, mon_evening: false },
      formats: ["pauper", "commander"],
      visibility: "my_venues",
      dnd_until: null,
    };

    const user = userEvent.setup();
    renderWithProviders(<InvitePreferencesSettings />);

    // Save without any changes — should preserve loaded data
    await user.click(screen.getByText("save"));

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-1",
          is_open: true,
          formats: ["pauper", "commander"],
          visibility: "my_venues",
          available_slots: expect.objectContaining({
            sun_day: true,
            mon_evening: false,
          }),
        })
      );
    });
  });

  it("populates DND date from existing preferences with future date", () => {
    const futureDate = new Date(Date.now() + 86400000 * 30).toISOString();
    mockPrefs = {
      is_open: true,
      available_slots: {},
      formats: [],
      visibility: "all",
      dnd_until: futureDate,
    };

    renderWithProviders(<InvitePreferencesSettings />);

    // The DND button should show "dnd_enable" because a date is populated
    expect(screen.getByText("dnd_enable")).toBeInTheDocument();
  });

  it("does not populate DND date from preferences when date is in the past", () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    mockPrefs = {
      is_open: true,
      available_slots: {},
      formats: [],
      visibility: "all",
      dnd_until: pastDate,
    };

    renderWithProviders(<InvitePreferencesSettings />);

    // Past date should not be populated, so button should show "dnd_disable"
    expect(screen.getByText("dnd_disable")).toBeInTheDocument();
  });

  it("does not show settings when prefs have is_open=false", () => {
    mockPrefs = {
      is_open: false,
      available_slots: {},
      formats: [],
      visibility: "all",
      dnd_until: null,
    };

    renderWithProviders(<InvitePreferencesSettings />);

    expect(screen.queryByText("invite_schedule")).not.toBeInTheDocument();
    expect(screen.queryByText("invite_formats")).not.toBeInTheDocument();
  });
});
