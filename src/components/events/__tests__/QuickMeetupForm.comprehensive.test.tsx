/* eslint-disable @typescript-eslint/no-explicit-any */

// Polyfill for Radix UI in jsdom
beforeAll(() => {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture || (() => false);
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || (() => {});
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture || (() => {});
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
  window.ResizeObserver = window.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
});

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QuickMeetupForm } from "../QuickMeetupForm";

// ---- Mocks ----

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
  useToast: () => ({ toast: (...args: unknown[]) => mockToast(...args) }),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockCreateEvent = vi.fn();
vi.mock("@/hooks/useEvents", () => ({
  useEvents: () => ({
    createEvent: mockCreateEvent,
    isCreating: false,
  }),
}));

const mockProfile = {
  id: "user-1",
  display_name: "Test User",
  city: "Tel Aviv",
  whatsapp: "https://wa.me/1234567890",
  arena_username: "TestPlayer#12345",
  formats: ["pauper"],
  role: "player",
  reliability_score: 100,
  interested_in_trading: false,
  created_at: "2024-01-01T00:00:00Z",
  avatar_url: null,
  bio: null,
  car_access: null,
  game_speed: null,
  playstyle: null,
  social_level: null,
};

vi.mock("@/store/authStore", () => ({
  useAuthStore: (selector: (state: any) => any) =>
    selector({
      user: { id: "user-1", email: "test@test.com" },
      profile: mockProfile,
    }),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
        order: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  },
}));

vi.mock("@/components/events/AvailablePlayersHint", () => ({
  AvailablePlayersHint: () => null,
}));

const mockVenues = [
  { id: "venue-1", name: "Game Store A", city: "Tel Aviv" },
  { id: "venue-2", name: "Game Store B", city: "Rishon LeZion" },
];

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useQuery: () => ({ data: mockVenues, isLoading: false }),
  };
});

let mockSavedState: any = null;
let mockHasSaved = false;
const mockClearSaved = vi.fn();

vi.mock("@/hooks/useFormAutosave", () => ({
  useFormAutosave: () => ({
    savedState: mockSavedState,
    clearSaved: mockClearSaved,
    hasSaved: mockHasSaved,
  }),
}));

// ---- Helpers ----

function renderForm(props: any = {}) {
  return render(
    <MemoryRouter>
      <QuickMeetupForm {...props} />
    </MemoryRouter>,
  );
}

