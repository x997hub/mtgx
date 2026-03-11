/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ProfileEditPage from "../ProfileEditPage";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

// Toast
const mockToastFn = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: mockToastFn }),
}));

// Navigation
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// useProfile
const mockUpdateProfile = vi.fn().mockResolvedValue({});
const mockUpdateAvailability = vi.fn().mockResolvedValue({});
const mockUpsertProfile = vi.fn().mockResolvedValue({});

let mockProfileData: {
  profile: any;
  availability: any[];
  isLoading: boolean;
  isUpdating: boolean;
} = {
  profile: null,
  availability: [],
  isLoading: false,
  isUpdating: false,
};

vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({
    ...mockProfileData,
    updateProfile: mockUpdateProfile,
    upsertProfile: mockUpsertProfile,
    updateAvailability: mockUpdateAvailability,
  }),
}));

// useAuth
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@test.com" },
    session: {},
    isAuthenticated: true,
    isLoading: false,
    profileChecked: true,
    profile: null,
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
  }),
  useAuthListener: vi.fn(),
}));

// authStore (used internally by useProfile)
vi.mock("@/store/authStore", () => ({
  useAuthStore: Object.assign(
    (selector: (state: any) => any) =>
      selector({ user: { id: "user-1", email: "test@test.com" } }),
    {
      getState: () => ({
        user: { id: "user-1", email: "test@test.com" },
        setProfile: vi.fn(),
      }),
    },
  ),
}));

