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
import { BigEventForm } from "../BigEventForm";

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
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: "template-1" }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
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
    useQuery: (opts: any) => {
      // Return venues for venue query, empty for mood tags
      if (opts?.queryKey?.[0] === "mood-tags") {
        return {
          data: [
            { slug: "casual", label_en: "Casual", label_ru: null, label_he: null, is_active: true, id: 1 },
            { slug: "competitive", label_en: "Competitive", label_ru: null, label_he: null, is_active: true, id: 2 },
          ],
          isLoading: false,
        };
      }
      return { data: mockVenues, isLoading: false };
    },
  };
});

// Mock useFormAutosave
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
      <BigEventForm {...props} />
    </MemoryRouter>,
  );
}

function submitForm() {
  const form = document.querySelector("form")!;
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

// ---- Tests ----

describe("BigEventForm — comprehensive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateEvent.mockResolvedValue({ id: "new-event-1" });
    mockSavedState = null;
    mockHasSaved = false;
    localStorage.clear();
  });

  // == RENDERING ==

  describe("field rendering", () => {
    it("renders title input", () => {
      renderForm();
      expect(screen.getByLabelText("event_title")).toBeInTheDocument();
    });

    it("renders maxPlayers input", () => {
      renderForm();
      expect(screen.getByLabelText("max_players")).toBeInTheDocument();
    });

    it("renders fee input", () => {
      renderForm();
      expect(screen.getByLabelText("fee")).toBeInTheDocument();
    });

    it("renders description textarea", () => {
      renderForm();
      expect(screen.getByLabelText("description")).toBeInTheDocument();
    });

    it("renders submit button with correct label", () => {
      renderForm();
      expect(screen.getByRole("button", { name: "create_big_event" })).toBeInTheDocument();
    });

    it("renders format select via EventFormFields", () => {
      renderForm();
      // Format combobox should be present
      expect(screen.getAllByRole("combobox").length).toBeGreaterThanOrEqual(1);
    });

    it("renders mode toggle buttons", () => {
      renderForm();
      expect(screen.getByRole("button", { name: "In Person" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Online" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Hybrid" })).toBeInTheDocument();
    });

    it("renders date input", () => {
      renderForm();
      expect(screen.getByLabelText("Date")).toBeInTheDocument();
    });

    it("renders time preset buttons", () => {
      renderForm();
      expect(screen.getByRole("button", { name: "18:00" })).toBeInTheDocument();
    });

    it("renders minPlayers input", () => {
      renderForm();
      expect(screen.getByLabelText("min_players")).toBeInTheDocument();
    });

    it("renders mood tag buttons when mood tags are loaded", () => {
      renderForm();
      expect(screen.getByText("Casual")).toBeInTheDocument();
      expect(screen.getByText("Competitive")).toBeInTheDocument();
    });

    it("renders proxy policy select", () => {
      renderForm();
      expect(screen.getByText("Proxy Policy")).toBeInTheDocument();
    });

    it("renders recurrence checkbox", () => {
      renderForm();
      expect(screen.getByText("Make recurring")).toBeInTheDocument();
    });
  });

  // == FIELD INPUT ==

  describe("field input behavior", () => {
    it("title accepts text input", async () => {
      const user = userEvent.setup();
      renderForm();

      const titleInput = screen.getByLabelText("event_title");
      await user.type(titleInput, "Friday Night Magic");

      expect(titleInput).toHaveValue("Friday Night Magic");
    });

    it("title has required attribute", () => {
      renderForm();
      expect(screen.getByLabelText("event_title")).toBeRequired();
    });

    it("maxPlayers accepts number input", async () => {
      const user = userEvent.setup();
      renderForm();

      const input = screen.getByLabelText("max_players");
      await user.clear(input);
      await user.type(input, "32");

      expect(input).toHaveValue(32);
    });

    it("maxPlayers has min=2", () => {
      renderForm();
      expect(screen.getByLabelText("max_players")).toHaveAttribute("min", "2");
    });

    it("feeText accepts text input", async () => {
      const user = userEvent.setup();
      renderForm();

      const input = screen.getByLabelText("fee");
      await user.type(input, "20 NIS");

      expect(input).toHaveValue("20 NIS");
    });

    it("description accepts text input", async () => {
      const user = userEvent.setup();
      renderForm();

      const textarea = screen.getByLabelText("description");
      await user.type(textarea, "Fun event for all");

      expect(textarea).toHaveValue("Fun event for all");
    });

    it("description has 3 rows", () => {
      renderForm();
      const textarea = screen.getByLabelText("description");
      expect(textarea).toHaveAttribute("rows", "3");
    });
  });

  // == MOOD TAG SELECTOR ==

  describe("mood tag selector", () => {
    it("toggles mood tags on click", async () => {
      const user = userEvent.setup();
      renderForm();

      const casualBtn = screen.getByText("Casual");
      await user.click(casualBtn);

      // Button should now have aria-pressed=true
      expect(casualBtn).toHaveAttribute("aria-pressed", "true");
    });

    it("can select multiple mood tags", async () => {
      const user = userEvent.setup();
      renderForm();

      await user.click(screen.getByText("Casual"));
      await user.click(screen.getByText("Competitive"));

      expect(screen.getByText("Casual")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("Competitive")).toHaveAttribute("aria-pressed", "true");
    });

    it("deselects a mood tag on second click", async () => {
      const user = userEvent.setup();
      renderForm();

      const btn = screen.getByText("Casual");
      await user.click(btn);
      expect(btn).toHaveAttribute("aria-pressed", "true");

      await user.click(btn);
      expect(btn).toHaveAttribute("aria-pressed", "false");
    });
  });

  // == RECURRENCE PICKER ==

  describe("recurrence picker", () => {
    it("recurrence is initially disabled (no day buttons shown)", () => {
      renderForm();
      expect(screen.queryByText("Repeat on")).not.toBeInTheDocument();
    });

    it("shows day buttons and until date after enabling recurrence", async () => {
      const user = userEvent.setup();
      renderForm();

      const checkbox = screen.getByRole("checkbox");
      await user.click(checkbox);

      expect(screen.getByText("Repeat on")).toBeInTheDocument();
      expect(screen.getByLabelText("Repeat until (optional)")).toBeInTheDocument();
    });

    it("hides day buttons after disabling recurrence", async () => {
      const user = userEvent.setup();
      renderForm();

      const checkbox = screen.getByRole("checkbox");
      await user.click(checkbox);
      expect(screen.getByText("Repeat on")).toBeInTheDocument();

      await user.click(checkbox);
      expect(screen.queryByText("Repeat on")).not.toBeInTheDocument();
    });
  });

  // == DEFAULT VALUES ==

  describe("defaultValues", () => {
    it("initializes title from defaultValues", () => {
      renderForm({ defaultValues: { title: "Preloaded Title" } });
      expect(screen.getByLabelText("event_title")).toHaveValue("Preloaded Title");
    });

    it("initializes format from defaultValues", () => {
      renderForm({ defaultValues: { format: "commander" } });
      // The select trigger should show "commander"
      const trigger = screen.getAllByRole("combobox")[0];
      expect(trigger.textContent).toContain("commander");
    });

    it("initializes min_players from defaultValues", () => {
      renderForm({ defaultValues: { min_players: 8 } });
      expect(screen.getByLabelText("min_players")).toHaveValue(8);
    });

    it("initializes max_players from defaultValues", () => {
      renderForm({ defaultValues: { max_players: 32 } });
      expect(screen.getByLabelText("max_players")).toHaveValue(32);
    });

    it("initializes fee_text from defaultValues", () => {
      renderForm({ defaultValues: { fee_text: "Free" } });
      expect(screen.getByLabelText("fee")).toHaveValue("Free");
    });

    it("initializes description from defaultValues", () => {
      renderForm({ defaultValues: { description: "A great event" } });
      expect(screen.getByLabelText("description")).toHaveValue("A great event");
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

      // Switch to hybrid mode
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

      // Switch to online mode
      await user.click(screen.getByRole("button", { name: "Online" }));

      submitForm();

      await waitFor(() => {
        // Should NOT show venue_required, but should show platform required instead
        const venueCalls = mockToast.mock.calls.filter(
          (c: any[]) => c[0]?.title === "Venue is required",
        );
        expect(venueCalls.length).toBe(0);
      });
    });

    it("shows platform required toast when mode=online and no platform selected", async () => {
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

    it("shows max_less_than_min toast when maxPlayers < minPlayers", async () => {
      const user = userEvent.setup();
      renderForm({ defaultValues: { venue_id: "venue-1", city: "Tel Aviv" } });

      // Set date and time to pass date validation
      const dateInput = screen.getByLabelText("Date");
      await user.type(dateInput, "2027-06-15");
      await user.click(screen.getByRole("button", { name: "18:00" }));

      // Set max < min
      const maxInput = screen.getByLabelText("max_players");
      await user.clear(maxInput);
      await user.type(maxInput, "1");

      submitForm();

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringContaining("min players"),
            variant: "destructive",
          }),
        );
      });
    });
  });

  // == MODE-DEPENDENT VALIDATION ==

  describe("mode-dependent fields in online/hybrid", () => {
    it("shows join_link_required when platform=spelltable and joinLink is empty", async () => {
      const user = userEvent.setup();
      renderForm();

      // Switch to online
      await user.click(screen.getByRole("button", { name: "Online" }));

      // Select spelltable platform
      const platformTrigger = screen.getByRole("combobox", { name: /online_platform/i });
      await user.click(platformTrigger);
      await user.click(screen.getByRole("option", { name: "Spelltable" }));

      // Set date/time to pass other validations
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

      // Clear the auto-filled username
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
    it("calls createEvent with correct payload for in_person mode", async () => {
      const user = userEvent.setup();
      renderForm({
        defaultValues: {
          title: "Test Event",
          venue_id: "venue-1",
          city: "Tel Aviv",
        },
      });

      const dateInput = screen.getByLabelText("Date");
      await user.type(dateInput, "2027-06-15");
      await user.click(screen.getByRole("button", { name: "18:00" }));

      submitForm();

      await waitFor(() => {
        expect(mockCreateEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            organizer_id: "user-1",
            type: "big",
            title: "Test Event",
            format: "pauper",
            city: "Tel Aviv",
            venue_id: "venue-1",
            mode: "in_person",
            min_players: 4,
            max_players: 16,
            online_platform: null,
            join_link: null,
            platform_username: null,
            contact_link: null,
          }),
        );
      });
    });

    it("calls createEvent with mode=online and sets city=Online, venue_id=null", async () => {
      const user = userEvent.setup();
      renderForm({
        defaultValues: { title: "Online Tournament" },
      });

      // Switch to online
      await user.click(screen.getByRole("button", { name: "Online" }));

      // Select platform and fill link
      const platformTrigger = screen.getByRole("combobox", { name: /online_platform/i });
      await user.click(platformTrigger);
      await user.click(screen.getByRole("option", { name: "Spelltable" }));

      const joinLinkInput = screen.getByLabelText("join_link *");
      await user.type(joinLinkInput, "https://spelltable.wizards.com/game/abc");

      const dateInput = screen.getByLabelText("Date");
      await user.type(dateInput, "2027-06-15");
      await user.click(screen.getByRole("button", { name: "18:00" }));

      submitForm();

      await waitFor(() => {
        expect(mockCreateEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: "online",
            city: "Online",
            venue_id: null,
            online_platform: "spelltable",
            join_link: "https://spelltable.wizards.com/game/abc",
          }),
        );
      });
    });

    it("navigates to / after successful creation", async () => {
      const user = userEvent.setup();
      renderForm({
        defaultValues: {
          title: "Test",
          venue_id: "venue-1",
          city: "Tel Aviv",
        },
      });

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
        defaultValues: {
          title: "Test",
          venue_id: "venue-1",
          city: "Tel Aviv",
        },
        onCreated,
      });

      await user.type(screen.getByLabelText("Date"), "2027-06-15");
      await user.click(screen.getByRole("button", { name: "18:00" }));

      submitForm();

      await waitFor(() => {
        expect(onCreated).toHaveBeenCalledWith("new-event-1");
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    it("clears autosave draft on successful submit", async () => {
      const user = userEvent.setup();
      renderForm({
        defaultValues: {
          title: "Test",
          venue_id: "venue-1",
          city: "Tel Aviv",
        },
      });

      await user.type(screen.getByLabelText("Date"), "2027-06-15");
      await user.click(screen.getByRole("button", { name: "18:00" }));

      submitForm();

      await waitFor(() => {
        expect(mockClearSaved).toHaveBeenCalled();
      });
    });

    it("shows success toast on creation", async () => {
      const user = userEvent.setup();
      renderForm({
        defaultValues: {
          title: "Test",
          venue_id: "venue-1",
          city: "Tel Aviv",
        },
      });

      await user.type(screen.getByLabelText("Date"), "2027-06-15");
      await user.click(screen.getByRole("button", { name: "18:00" }));

      submitForm();

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ title: "event_created" }),
        );
      });
    });

    it("includes mood_tags and proxy_policy in payload", async () => {
      const user = userEvent.setup();
      renderForm({
        defaultValues: {
          title: "Test",
          venue_id: "venue-1",
          city: "Tel Aviv",
        },
      });

      // Select a mood tag
      await user.click(screen.getByText("Casual"));

      await user.type(screen.getByLabelText("Date"), "2027-06-15");
      await user.click(screen.getByRole("button", { name: "18:00" }));

      submitForm();

      await waitFor(() => {
        expect(mockCreateEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            mood_tags: ["casual"],
            proxy_policy: "none",
          }),
        );
      });
    });

    it("includes fee_text and description in payload when provided", async () => {
      const user = userEvent.setup();
      renderForm({
        defaultValues: {
          title: "Test",
          venue_id: "venue-1",
          city: "Tel Aviv",
        },
      });

      await user.type(screen.getByLabelText("fee"), "Free entry");
      await user.type(screen.getByLabelText("description"), "Welcome!");

      await user.type(screen.getByLabelText("Date"), "2027-06-15");
      await user.click(screen.getByRole("button", { name: "18:00" }));

      submitForm();

      await waitFor(() => {
        expect(mockCreateEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            fee_text: "Free entry",
            description: "Welcome!",
          }),
        );
      });
    });

    it("sends null for fee_text and description when empty", async () => {
      const user = userEvent.setup();
      renderForm({
        defaultValues: {
          title: "Test",
          venue_id: "venue-1",
          city: "Tel Aviv",
        },
      });

      await user.type(screen.getByLabelText("Date"), "2027-06-15");
      await user.click(screen.getByRole("button", { name: "18:00" }));

      submitForm();

      await waitFor(() => {
        expect(mockCreateEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            fee_text: null,
            description: null,
          }),
        );
      });
    });

    it("includes clonedFrom in payload when provided", async () => {
      const user = userEvent.setup();
      renderForm({
        defaultValues: {
          title: "Cloned Event",
          venue_id: "venue-1",
          city: "Tel Aviv",
        },
        clonedFrom: "original-event-id",
      });

      await user.type(screen.getByLabelText("Date"), "2027-06-15");
      await user.click(screen.getByRole("button", { name: "18:00" }));

      submitForm();

      await waitFor(() => {
        expect(mockCreateEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            cloned_from: "original-event-id",
          }),
        );
      });
    });
  });

  // == ERROR HANDLING ==

  describe("error handling", () => {
    it("shows error toast when createEvent throws", async () => {
      mockCreateEvent.mockRejectedValueOnce(new Error("Network error"));

      const user = userEvent.setup();
      renderForm({
        defaultValues: {
          title: "Test",
          venue_id: "venue-1",
          city: "Tel Aviv",
        },
      });

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
      renderForm({
        defaultValues: {
          title: "Test",
          venue_id: "venue-1",
          city: "Tel Aviv",
        },
      });

      await user.type(screen.getByLabelText("Date"), "2027-06-15");
      await user.click(screen.getByRole("button", { name: "18:00" }));

      submitForm();

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalled();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  // == AUTOSAVE / DRAFT RESTORE ==

  describe("autosave / draft restore", () => {
    it("restores form state from saved draft and shows toast", () => {
      mockHasSaved = true;
      mockSavedState = {
        title: "Saved Draft Title",
        format: "commander",
        startsAt: "2027-09-01T14:00",
        venueId: "venue-2",
        city: "Rishon LeZion",
        minPlayers: 6,
        maxPlayers: 24,
        feeText: "10 NIS",
        description: "Draft description",
        moodTags: ["casual"],
        proxyPolicy: "partial",
        recurrence: null,
        mode: "in_person",
        onlinePlatform: null,
        joinLink: "",
        platformUsername: "",
        contactLink: "",
      };

      renderForm();

      expect(screen.getByLabelText("event_title")).toHaveValue("Saved Draft Title");
      expect(screen.getByLabelText("max_players")).toHaveValue(24);
      expect(screen.getByLabelText("fee")).toHaveValue("10 NIS");
      expect(screen.getByLabelText("description")).toHaveValue("Draft description");
      expect(screen.getByLabelText("min_players")).toHaveValue(6);
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Draft restored" }),
      );
    });

    it("does NOT restore draft when defaultValues are provided", () => {
      mockHasSaved = true;
      mockSavedState = {
        title: "Should Not Appear",
        format: "draft",
        startsAt: "",
        venueId: "",
        city: "",
        minPlayers: 99,
        maxPlayers: 99,
        feeText: "",
        description: "",
        moodTags: [],
        proxyPolicy: "none",
        recurrence: null,
        mode: "in_person",
        onlinePlatform: null,
        joinLink: "",
        platformUsername: "",
        contactLink: "",
      };

      renderForm({ defaultValues: { title: "From Props" } });

      expect(screen.getByLabelText("event_title")).toHaveValue("From Props");
    });
  });

  // == SUBMIT DISABLED ==

  describe("submit button disabled state", () => {
    it("submit button is not disabled when isCreating=false", () => {
      renderForm();
      expect(screen.getByRole("button", { name: "create_big_event" })).not.toBeDisabled();
    });
  });
});