function submitForm() {
  const form = document.querySelector("form")!;
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

// ---- Tests ----

describe("QuickMeetupForm — comprehensive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateEvent.mockResolvedValue({ id: "new-quick-1" });
    mockSavedState = null;
    mockHasSaved = false;
    localStorage.clear();
  });

  // == RENDERING ==

  describe("field rendering", () => {
    it("renders submit button with correct label", () => {
      renderForm();
      expect(screen.getByRole("button", { name: "create_quick_meetup" })).toBeInTheDocument();
    });

    it("renders mode toggle buttons", () => {
      renderForm();
      expect(screen.getByRole("button", { name: "In Person" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Online" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Hybrid" })).toBeInTheDocument();
    });

    it("renders format select", () => {
      renderForm();
      expect(screen.getAllByRole("combobox").length).toBeGreaterThanOrEqual(1);
    });

    it("renders date input", () => {
      renderForm();
      expect(screen.getByLabelText("Date")).toBeInTheDocument();
    });

    it("renders time preset buttons", () => {
      renderForm();
      const presets = ["10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"];
      for (const p of presets) {
        expect(screen.getByRole("button", { name: p })).toBeInTheDocument();
      }
    });

    it("renders minPlayers input", () => {
      renderForm();
      expect(screen.getByLabelText("min_players")).toBeInTheDocument();
    });

    it("renders proxy policy select", () => {
      renderForm();
      expect(screen.getByText("Proxy Policy")).toBeInTheDocument();
    });

    it("does NOT render title input (not in QuickMeetupForm)", () => {
      renderForm();
      expect(screen.queryByLabelText("event_title")).not.toBeInTheDocument();
    });

    it("does NOT render maxPlayers input", () => {
      renderForm();
      expect(screen.queryByLabelText("max_players")).not.toBeInTheDocument();
    });

    it("does NOT render fee input", () => {
      renderForm();
      expect(screen.queryByLabelText("fee")).not.toBeInTheDocument();
    });

    it("does NOT render description textarea", () => {
      renderForm();
      expect(screen.queryByLabelText("description")).not.toBeInTheDocument();
    });

    it("does NOT render recurrence picker", () => {
      renderForm();
      expect(screen.queryByText("Make recurring")).not.toBeInTheDocument();
    });

    it("does NOT render mood tag selector", () => {
      renderForm();
      // MoodTagSelector is not used in QuickMeetupForm
      expect(screen.queryByText("Mood")).not.toBeInTheDocument();
    });
  });

  // == VENUE FIELD CONDITIONAL ==

  describe("venue field conditional on mode", () => {
    it("shows venue select in in_person mode", () => {
      renderForm();
      expect(screen.getByText("venue *")).toBeInTheDocument();
    });

    it("shows venue select in hybrid mode", async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole("button", { name: "Hybrid" }));
      expect(screen.getByText("venue *")).toBeInTheDocument();
    });

    it("does NOT show venue select in online mode", async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole("button", { name: "Online" }));
      expect(screen.queryByText("venue *")).not.toBeInTheDocument();
    });
  });

  // == ONLINE PLATFORM CONDITIONAL ==

  describe("online platform fields", () => {
    it("shows platform select in online mode", async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole("button", { name: "Online" }));
      expect(screen.getByText("online_platform")).toBeInTheDocument();
    });

    it("shows platform select in hybrid mode", async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole("button", { name: "Hybrid" }));
      expect(screen.getByText("online_platform")).toBeInTheDocument();
    });

    it("does NOT show platform select in in_person mode", () => {
      renderForm();
      expect(screen.queryByText("online_platform")).not.toBeInTheDocument();
    });

    it("shows join_link field when spelltable is selected", async () => {
      const user = userEvent.setup();
      renderForm();

      await user.click(screen.getByRole("button", { name: "Online" }));

      const platformTrigger = screen.getByRole("combobox", { name: /online_platform/i });
      await user.click(platformTrigger);
      await user.click(screen.getByRole("option", { name: "Spelltable" }));

      expect(screen.getByLabelText("join_link *")).toBeInTheDocument();
    });

    it("shows platform_username field when mtga is selected", async () => {
      const user = userEvent.setup();
      renderForm();

      await user.click(screen.getByRole("button", { name: "Online" }));

      const platformTrigger = screen.getByRole("combobox", { name: /online_platform/i });
      await user.click(platformTrigger);
      await user.click(screen.getByRole("option", { name: "MTG Arena" }));

      expect(screen.getByLabelText("platform_username *")).toBeInTheDocument();
    });
  });

  // == DEFAULT VALUES ==

  describe("defaultValues", () => {
    it("initializes format from defaultValues", () => {
      renderForm({ defaultValues: { format: "commander" } });
      const trigger = screen.getAllByRole("combobox")[0];
      expect(trigger.textContent).toContain("commander");
    });

    it("initializes min_players from defaultValues", () => {
      renderForm({ defaultValues: { min_players: 4 } });
      expect(screen.getByLabelText("min_players")).toHaveValue(4);
    });

    it("defaults minPlayers to 2 when no defaultValues", () => {
      renderForm();
      expect(screen.getByLabelText("min_players")).toHaveValue(2);
    });

    it("defaults format to pauper when no defaultValues", () => {
      renderForm();
      const trigger = screen.getAllByRole("combobox")[0];
      expect(trigger.textContent).toContain("pauper");
    });
  });

  // == VALIDATION ==

  describe("validation", () => {
    it("shows venue_required toast when mode=in_person and no venue", async () => {
      renderForm();
      submitForm();

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Venue is required",
            variant: "destructive",
          }),
        );
      });
    });

    it("shows venue_required toast when mode=hybrid and no venue", async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole("button", { name: "Hybrid" }));

      submitForm();

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Venue is required",
            variant: "destructive",
          }),
        );
      });
    });

    it("does NOT require venue when mode=online", async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole("button", { name: "Online" }));

      submitForm();

      await waitFor(() => {
        const venueCalls = mockToast.mock.calls.filter(
          (c: any[]) => c[0]?.title === "Venue is required",
        );
        expect(venueCalls.length).toBe(0);
      });
    });

    it("shows platform required toast when mode=online and no platform", async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole("button", { name: "Online" }));

      submitForm();

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Platform is required",
            variant: "destructive",
          }),
        );
      });
    });

    it("shows date_required toast when date is empty", async () => {
      renderForm({ defaultValues: { venue_id: "venue-1", city: "Tel Aviv" } });
      submitForm();

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Date is required",
            variant: "destructive",
          }),
        );
      });
    });

    it("shows join_link_required when platform=spelltable and link is empty", async () => {
      const user = userEvent.setup();
      renderForm();

      await user.click(screen.getByRole("button", { name: "Online" }));

      const platformTrigger = screen.getByRole("combobox", { name: /online_platform/i });
      await user.click(platformTrigger);
      await user.click(screen.getByRole("option", { name: "Spelltable" }));

      // Set date/time to get past date validation
      const dateInput = screen.getByLabelText("Date");
      await user.type(dateInput, "2027-06-15");
      await user.click(screen.getByRole("button", { name: "18:00" }));

      submitForm();

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Join link is required",
            variant: "destructive",
          }),
        );
      });
    });

    it("shows platform_username_required when platform=mtga and username is empty", async () => {
      const user = userEvent.setup();
      renderForm();

      await user.click(screen.getByRole("button", { name: "Online" }));

      const platformTrigger = screen.getByRole("combobox", { name: /online_platform/i });
      await user.click(platformTrigger);
      await user.click(screen.getByRole("option", { name: "MTG Arena" }));

      // Clear auto-filled username
      const usernameInput = screen.getByLabelText("platform_username *");
      await user.clear(usernameInput);

      const dateInput = screen.getByLabelText("Date");
      await user.type(dateInput, "2027-06-15");
      await user.click(screen.getByRole("button", { name: "18:00" }));

      submitForm();

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Username is required",
            variant: "destructive",
          }),
        );
      });
    });
  });

  // == SUCCESSFUL SUBMIT ==

  describe("successful submit", () => {
    it("calls createEvent with type=quick and correct payload", async () => {
      const user = userEvent.setup();
      renderForm({ defaultValues: { venue_id: "venue-1", city: "Tel Aviv" } });

      const dateInput = screen.getByLabelText("Date");
      await user.type(dateInput, "2027-06-15");
      await user.click(screen.getByRole("button", { name: "18:00" }));

      submitForm();

      await waitFor(() => {
        expect(mockCreateEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            organizer_id: "user-1",
            type: "quick",
            format: "pauper",
            city: "Tel Aviv",
            venue_id: "venue-1",
            min_players: 2,
            mode: "in_person",
            proxy_policy: "none",
            online_platform: null,
            join_link: null,
            platform_username: null,
            contact_link: null,
          }),
        );
      });
    });

    it("sets expires_at to starts_at + 24 hours", async () => {
      const user = userEvent.setup();
      renderForm({ defaultValues: { venue_id: "venue-1", city: "Tel Aviv" } });

      const dateInput = screen.getByLabelText("Date");
      await user.type(dateInput, "2027-06-15");
      await user.click(screen.getByRole("button", { name: "18:00" }));

      submitForm();

      await waitFor(() => {
        expect(mockCreateEvent).toHaveBeenCalled();
      });

      const callArgs = mockCreateEvent.mock.calls[0][0];
      const startsAt = new Date(callArgs.starts_at);
      const expiresAt = new Date(callArgs.expires_at);
      const diffMs = expiresAt.getTime() - startsAt.getTime();
      const twentyFourHoursMs = 24 * 60 * 60 * 1000;
      expect(diffMs).toBe(twentyFourHoursMs);
    });

    it("navigates to / after successful creation", async () => {
      const user = userEvent.setup();
      renderForm({ defaultValues: { venue_id: "venue-1", city: "Tel Aviv" } });

      await user.type(screen.getByLabelText("Date"), "2027-06-15");
      await user.click(screen.getByRole("button", { name: "18:00" }));

      submitForm();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/");
      });
    });

    it("calls onCreated callback instead of navigate when provided", async () => {
      const user = userEvent.setup();
      const onCreated = vi.fn();
      renderForm({
        defaultValues: { venue_id: "venue-1", city: "Tel Aviv" },
        onCreated,
      });

      await user.type(screen.getByLabelText("Date"), "2027-06-15");
      await user.click(screen.getByRole("button", { name: "18:00" }));

      submitForm();

      await waitFor(() => {
        expect(onCreated).toHaveBeenCalledWith("new-quick-1");
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    it("clears autosave draft on successful submit", async () => {
      const user = userEvent.setup();
      renderForm({ defaultValues: { venue_id: "venue-1", city: "Tel Aviv" } });

      await user.type(screen.getByLabelText("Date"), "2027-06-15");
      await user.click(screen.getByRole("button", { name: "18:00" }));

      submitForm();

      await waitFor(() => {
        expect(mockClearSaved).toHaveBeenCalled();
      });
    });

    it("shows success toast on creation", async () => {
      const user = userEvent.setup();
      renderForm({ defaultValues: { venue_id: "venue-1", city: "Tel Aviv" } });

      await user.type(screen.getByLabelText("Date"), "2027-06-15");
      await user.click(screen.getByRole("button", { name: "18:00" }));

      submitForm();

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ title: "event_created" }),
        );
      });
    });

    it("sets city=Online and venue_id=null in online mode", async () => {
      const user = userEvent.setup();
      renderForm();

      await user.click(screen.getByRole("button", { name: "Online" }));

      // Select platform and fill link
      const platformTrigger = screen.getByRole("combobox", { name: /online_platform/i });
      await user.click(platformTrigger);
      await user.click(screen.getByRole("option", { name: "Spelltable" }));

      const joinLinkInput = screen.getByLabelText("join_link *");
      await user.type(joinLinkInput, "https://spelltable.wizards.com/game/xyz");

      await user.type(screen.getByLabelText("Date"), "2027-06-15");
      await user.click(screen.getByRole("button", { name: "18:00" }));

      submitForm();

      await waitFor(() => {
        expect(mockCreateEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: "online",
            city: "Online",
            venue_id: null,
            online_platform: "spelltable",
            join_link: "https://spelltable.wizards.com/game/xyz",
          }),
        );
      });
    });

    it("includes proxy_policy in payload", async () => {
      const user = userEvent.setup();
      renderForm({ defaultValues: { venue_id: "venue-1", city: "Tel Aviv" } });

      await user.type(screen.getByLabelText("Date"), "2027-06-15");
      await user.click(screen.getByRole("button", { name: "18:00" }));

      submitForm();

      await waitFor(() => {
        expect(mockCreateEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            proxy_policy: "none",
          }),
        );
      });
    });
  });

  // == ERROR HANDLING ==

  describe("error handling", () => {
    it("shows error toast when createEvent throws", async () => {
      mockCreateEvent.mockRejectedValueOnce(new Error("Server error"));

      const user = userEvent.setup();
      renderForm({ defaultValues: { venue_id: "venue-1", city: "Tel Aviv" } });

      await user.type(screen.getByLabelText("Date"), "2027-06-15");
      await user.click(screen.getByRole("button", { name: "18:00" }));

      submitForm();

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "common:error",
            variant: "destructive",
          }),
        );
      });
    });

    it("does NOT navigate on error", async () => {
      mockCreateEvent.mockRejectedValueOnce(new Error("Fail"));

      const user = userEvent.setup();
      renderForm({ defaultValues: { venue_id: "venue-1", city: "Tel Aviv" } });

      await user.type(screen.getByLabelText("Date"), "2027-06-15");
      await user.click(screen.getByRole("button", { name: "18:00" }));

      submitForm();

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalled();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("does NOT clear draft on error", async () => {
      mockCreateEvent.mockRejectedValueOnce(new Error("Fail"));

      const user = userEvent.setup();
      renderForm({ defaultValues: { venue_id: "venue-1", city: "Tel Aviv" } });

      await user.type(screen.getByLabelText("Date"), "2027-06-15");
      await user.click(screen.getByRole("button", { name: "18:00" }));

      submitForm();

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalled();
      });

      expect(mockClearSaved).not.toHaveBeenCalled();
    });
  });

  // == AUTOSAVE / DRAFT RESTORE ==

  describe("autosave / draft restore", () => {
    it("restores form state from saved draft and shows toast", () => {
      mockHasSaved = true;
      mockSavedState = {
        format: "commander",
        startsAt: "2027-09-01T14:00",
        venueId: "venue-2",
        city: "Rishon LeZion",
        minPlayers: 4,
        proxyPolicy: "full",
        mode: "in_person",
        onlinePlatform: null,
        joinLink: "",
        platformUsername: "",
        contactLink: "",
      };

      renderForm();

      expect(screen.getByLabelText("min_players")).toHaveValue(4);
      expect(screen.getByLabelText("Date")).toHaveValue("2027-09-01");
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Draft restored" }),
      );
    });

    it("does NOT restore draft when defaultValues are provided", () => {
      mockHasSaved = true;
      mockSavedState = {
        format: "draft",
        startsAt: "",
        venueId: "",
        city: "",
        minPlayers: 99,
        proxyPolicy: "none",
        mode: "in_person",
        onlinePlatform: null,
        joinLink: "",
        platformUsername: "",
        contactLink: "",
      };

      renderForm({ defaultValues: { min_players: 3 } });

      expect(screen.getByLabelText("min_players")).toHaveValue(3);
    });
  });

  // == IDPREFIX ==

  describe("idPrefix", () => {
    it("uses q_ prefix for EventFormFields ids", () => {
      renderForm();
      // QuickMeetupForm passes idPrefix="q_" to EventFormFields
      expect(document.getElementById("q_date")).toBeInTheDocument();
      expect(document.getElementById("q_min_players")).toBeInTheDocument();
    });
  });
});
