/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import OnboardingPage from "../OnboardingPage";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// react-i18next — mirrors the key as returned text, supports namespaced keys
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) => {
      if (typeof fallback === "string") return fallback;
      return key;
    },
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

// Toast — use vi.hoisted because vi.mock is hoisted above variable declarations
const { mockToastFn } = vi.hoisted(() => ({ mockToastFn: vi.fn() }));
vi.mock("@/components/ui/use-toast", () => ({
  toast: mockToastFn,
  useToast: () => ({ toast: mockToastFn }),
}));

// Navigation
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// useProfile
const mockUpsertProfile = vi.fn().mockResolvedValue({});
const mockUpdateAvailability = vi.fn().mockResolvedValue({});

vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({
    profile: null,
    availability: [],
    isLoading: false,
    isUpdating: false,
    updateProfile: vi.fn(),
    upsertProfile: mockUpsertProfile,
    updateAvailability: mockUpdateAvailability,
  }),
}));

// useAuth — controls whether existing profile exists
let mockExistingProfile: any = null;

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "test@test.com",
      user_metadata: {
        full_name: "Test User",
        avatar_url: "https://example.com/avatar.jpg",
      },
    },
    session: {},
    isAuthenticated: true,
    isLoading: false,
    profileChecked: true,
    profile: mockExistingProfile,
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
  }),
  useAuthListener: vi.fn(),
}));

// useSubscription
const mockSubscribe = vi.fn();
vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({
    subscriptions: [],
    isLoading: false,
    subscribe: mockSubscribe,
    unsubscribe: vi.fn(),
    isSubscribing: false,
  }),
}));