// Mock child components that need QueryClient
vi.mock("@/components/profile/AutoMatchSettings", () => ({
  AutoMatchSettings: () => <div data-testid="auto-match-settings" />,
}));
vi.mock("@/components/profile/InvitePreferencesSettings", () => ({
  InvitePreferencesSettings: () => <div data-testid="invite-prefs" />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProfile(overrides: Record<string, any> = {}) {
  return {
    id: "user-1",
    display_name: "Alice",
    city: "Tel Aviv",
    formats: ["pauper"],
    whatsapp: "+1234567890",
    arena_username: "Alice#12345",
    bio: "Hello world",
    car_access: "yes",
    interested_in_trading: true,
    playstyle: "mixed",
    game_speed: "medium",
    social_level: "moderate",
    role: "player",
    reliability_score: 100,
    avatar_url: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeAvailability(entries: Array<{ day: string; slot: string; level: string }>) {
  return entries.map((e, i) => ({
    id: i + 1,
    user_id: "user-1",
    day: e.day,
    slot: e.slot,
    level: e.level,
  }));
}

function setProfileData(overrides: Partial<typeof mockProfileData> = {}) {
  mockProfileData = {
    profile: makeProfile(),
    availability: [],
    isLoading: false,
    isUpdating: false,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ProfileEditPage />
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ProfileEditPage — comprehensive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateProfile.mockResolvedValue({});
    mockUpdateAvailability.mockResolvedValue({});
    mockProfileData = {
      profile: null,
      availability: [],
      isLoading: false,
      isUpdating: false,
    };
  });

  // =========================================================================
  // Loading state
  // =========================================================================
  describe("Loading state", () => {
    it("shows skeletons when isLoading is true", () => {
      setProfileData({ profile: null, isLoading: true });
      renderPage();

      // Skeleton container is rendered
      expect(document.querySelector(".space-y-4")).toBeInTheDocument();
      // The edit_profile heading should NOT be visible
      expect(screen.queryByText("edit_profile")).not.toBeInTheDocument();
    });

    it("does not show the form while loading", () => {
      setProfileData({ profile: null, isLoading: true });
      renderPage();

      expect(screen.queryByLabelText("display_name")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("whatsapp")).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Profile restore — form fields populated from existing profile data
  // =========================================================================
  describe("Profile restore", () => {
    it("populates displayName from profile", () => {
      setProfileData();
      renderPage();
      expect(screen.getByLabelText("display_name")).toHaveValue("Alice");
    });

    it("populates whatsapp from profile", () => {
      setProfileData();
      renderPage();
      expect(screen.getByLabelText("whatsapp")).toHaveValue("+1234567890");
    });

    it("populates arenaUsername from profile", () => {
      setProfileData();
      renderPage();
      expect(screen.getByLabelText("arena_username")).toHaveValue("Alice#12345");
    });

    it("populates bio from profile", () => {
      setProfileData();
      renderPage();
      expect(screen.getByLabelText("bio")).toHaveValue("Hello world");
    });

    it("populates car_access toggle from profile", () => {
      setProfileData();
      renderPage();
      // "yes" option should be styled as active (bg-accent)
      const yesBtn = screen.getByRole("button", { name: "car_yes" });
      expect(yesBtn.className).toContain("bg-accent");
    });

    it("populates interested_in_trading from profile", () => {
      setProfileData();
      renderPage();
      // The checkbox-like toggle should show the Repeat icon when active
      const tradingBtn = screen.getByRole("button", { name: /interested_in_trading/i });
      // The inner div should have bg-accent when active
      const indicator = tradingBtn.querySelector("div");
      expect(indicator?.className).toContain("bg-accent");
    });

    it("populates formats from profile", () => {
      setProfileData({ profile: makeProfile({ formats: ["pauper", "commander"] }) });
      renderPage();
      // Active format buttons have FORMAT_TOGGLE_COLORS active classes
      const pauperBtn = screen.getByRole("button", { name: "pauper" });
      expect(pauperBtn.className).toContain("bg-format-pauper");
    });

    it("populates playstyle from profile", () => {
      setProfileData({ profile: makeProfile({ playstyle: "competitive" }) });
      renderPage();
      const btn = screen.getByRole("button", { name: "competitive" });
      expect(btn.className).toContain("bg-accent");
    });

    it("populates gameSpeed from profile", () => {
      setProfileData({ profile: makeProfile({ game_speed: "fast" }) });
      renderPage();
      const btn = screen.getByRole("button", { name: "fast" });
      expect(btn.className).toContain("bg-accent");
    });

    it("populates socialLevel from profile", () => {
      setProfileData({ profile: makeProfile({ social_level: "talkative" }) });
      renderPage();
      const btn = screen.getByRole("button", { name: "talkative" });
      expect(btn.className).toContain("bg-accent");
    });

    it("sets defaults when profile has null game style fields", () => {
      setProfileData({
        profile: makeProfile({
          playstyle: null,
          game_speed: null,
          social_level: null,
        }),
      });
      renderPage();

      // Defaults: mixed, medium, moderate
      const mixedBtn = screen.getByRole("button", { name: "mixed" });
      expect(mixedBtn.className).toContain("bg-accent");
      const mediumBtn = screen.getByRole("button", { name: "medium" });
      expect(mediumBtn.className).toContain("bg-accent");
      const moderateBtn = screen.getByRole("button", { name: "moderate" });
      expect(moderateBtn.className).toContain("bg-accent");
    });

    it("restores availability grid from data", () => {
      setProfileData({
        availability: makeAvailability([
          { day: "sun", slot: "morning", level: "available" },
          { day: "mon", slot: "evening", level: "sometimes" },
        ]),
      });
      renderPage();

      // The availability grid buttons have title attributes
      const sunMorningBtn = screen.getByTitle("available");
      expect(sunMorningBtn).toBeInTheDocument();
      expect(sunMorningBtn.className).toContain("bg-success");
    });

    it("handles null optional fields gracefully", () => {
      setProfileData({
        profile: makeProfile({
          whatsapp: null,
          arena_username: null,
          bio: null,
          car_access: null,
          interested_in_trading: false,
        }),
      });
      renderPage();

      expect(screen.getByLabelText("whatsapp")).toHaveValue("");
      expect(screen.getByLabelText("arena_username")).toHaveValue("");
      expect(screen.getByLabelText("bio")).toHaveValue("");
    });
  });

  // =========================================================================
  // displayName field
  // =========================================================================
  describe("displayName field", () => {
    it("renders a text input with correct label", () => {
      setProfileData();
      renderPage();
      const input = screen.getByLabelText("display_name");
      expect(input).toBeInTheDocument();
      expect(input.tagName).toBe("INPUT");
    });

    it("updates value on user input", async () => {
      const user = userEvent.setup();
      setProfileData({ profile: makeProfile({ display_name: "" }) });
      renderPage();

      const input = screen.getByLabelText("display_name");
      await user.type(input, "Bob");
      expect(input).toHaveValue("Bob");
    });

    it("trims displayName on save", async () => {
      const user = userEvent.setup();
      setProfileData({
        profile: makeProfile({ display_name: "  Alice  " }),
      });
      renderPage();

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await vi.waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({ display_name: "Alice" }),
        );
      });
    });
  });

  // =========================================================================
  // city field (Select dropdown)
  // =========================================================================
  describe("city field", () => {
    it("renders the city select trigger", () => {
      setProfileData();
      renderPage();
      // Radix Select renders a combobox
      const triggers = document.querySelectorAll('[role="combobox"]');
      expect(triggers.length).toBeGreaterThanOrEqual(1);
    });

    it("shows the current city value from profile", () => {
      setProfileData({ profile: makeProfile({ city: "Tel Aviv" }) });
      renderPage();
      // The trigger should display the selected city
      expect(screen.getByText("Tel Aviv")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // whatsapp field
  // =========================================================================
  describe("whatsapp field", () => {
    it("renders a tel input", () => {
      setProfileData();
      renderPage();
      const input = screen.getByLabelText("whatsapp") as HTMLInputElement;
      expect(input.type).toBe("tel");
    });

    it("accepts valid phone number", async () => {
      const user = userEvent.setup();
      setProfileData({
        profile: makeProfile({ whatsapp: null }),
      });
      renderPage();

      const input = screen.getByLabelText("whatsapp");
      await user.type(input, "+972501234567");
      expect(input).toHaveValue("+972501234567");
    });

    it("rejects invalid phone number on save and shows toast", async () => {
      const user = userEvent.setup();
      setProfileData({
        profile: makeProfile({ whatsapp: null }),
      });
      renderPage();

      const input = screen.getByLabelText("whatsapp");
      await user.type(input, "not-a-number");

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      expect(mockToastFn).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "invalid_phone",
          variant: "destructive",
        }),
      );
      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    it("accepts empty whatsapp (optional field)", async () => {
      const user = userEvent.setup();
      setProfileData({
        profile: makeProfile({ whatsapp: null }),
      });
      renderPage();

      // Don't type anything in whatsapp — just save
      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await vi.waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({ whatsapp: null }),
        );
      });
    });

    it("sends null for empty whatsapp on save", async () => {
      const user = userEvent.setup();
      setProfileData({ profile: makeProfile({ whatsapp: "+123" }) });
      renderPage();

      const input = screen.getByLabelText("whatsapp");
      await user.clear(input);

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await vi.waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({ whatsapp: null }),
        );
      });
    });

    it("validates phone with spaces/dashes (strips before regex check)", async () => {
      const user = userEvent.setup();
      setProfileData({ profile: makeProfile({ whatsapp: null }) });
      renderPage();

      const input = screen.getByLabelText("whatsapp");
      await user.type(input, "+972 50-123-4567");

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      // Should pass validation (spaces and dashes stripped)
      await vi.waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalled();
      });
    });
  });

  // =========================================================================
  // arenaUsername field
  // =========================================================================
  describe("arenaUsername field", () => {
    it("renders a text input for arena username", () => {
      setProfileData();
      renderPage();
      const input = screen.getByLabelText("arena_username");
      expect(input).toBeInTheDocument();
    });

    it("trims arena username on save", async () => {
      const user = userEvent.setup();
      setProfileData({
        profile: makeProfile({ arena_username: "  Player#123  " }),
      });
      renderPage();

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await vi.waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({ arena_username: "Player#123" }),
        );
      });
    });

    it("sends null for empty arena username on save", async () => {
      const user = userEvent.setup();
      setProfileData({ profile: makeProfile({ arena_username: "Player" }) });
      renderPage();

      const input = screen.getByLabelText("arena_username");
      await user.clear(input);

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await vi.waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({ arena_username: null }),
        );
      });
    });
  });

  // =========================================================================
  // bio field
  // =========================================================================
  describe("bio field", () => {
    it("renders a textarea with 3 rows", () => {
      setProfileData();
      renderPage();
      const textarea = screen.getByLabelText("bio") as HTMLTextAreaElement;
      expect(textarea.tagName).toBe("TEXTAREA");
      expect(textarea.rows).toBe(3);
    });

    it("trims bio on save", async () => {
      const user = userEvent.setup();
      setProfileData({ profile: makeProfile({ bio: "  Hello  " }) });
      renderPage();

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await vi.waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({ bio: "Hello" }),
        );
      });
    });

    it("sends null for empty bio on save", async () => {
      const user = userEvent.setup();
      setProfileData({ profile: makeProfile({ bio: "text" }) });
      renderPage();

      const textarea = screen.getByLabelText("bio");
      await user.clear(textarea);

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await vi.waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({ bio: null }),
        );
      });
    });
  });

  // =========================================================================
  // carAccess toggle buttons
  // =========================================================================
  describe("carAccess toggle buttons", () => {
    it("renders three options: yes, no, sometimes", () => {
      setProfileData();
      renderPage();
      expect(screen.getByRole("button", { name: "car_yes" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "car_no" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "car_sometimes" })).toBeInTheDocument();
    });

    it("toggles car access option", async () => {
      const user = userEvent.setup();
      setProfileData({ profile: makeProfile({ car_access: null }) });
      renderPage();

      const noBtn = screen.getByRole("button", { name: "car_no" });
      await user.click(noBtn);
      expect(noBtn.className).toContain("bg-accent");
    });

    it("deselects when clicking already selected option", async () => {
      const user = userEvent.setup();
      setProfileData({ profile: makeProfile({ car_access: "yes" }) });
      renderPage();

      const yesBtn = screen.getByRole("button", { name: "car_yes" });
      expect(yesBtn.className).toContain("bg-accent");

      await user.click(yesBtn);
      // After clicking the active button, it should deselect — no bg-accent
      expect(yesBtn.className).not.toContain("bg-accent");
    });

    it("sends null for car_access when none selected on save", async () => {
      const user = userEvent.setup();
      setProfileData({ profile: makeProfile({ car_access: null }) });
      renderPage();

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await vi.waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({ car_access: null }),
        );
      });
    });

    it("sends selected car_access value on save", async () => {
      const user = userEvent.setup();
      setProfileData({ profile: makeProfile({ car_access: null }) });
      renderPage();

      await user.click(screen.getByRole("button", { name: "car_sometimes" }));

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await vi.waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({ car_access: "sometimes" }),
        );
      });
    });
  });

  // =========================================================================
  // interestedInTrading checkbox toggle
  // =========================================================================
  describe("interestedInTrading toggle", () => {
    it("renders the trading toggle button", () => {
      setProfileData();
      renderPage();
      expect(
        screen.getByRole("button", { name: /interested_in_trading/i }),
      ).toBeInTheDocument();
    });

    it("toggles trading interest on click", async () => {
      const user = userEvent.setup();
      setProfileData({ profile: makeProfile({ interested_in_trading: false }) });
      renderPage();

      const btn = screen.getByRole("button", { name: /interested_in_trading/i });
      const indicator = btn.querySelector("div");
      // Initially not active
      expect(indicator?.className).not.toContain("bg-accent");

      await user.click(btn);
      // Now active
      expect(indicator?.className).toContain("bg-accent");
    });

    it("sends correct boolean on save", async () => {
      const user = userEvent.setup();
      setProfileData({ profile: makeProfile({ interested_in_trading: false }) });
      renderPage();

      // Toggle it on
      await user.click(screen.getByRole("button", { name: /interested_in_trading/i }));

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await vi.waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({ interested_in_trading: true }),
        );
      });
    });

    it("sends false when toggled off", async () => {
      const user = userEvent.setup();
      setProfileData({ profile: makeProfile({ interested_in_trading: true }) });
      renderPage();

      // Toggle it off
      await user.click(screen.getByRole("button", { name: /interested_in_trading/i }));

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await vi.waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({ interested_in_trading: false }),
        );
      });
    });
  });

  // =========================================================================
  // Formats multi-select
  // =========================================================================
  describe("formats multi-select", () => {
    it("renders all four format buttons", () => {
      setProfileData();
      renderPage();
      expect(screen.getByRole("button", { name: "pauper" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "commander" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "standard" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "draft" })).toBeInTheDocument();
    });

    it("shows active formats from profile with correct colors", () => {
      setProfileData({
        profile: makeProfile({ formats: ["pauper", "draft"] }),
      });
      renderPage();

      const pauperBtn = screen.getByRole("button", { name: "pauper" });
      expect(pauperBtn.className).toContain("bg-format-pauper");

      const draftBtn = screen.getByRole("button", { name: "draft" });
      expect(draftBtn.className).toContain("bg-format-draft");

      // Commander should be inactive
      const commanderBtn = screen.getByRole("button", { name: "commander" });
      expect(commanderBtn.className).toContain("bg-surface-hover");
    });

    it("toggles a format on click", async () => {
      const user = userEvent.setup();
      setProfileData({ profile: makeProfile({ formats: ["pauper"] }) });
      renderPage();

      const commanderBtn = screen.getByRole("button", { name: "commander" });
      await user.click(commanderBtn);
      // Now commander should be active
      expect(commanderBtn.className).toContain("bg-format-commander");
    });

    it("removes a format on click when already selected", async () => {
      const user = userEvent.setup();
      setProfileData({ profile: makeProfile({ formats: ["pauper", "commander"] }) });
      renderPage();

      const pauperBtn = screen.getByRole("button", { name: "pauper" });
      await user.click(pauperBtn);
      // Now pauper should be inactive
      expect(pauperBtn.className).toContain("bg-surface-hover");
    });

    it("sends updated formats on save", async () => {
      const user = userEvent.setup();
      setProfileData({ profile: makeProfile({ formats: ["pauper"] }) });
      renderPage();

      // Add commander
      await user.click(screen.getByRole("button", { name: "commander" }));

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await vi.waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            formats: ["pauper", "commander"],
          }),
        );
      });
    });
  });

  // =========================================================================
  // Availability grid
  // =========================================================================
  describe("availability grid", () => {
    it("renders 7 days x 3 slots = 21 grid buttons", () => {
      setProfileData();
      renderPage();

      // Find the availability table
      const table = document.querySelector("table");
      expect(table).toBeInTheDocument();

      // Each cell contains a button
      const gridButtons = table!.querySelectorAll("td button");
      expect(gridButtons.length).toBe(21);
    });

    it("cycles through available → sometimes → unavailable on click", async () => {
      const user = userEvent.setup();
      setProfileData();
      renderPage();

      const table = document.querySelector("table")!;
      // First grid button (first day, first slot)
      const firstBtn = table.querySelector("td button")!;

      // Initially unavailable
      expect(firstBtn.className).toContain("bg-surface-hover");
      expect(firstBtn).toHaveAttribute("title", "unavailable");

      // Click 1: unavailable → available
      await user.click(firstBtn);
      expect(firstBtn).toHaveAttribute("title", "available");
      expect(firstBtn.className).toContain("bg-success");

      // Click 2: available → sometimes
      await user.click(firstBtn);
      expect(firstBtn).toHaveAttribute("title", "sometimes");
      expect(firstBtn.className).toContain("bg-warning");

      // Click 3: sometimes → unavailable
      await user.click(firstBtn);
      expect(firstBtn).toHaveAttribute("title", "unavailable");
      expect(firstBtn.className).toContain("bg-surface-hover");
    });

    it("shows the legend (available, sometimes, unavailable)", () => {
      setProfileData();
      renderPage();

      expect(screen.getByText("available")).toBeInTheDocument();
      expect(screen.getByText("sometimes")).toBeInTheDocument();
      expect(screen.getByText("unavailable")).toBeInTheDocument();
    });

    it("sends all 21 slots on save", async () => {
      const user = userEvent.setup();
      setProfileData();
      renderPage();

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await vi.waitFor(() => {
        expect(mockUpdateAvailability).toHaveBeenCalledTimes(1);
        const slots = mockUpdateAvailability.mock.calls[0][0];
        // 7 days * 3 slots = 21 entries
        expect(slots).toHaveLength(21);
        // Each slot has user_id, day, slot, level
        expect(slots[0]).toHaveProperty("user_id", "user-1");
        expect(slots[0]).toHaveProperty("day");
        expect(slots[0]).toHaveProperty("slot");
        expect(slots[0]).toHaveProperty("level");
      });
    });

    it("sends correct level for modified slot", async () => {
      const user = userEvent.setup();
      setProfileData();
      renderPage();

      // Click the first grid button to make it "available"
      const table = document.querySelector("table")!;
      const firstBtn = table.querySelector("td button")!;
      await user.click(firstBtn);

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await vi.waitFor(() => {
        const slots = mockUpdateAvailability.mock.calls[0][0];
        // Find the first slot (sun-morning)
        const sunMorning = slots.find(
          (s: any) => s.day === "sun" && s.slot === "morning",
        );
        expect(sunMorning?.level).toBe("available");
      });
    });
  });

  // =========================================================================
  // Playstyle toggle
  // =========================================================================
  describe("playstyle toggles", () => {
    it("renders casual, mixed, competitive buttons", () => {
      setProfileData();
      renderPage();

      expect(screen.getByRole("button", { name: "casual" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "mixed" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "competitive" })).toBeInTheDocument();
    });

    it("defaults to mixed", () => {
      setProfileData({ profile: makeProfile({ playstyle: null }) });
      renderPage();

      const btn = screen.getByRole("button", { name: "mixed" });
      expect(btn.className).toContain("bg-accent");
    });

    it("switches selection on click", async () => {
      const user = userEvent.setup();
      setProfileData();
      renderPage();

      const casualBtn = screen.getByRole("button", { name: "casual" });
      await user.click(casualBtn);
      expect(casualBtn.className).toContain("bg-accent");

      // Mixed should no longer be active
      const mixedBtn = screen.getByRole("button", { name: "mixed" });
      expect(mixedBtn.className).not.toContain("bg-accent");
    });

    it("sends selected playstyle on save", async () => {
      const user = userEvent.setup();
      setProfileData();
      renderPage();

      await user.click(screen.getByRole("button", { name: "competitive" }));

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await vi.waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({ playstyle: "competitive" }),
        );
      });
    });
  });

  // =========================================================================
  // GameSpeed toggle
  // =========================================================================
  describe("gameSpeed toggles", () => {
    it("renders slow, medium, fast buttons", () => {
      setProfileData();
      renderPage();

      expect(screen.getByRole("button", { name: "slow" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "medium" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "fast" })).toBeInTheDocument();
    });

    it("defaults to medium", () => {
      setProfileData({ profile: makeProfile({ game_speed: null }) });
      renderPage();

      const btn = screen.getByRole("button", { name: "medium" });
      expect(btn.className).toContain("bg-accent");
    });

    it("switches to fast on click", async () => {
      const user = userEvent.setup();
      setProfileData();
      renderPage();

      const fastBtn = screen.getByRole("button", { name: "fast" });
      await user.click(fastBtn);
      expect(fastBtn.className).toContain("bg-accent");

      const mediumBtn = screen.getByRole("button", { name: "medium" });
      expect(mediumBtn.className).not.toContain("bg-accent");
    });

    it("sends selected game_speed on save", async () => {
      const user = userEvent.setup();
      setProfileData();
      renderPage();

      await user.click(screen.getByRole("button", { name: "slow" }));

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await vi.waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({ game_speed: "slow" }),
        );
      });
    });
  });

  // =========================================================================
  // SocialLevel toggle
  // =========================================================================
  describe("socialLevel toggles", () => {
    it("renders quiet, moderate, talkative buttons", () => {
      setProfileData();
      renderPage();

      expect(screen.getByRole("button", { name: "quiet" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "moderate" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "talkative" })).toBeInTheDocument();
    });

    it("defaults to moderate", () => {
      setProfileData({ profile: makeProfile({ social_level: null }) });
      renderPage();

      const btn = screen.getByRole("button", { name: "moderate" });
      expect(btn.className).toContain("bg-accent");
    });

    it("switches to quiet on click", async () => {
      const user = userEvent.setup();
      setProfileData();
      renderPage();

      const quietBtn = screen.getByRole("button", { name: "quiet" });
      await user.click(quietBtn);
      expect(quietBtn.className).toContain("bg-accent");
    });

    it("sends selected social_level on save", async () => {
      const user = userEvent.setup();
      setProfileData();
      renderPage();

      await user.click(screen.getByRole("button", { name: "talkative" }));

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await vi.waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({ social_level: "talkative" }),
        );
      });
    });
  });

  // =========================================================================
  // Save button behavior
  // =========================================================================
  describe("Save button", () => {
    it("is disabled when displayName is empty", () => {
      setProfileData({ profile: makeProfile({ display_name: "" }) });
      renderPage();

      const saveButton = screen.getByRole("button", { name: /save/i });
      expect(saveButton).toBeDisabled();
    });

    it("is disabled when displayName is only whitespace", () => {
      setProfileData({ profile: makeProfile({ display_name: "   " }) });
      renderPage();

      const saveButton = screen.getByRole("button", { name: /save/i });
      expect(saveButton).toBeDisabled();
    });

    it("is disabled when city is empty", () => {
      setProfileData({ profile: makeProfile({ city: "" }) });
      renderPage();

      const saveButton = screen.getByRole("button", { name: /save/i });
      expect(saveButton).toBeDisabled();
    });

    it("is disabled when isUpdating is true", () => {
      setProfileData({ isUpdating: true });
      renderPage();

      const saveButton = screen.getByRole("button", { name: /save/i });
      expect(saveButton).toBeDisabled();
    });

    it("is enabled when displayName and city are present", () => {
      setProfileData();
      renderPage();

      const saveButton = screen.getByRole("button", { name: /save/i });
      expect(saveButton).not.toBeDisabled();
    });

    it("calls both updateProfile and updateAvailability on save", async () => {
      const user = userEvent.setup();
      setProfileData();
      renderPage();

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await vi.waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
        expect(mockUpdateAvailability).toHaveBeenCalledTimes(1);
      });
    });

    it("navigates to /profile after successful save", async () => {
      const user = userEvent.setup();
      setProfileData();
      renderPage();

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await vi.waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/profile");
      });
    });

    it("shows success toast after save", async () => {
      const user = userEvent.setup();
      setProfileData();
      renderPage();

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await vi.waitFor(() => {
        expect(mockToastFn).toHaveBeenCalledWith(
          expect.objectContaining({ title: "profile_saved" }),
        );
      });
    });

    it("sends complete payload on save with all fields", async () => {
      const user = userEvent.setup();
      setProfileData({
        profile: makeProfile({
          display_name: "Alice",
          city: "Tel Aviv",
          formats: ["pauper"],
          whatsapp: "+972501234567",
          arena_username: "Alice#123",
          bio: "My bio",
          car_access: "yes",
          interested_in_trading: true,
          playstyle: "mixed",
          game_speed: "medium",
          social_level: "moderate",
        }),
      });
      renderPage();

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await vi.waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          display_name: "Alice",
          city: "Tel Aviv",
          formats: ["pauper"],
          whatsapp: "+972501234567",
          arena_username: "Alice#123",
          bio: "My bio",
          car_access: "yes",
          interested_in_trading: true,
          playstyle: "mixed",
          game_speed: "medium",
          social_level: "moderate",
        });
      });
    });
  });

  // =========================================================================
  // Error handling on save
  // =========================================================================
  describe("Error handling", () => {
    it("shows error toast when updateProfile fails", async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockRejectedValueOnce(new Error("fail"));
      setProfileData();
      renderPage();

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await vi.waitFor(() => {
        expect(mockToastFn).toHaveBeenCalledWith(
          expect.objectContaining({ title: "error", variant: "destructive" }),
        );
      });
    });

    it("shows error toast when updateAvailability fails", async () => {
      const user = userEvent.setup();
      mockUpdateAvailability.mockRejectedValueOnce(new Error("fail"));
      setProfileData();
      renderPage();

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await vi.waitFor(() => {
        expect(mockToastFn).toHaveBeenCalledWith(
          expect.objectContaining({ title: "error", variant: "destructive" }),
        );
      });
    });

    it("does not navigate on save error", async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockRejectedValueOnce(new Error("fail"));
      setProfileData();
      renderPage();

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await vi.waitFor(() => {
        expect(mockToastFn).toHaveBeenCalled();
      });
      expect(mockNavigate).not.toHaveBeenCalledWith("/profile");
    });

    it("does not call updateAvailability if updateProfile fails", async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockRejectedValueOnce(new Error("fail"));
      setProfileData();
      renderPage();

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await vi.waitFor(() => {
        expect(mockToastFn).toHaveBeenCalled();
      });
      expect(mockUpdateAvailability).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Cancel button
  // =========================================================================
  describe("Cancel button", () => {
    it("navigates to /profile on cancel click", async () => {
      const user = userEvent.setup();
      setProfileData();
      renderPage();

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockNavigate).toHaveBeenCalledWith("/profile");
    });

    it("does not save when cancel is clicked", async () => {
      const user = userEvent.setup();
      setProfileData();
      renderPage();

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockUpdateProfile).not.toHaveBeenCalled();
      expect(mockUpdateAvailability).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Child components
  // =========================================================================
  describe("Child components", () => {
    it("renders AutoMatchSettings", () => {
      setProfileData();
      renderPage();
      expect(screen.getByTestId("auto-match-settings")).toBeInTheDocument();
    });

    it("renders InvitePreferencesSettings", () => {
      setProfileData();
      renderPage();
      expect(screen.getByTestId("invite-prefs")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Page heading
  // =========================================================================
  describe("Page heading", () => {
    it("shows edit_profile title", () => {
      setProfileData();
      renderPage();
      expect(screen.getByText("edit_profile")).toBeInTheDocument();
    });
  });
});