// authStore
vi.mock("@/store/authStore", () => ({
  useAuthStore: Object.assign(
    (selector: (state: any) => any) =>
      selector({
        user: {
          id: "user-1",
          email: "test@test.com",
          user_metadata: {
            full_name: "Test User",
            avatar_url: "https://example.com/avatar.jpg",
          },
        },
      }),
    {
      getState: () => ({
        user: { id: "user-1", email: "test@test.com" },
        setProfile: vi.fn(),
      }),
    },
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsertProfile.mockResolvedValue({});
    mockUpdateAvailability.mockResolvedValue({});
    mockExistingProfile = null;
  });

  // =========================================================================
  // Step 0 — City selection
  // =========================================================================
  describe("Step 0: City selection", () => {
    it("shows city step title", () => {
      renderPage();
      expect(screen.getByText("profile:onboarding_city")).toBeInTheDocument();
    });

    it("renders city select trigger", () => {
      renderPage();
      const trigger = document.querySelector('[role="combobox"]');
      expect(trigger).toBeInTheDocument();
    });

    it("shows skip and next buttons", () => {
      renderPage();
      expect(screen.getByRole("button", { name: /common:skip/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /common:next/i })).toBeInTheDocument();
    });

    it("skip advances to step 1 without saving", async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole("button", { name: /common:skip/i }));

      // Should now show step 1 (formats)
      expect(screen.getByText("profile:onboarding_formats")).toBeInTheDocument();
      expect(mockUpsertProfile).not.toHaveBeenCalled();
    });

    it("next without city selection advances to step 1 without saving profile", async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole("button", { name: /common:next/i }));

      // Step 1 should be visible now
      expect(screen.getByText("profile:onboarding_formats")).toBeInTheDocument();
      // No city was set, so upsertProfile should NOT be called
      expect(mockUpsertProfile).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Step 1 — Format selection
  // =========================================================================
  describe("Step 1: Format selection", () => {
    async function goToStep1() {
      const user = userEvent.setup();
      renderPage();
      // Skip step 0
      await user.click(screen.getByRole("button", { name: /common:skip/i }));
      return user;
    }

    it("shows format step title", async () => {
      await goToStep1();
      expect(screen.getByText("profile:onboarding_formats")).toBeInTheDocument();
    });

    it("renders all four format badges", async () => {
      await goToStep1();
      expect(screen.getByText("events:pauper")).toBeInTheDocument();
      expect(screen.getByText("events:commander")).toBeInTheDocument();
      expect(screen.getByText("events:standard")).toBeInTheDocument();
      expect(screen.getByText("events:draft")).toBeInTheDocument();
    });

    it("toggles format selection on click", async () => {
      const user = await goToStep1();

      const pauperBadge = screen.getByText("events:pauper");
      await user.click(pauperBadge);

      // After click, should be styled as selected (bg-accent)
      expect(pauperBadge.className).toContain("bg-accent");
    });

    it("supports multi-select for formats", async () => {
      const user = await goToStep1();

      await user.click(screen.getByText("events:pauper"));
      await user.click(screen.getByText("events:commander"));

      // Both should be active
      expect(screen.getByText("events:pauper").className).toContain("bg-accent");
      expect(screen.getByText("events:commander").className).toContain("bg-accent");
    });

    it("deselects a format on second click", async () => {
      const user = await goToStep1();

      const badge = screen.getByText("events:pauper");
      await user.click(badge); // select
      await user.click(badge); // deselect

      expect(badge.className).not.toContain("bg-accent");
    });

    it("skip advances to step 2 without saving", async () => {
      const user = await goToStep1();

      await user.click(screen.getByRole("button", { name: /common:skip/i }));

      expect(screen.getByText("profile:onboarding_availability")).toBeInTheDocument();
      // No formats were selected, so upsertProfile should not be called for formats
      expect(mockUpsertProfile).not.toHaveBeenCalled();
    });

    it("next with formats selected calls upsertProfile", async () => {
      const user = await goToStep1();

      await user.click(screen.getByText("events:pauper"));
      await user.click(screen.getByRole("button", { name: /common:next/i }));

      await vi.waitFor(() => {
        expect(mockUpsertProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "user-1",
            formats: ["pauper"],
          }),
        );
      });
    });

    it("next without formats advances without saving", async () => {
      const user = await goToStep1();

      await user.click(screen.getByRole("button", { name: /common:next/i }));

      expect(screen.getByText("profile:onboarding_availability")).toBeInTheDocument();
      expect(mockUpsertProfile).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Step 2 — Availability grid
  // =========================================================================
  describe("Step 2: Availability grid", () => {
    async function goToStep2() {
      const user = userEvent.setup();
      renderPage();
      // Skip step 0
      await user.click(screen.getByRole("button", { name: /common:skip/i }));
      // Skip step 1
      await user.click(screen.getByRole("button", { name: /common:skip/i }));
      return user;
    }

    it("shows availability step title", async () => {
      await goToStep2();
      expect(screen.getByText("profile:onboarding_availability")).toBeInTheDocument();
    });

    it("shows the availability description", async () => {
      await goToStep2();
      expect(screen.getByText("profile:availability_description")).toBeInTheDocument();
    });

    it("renders 7 days x 3 slots = 21 toggle buttons", async () => {
      await goToStep2();

      // All buttons are inside the grid; find them by their aria-label pattern
      const gridButtons = screen.getAllByRole("button").filter((btn) => {
        const label = btn.getAttribute("aria-label");
        return label && label.includes("profile:");
      });
      expect(gridButtons.length).toBe(21);
    });

    it("toggles availability cell on click", async () => {
      const user = await goToStep2();

      // Find the first availability button by aria-label
      const gridButtons = screen.getAllByRole("button").filter((btn) => {
        const label = btn.getAttribute("aria-label");
        return label && label.includes("profile:");
      });
      const firstBtn = gridButtons[0];

      // Initially no checkmark
      expect(firstBtn.textContent).toBe("");

      // Click toggles it on
      await user.click(firstBtn);
      expect(firstBtn.textContent).toContain("\u2713");

      // Click again toggles it off
      await user.click(firstBtn);
      expect(firstBtn.textContent).toBe("");
    });

    it("next calls updateAvailability with selected slots", async () => {
      const user = await goToStep2();

      // Select a few slots
      const gridButtons = screen.getAllByRole("button").filter((btn) => {
        const label = btn.getAttribute("aria-label");
        return label && label.includes("profile:");
      });

      await user.click(gridButtons[0]); // First slot
      await user.click(gridButtons[1]); // Second slot

      await user.click(screen.getByRole("button", { name: /common:next/i }));

      await vi.waitFor(() => {
        expect(mockUpdateAvailability).toHaveBeenCalledTimes(1);
        const slots = mockUpdateAvailability.mock.calls[0][0];
        // Only the active slots are sent (not all 21)
        expect(slots.length).toBe(2);
        // Each slot should have user_id, day, slot, level
        expect(slots[0]).toHaveProperty("user_id", "user-1");
        expect(slots[0]).toHaveProperty("level", "available");
      });
    });

    it("skip advances to step 3 without saving", async () => {
      const user = await goToStep2();

      await user.click(screen.getByRole("button", { name: /common:skip/i }));

      expect(screen.getByText("profile:onboarding_subscribe")).toBeInTheDocument();
      expect(mockUpdateAvailability).not.toHaveBeenCalled();
    });

    it("next with no selection calls updateAvailability with empty array", async () => {
      const user = await goToStep2();

      await user.click(screen.getByRole("button", { name: /common:next/i }));

      await vi.waitFor(() => {
        expect(mockUpdateAvailability).toHaveBeenCalledWith([]);
      });
    });
  });

  // =========================================================================
  // Step 3 — Subscriptions preview
  // =========================================================================
  describe("Step 3: Subscriptions preview", () => {
    async function goToStep3(opts: { selectCity?: boolean; selectFormats?: boolean } = {}) {
      const user = userEvent.setup();
      renderPage();

      if (opts.selectCity) {
        // We cannot easily interact with Radix Select in jsdom,
        // so we test behavior through the skip/next path.
        // In this case, city won't be set and subscriptions won't show.
      }

      // Skip to step 3 (skip all previous steps)
      await user.click(screen.getByRole("button", { name: /common:skip/i })); // step 0 → 1
      await user.click(screen.getByRole("button", { name: /common:skip/i })); // step 1 → 2
      await user.click(screen.getByRole("button", { name: /common:skip/i })); // step 2 → 3
      return user;
    }

    it("shows subscribe step title", async () => {
      await goToStep3();
      expect(screen.getByText("profile:onboarding_subscribe")).toBeInTheDocument();
    });

    it("shows no-subs message when no city/formats selected", async () => {
      await goToStep3();
      // When city and formats were skipped, shows the fallback message
      expect(
        screen.getByText("You can set up subscriptions later in Settings"),
      ).toBeInTheDocument();
    });

    it("shows Done button instead of Next on last step", async () => {
      await goToStep3();
      expect(screen.getByRole("button", { name: /common:done/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /common:next/i })).not.toBeInTheDocument();
    });

    it("skip on last step navigates to home", async () => {
      const user = await goToStep3();

      await user.click(screen.getByRole("button", { name: /common:skip/i }));

      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    });

    it("Done button navigates to home", async () => {
      const user = await goToStep3();

      await user.click(screen.getByRole("button", { name: /common:done/i }));

      await vi.waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
      });
    });

    it("Done creates profile if no profile existed (all steps skipped)", async () => {
      const user = await goToStep3();

      await user.click(screen.getByRole("button", { name: /common:done/i }));

      await vi.waitFor(() => {
        expect(mockUpsertProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "user-1",
            display_name: "Test User",
          }),
        );
      });
    });
  });

  // =========================================================================
  // Progress bar
  // =========================================================================
  describe("Progress bar", () => {
    it("shows 25% progress on step 0", () => {
      renderPage();
      const progressBar = document.querySelector('[style*="width"]');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar?.getAttribute("style")).toContain("25%");
    });

    it("advances progress on each step", async () => {
      const user = userEvent.setup();
      renderPage();

      // Step 0: 25%
      let progressBar = document.querySelector(".bg-accent.h-2")!;
      expect(progressBar.getAttribute("style")).toContain("25%");

      // Go to step 1: 50%
      await user.click(screen.getByRole("button", { name: /common:skip/i }));
      progressBar = document.querySelector(".bg-accent.h-2")!;
      expect(progressBar.getAttribute("style")).toContain("50%");

      // Go to step 2: 75%
      await user.click(screen.getByRole("button", { name: /common:skip/i }));
      progressBar = document.querySelector(".bg-accent.h-2")!;
      expect(progressBar.getAttribute("style")).toContain("75%");

      // Go to step 3: 100%
      await user.click(screen.getByRole("button", { name: /common:skip/i }));
      progressBar = document.querySelector(".bg-accent.h-2")!;
      expect(progressBar.getAttribute("style")).toContain("100%");
    });
  });

  // =========================================================================
  // Navigation between steps
  // =========================================================================
  describe("Step navigation", () => {
    it("advances through all 4 steps via skip", async () => {
      const user = userEvent.setup();
      renderPage();

      // Step 0
      expect(screen.getByText("profile:onboarding_city")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /common:skip/i }));

      // Step 1
      expect(screen.getByText("profile:onboarding_formats")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /common:skip/i }));

      // Step 2
      expect(screen.getByText("profile:onboarding_availability")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /common:skip/i }));

      // Step 3
      expect(screen.getByText("profile:onboarding_subscribe")).toBeInTheDocument();
    });

    it("step titles change correctly through next buttons", async () => {
      const user = userEvent.setup();
      renderPage();

      // Step 0 → 1 via next
      await user.click(screen.getByRole("button", { name: /common:next/i }));
      expect(screen.getByText("profile:onboarding_formats")).toBeInTheDocument();

      // Step 1 → 2 via next
      await user.click(screen.getByRole("button", { name: /common:next/i }));
      expect(screen.getByText("profile:onboarding_availability")).toBeInTheDocument();
    });

    it("does not have a back button", () => {
      renderPage();
      expect(screen.queryByRole("button", { name: /back/i })).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Redirect if profile already exists
  // =========================================================================
  describe("Redirect for existing profile", () => {
    it("redirects to home if user already has a profile", () => {
      mockExistingProfile = {
        id: "user-1",
        display_name: "Alice",
        city: "Tel Aviv",
        formats: ["pauper"],
      };
      renderPage();

      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    });

    it("does not redirect if no existing profile", () => {
      mockExistingProfile = null;
      renderPage();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Error handling
  // =========================================================================
  describe("Error handling", () => {
    it("shows error toast when upsertProfile fails on step 1", async () => {
      const user = userEvent.setup();
      mockUpsertProfile.mockRejectedValueOnce(new Error("fail"));
      renderPage();

      // Skip to step 1
      await user.click(screen.getByRole("button", { name: /common:skip/i }));

      // Select a format
      await user.click(screen.getByText("events:pauper"));

      // Try to advance
      await user.click(screen.getByRole("button", { name: /common:next/i }));

      await vi.waitFor(() => {
        expect(mockToastFn).toHaveBeenCalledWith(
          expect.objectContaining({ variant: "destructive" }),
        );
      });

      // Should stay on step 1 (not advance)
      expect(screen.getByText("profile:onboarding_formats")).toBeInTheDocument();
    });

    it("shows error toast when updateAvailability fails on step 2", async () => {
      const user = userEvent.setup();
      mockUpdateAvailability.mockRejectedValueOnce(new Error("fail"));
      renderPage();

      // Skip to step 2
      await user.click(screen.getByRole("button", { name: /common:skip/i }));
      await user.click(screen.getByRole("button", { name: /common:skip/i }));

      // Try to advance step 2
      await user.click(screen.getByRole("button", { name: /common:next/i }));

      await vi.waitFor(() => {
        expect(mockToastFn).toHaveBeenCalledWith(
          expect.objectContaining({ variant: "destructive" }),
        );
      });

      // Should stay on step 2
      expect(screen.getByText("profile:onboarding_availability")).toBeInTheDocument();
    });

    it("does not advance step on save failure", async () => {
      const user = userEvent.setup();
      mockUpsertProfile.mockRejectedValueOnce(new Error("network error"));
      renderPage();

      // Skip step 0
      await user.click(screen.getByRole("button", { name: /common:skip/i }));

      // Select format to trigger save on next
      await user.click(screen.getByText("events:commander"));
      await user.click(screen.getByRole("button", { name: /common:next/i }));

      await vi.waitFor(() => {
        expect(mockToastFn).toHaveBeenCalled();
      });

      // Should remain on step 1
      expect(screen.getByText("profile:onboarding_formats")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Busy/loading state
  // =========================================================================
  describe("Busy state", () => {
    it("disables next button while saving", async () => {
      const user = userEvent.setup();
      // Make upsertProfile hang
      mockUpsertProfile.mockImplementation(
        () => new Promise(() => {}), // never resolves
      );
      renderPage();

      // Skip to step 1
      await user.click(screen.getByRole("button", { name: /common:skip/i }));

      // Select a format and click next
      await user.click(screen.getByText("events:pauper"));
      await user.click(screen.getByRole("button", { name: /common:next/i }));

      // Button should show loading text and be disabled
      await vi.waitFor(() => {
        const nextBtn = screen.getByRole("button", { name: /common:loading/i });
        expect(nextBtn).toBeDisabled();
      });
    });
  });
});
