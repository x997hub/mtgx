/* eslint-disable @typescript-eslint/no-explicit-any */

// Polyfill for Radix UI in jsdom
beforeAll(() => {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture || (() => false);
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || (() => {});
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture || (() => {});
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
  // Mock ResizeObserver for Radix portals
  window.ResizeObserver = window.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
});

import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EventFormFields, type EventFormFieldsProps } from "../EventFormFields";
import type { MtgFormat, EventMode, OnlinePlatform } from "@/types/database.types";
import { FORMATS, EVENT_MODES, EVENT_MODE_LABELS, ONLINE_PLATFORMS, PLATFORM_LABELS, PLATFORM_FIELDS } from "@/lib/constants";

// ---- Mocks ----

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/events/AvailablePlayersHint", () => ({
  AvailablePlayersHint: () => <div data-testid="available-players-hint" />,
}));

const mockVenues = [
  { id: "venue-1", name: "Game Store A", city: "Tel Aviv" },
  { id: "venue-2", name: "Game Store B", city: "Rishon LeZion" },
];

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: mockVenues, error: null }),
        }),
        order: () => Promise.resolve({ data: mockVenues, error: null }),
      }),
    }),
  },
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

// ---- Helpers ----

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

type PartialProps = Partial<EventFormFieldsProps>;

function createProps(overrides: PartialProps = {}): EventFormFieldsProps {
  return {
    format: "pauper",
    onFormatChange: vi.fn(),
    venueId: "",
    onVenueIdChange: vi.fn(),
    onCityChange: vi.fn(),
    startsAt: "",
    onStartsAtChange: vi.fn(),
    minPlayers: 2,
    onMinPlayersChange: vi.fn(),
    mode: "in_person",
    onModeChange: vi.fn(),
    onlinePlatform: null,
    onOnlinePlatformChange: vi.fn(),
    joinLink: "",
    onJoinLinkChange: vi.fn(),
    platformUsername: "",
    onPlatformUsernameChange: vi.fn(),
    contactLink: "",
    onContactLinkChange: vi.fn(),
    ...overrides,
  };
}

function renderFields(overrides: PartialProps = {}) {
  const props = createProps(overrides);
  const qc = createQueryClient();
  const utils = render(
    <QueryClientProvider client={qc}>
      <EventFormFields {...props} />
    </QueryClientProvider>,
  );
  return { ...utils, props };
}

// ---- Tests ----

describe("EventFormFields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // == FORMAT SELECT ==

  describe("format select", () => {
    it("renders a format select with the current value", () => {
      renderFields({ format: "commander" });
      // Radix Select renders a hidden select with the value; look for the trigger
      const trigger = screen.getAllByRole("combobox")[0];
      expect(trigger).toBeInTheDocument();
    });

    it("displays all FORMATS options when opened", async () => {
      const user = userEvent.setup();
      renderFields();

      const trigger = screen.getAllByRole("combobox")[0];
      await user.click(trigger);

      for (const f of FORMATS) {
        expect(screen.getByRole("option", { name: f })).toBeInTheDocument();
      }
    });

    it("calls onFormatChange when a format is selected", async () => {
      const user = userEvent.setup();
      const { props } = renderFields({ format: "pauper" });

      const trigger = screen.getAllByRole("combobox")[0];
      await user.click(trigger);
      await user.click(screen.getByRole("option", { name: "commander" }));

      expect(props.onFormatChange).toHaveBeenCalledWith("commander");
    });
  });

  // == MODE TOGGLE BUTTONS ==

  describe("mode toggle buttons", () => {
    it("renders 3 mode buttons: in_person, online, hybrid", () => {
      renderFields();

      for (const m of EVENT_MODES) {
        expect(
          screen.getByRole("button", { name: EVENT_MODE_LABELS[m] }),
        ).toBeInTheDocument();
      }
    });

    it("highlights the currently selected mode with bg-accent", () => {
      renderFields({ mode: "online" });

      const onlineBtn = screen.getByRole("button", { name: EVENT_MODE_LABELS.online });
      expect(onlineBtn.className).toContain("bg-accent");

      const inPersonBtn = screen.getByRole("button", { name: EVENT_MODE_LABELS.in_person });
      expect(inPersonBtn.className).not.toContain("bg-accent");
    });

    it("calls onModeChange when a mode button is clicked", async () => {
      const user = userEvent.setup();
      const { props } = renderFields({ mode: "in_person" });

      await user.click(screen.getByRole("button", { name: EVENT_MODE_LABELS.hybrid }));

      expect(props.onModeChange).toHaveBeenCalledWith("hybrid");
    });
  });

  // == VENUE FIELD (conditional on mode) ==

  describe("venue field", () => {
    it("shows venue select when mode is in_person", () => {
      renderFields({ mode: "in_person" });
      expect(screen.getByText("venue *")).toBeInTheDocument();
    });

    it("shows venue select when mode is hybrid", () => {
      renderFields({ mode: "hybrid" });
      expect(screen.getByText("venue *")).toBeInTheDocument();
    });

    it("does NOT show venue select when mode is online", () => {
      renderFields({ mode: "online" });
      expect(screen.queryByText("venue *")).not.toBeInTheDocument();
    });

    it("shows venue_required message when no venue is selected", () => {
      renderFields({ mode: "in_person", venueId: "" });
      expect(screen.getByText("Venue is required")).toBeInTheDocument();
    });

    it("does NOT show venue_required when a venue is selected", () => {
      renderFields({ mode: "in_person", venueId: "venue-1" });
      expect(screen.queryByText("Venue is required")).not.toBeInTheDocument();
    });

    it("calls onVenueIdChange when a venue is selected", async () => {
      const user = userEvent.setup();
      const { props } = renderFields({ mode: "in_person" });

      // Find the venue select trigger (second combobox after format)
      const comboboxes = screen.getAllByRole("combobox");
      // venue select is the second combobox (first = format)
      const venueCombobox = comboboxes[1];
      await user.click(venueCombobox);

      // Look for venue option
      const option = screen.getByRole("option", { name: /Game Store A/ });
      await user.click(option);

      expect(props.onVenueIdChange).toHaveBeenCalledWith("venue-1");
    });

    it("calls onCityChange when venue changes (city auto-fill)", async () => {
      // We render with a venueId that matches a mock venue
      const { props } = renderFields({ mode: "in_person", venueId: "venue-1" });

      // The useEffect fires asynchronously after the venues are resolved
      await waitFor(() => {
        expect(props.onCityChange).toHaveBeenCalledWith("Tel Aviv");
      });
    });

    it("calls onCityChange with empty string when venueId is cleared", async () => {
      const { props } = renderFields({ mode: "in_person", venueId: "" });

      await waitFor(() => {
        expect(props.onCityChange).toHaveBeenCalledWith("");
      });
    });
  });

  // == ONLINE PLATFORM FIELDS (conditional on mode) ==

  describe("online platform field", () => {
    it("shows platform select when mode is online", () => {
      renderFields({ mode: "online" });
      expect(screen.getByText("online_platform")).toBeInTheDocument();
    });

    it("shows platform select when mode is hybrid", () => {
      renderFields({ mode: "hybrid" });
      expect(screen.getByText("online_platform")).toBeInTheDocument();
    });

    it("does NOT show platform select when mode is in_person", () => {
      renderFields({ mode: "in_person" });
      expect(screen.queryByText("online_platform")).not.toBeInTheDocument();
    });

    it("renders all ONLINE_PLATFORMS when opened", async () => {
      const user = userEvent.setup();
      renderFields({ mode: "online" });

      // Find the platform select trigger
      const platformTrigger = screen.getByRole("combobox", { name: /online_platform/i });
      await user.click(platformTrigger);

      for (const p of ONLINE_PLATFORMS) {
        expect(screen.getByRole("option", { name: PLATFORM_LABELS[p] })).toBeInTheDocument();
      }
    });
  });

  // == PLATFORM-SPECIFIC FIELDS ==

  describe("platform-specific fields", () => {
    const platformsWithJoinLink: OnlinePlatform[] = ["spelltable", "mtgo", "discord", "zoom", "other"];
    const platformsWithUsername: OnlinePlatform[] = ["mtga"];
    const platformsWithContactLink: OnlinePlatform[] = ["mtga", "other"];

    describe.each(ONLINE_PLATFORMS)("platform: %s", (platform) => {
      const fields = PLATFORM_FIELDS[platform];

      it(`${fields.joinLink ? "shows" : "does NOT show"} joinLink field`, () => {
        renderFields({ mode: "online", onlinePlatform: platform });

        if (fields.joinLink) {
          expect(screen.getByLabelText("join_link *")).toBeInTheDocument();
        } else {
          expect(screen.queryByLabelText("join_link *")).not.toBeInTheDocument();
        }
      });

      it(`${fields.platformUsername ? "shows" : "does NOT show"} platformUsername field`, () => {
        renderFields({ mode: "online", onlinePlatform: platform });

        if (fields.platformUsername) {
          expect(screen.getByLabelText("platform_username *")).toBeInTheDocument();
        } else {
          expect(screen.queryByLabelText("platform_username *")).not.toBeInTheDocument();
        }
      });

      it(`${fields.contactLink ? "shows" : "does NOT show"} contactLink field`, () => {
        renderFields({ mode: "online", onlinePlatform: platform });

        if (fields.contactLink) {
          expect(screen.getByLabelText("contact_link")).toBeInTheDocument();
        } else {
          expect(screen.queryByLabelText("contact_link")).not.toBeInTheDocument();
        }
      });
    });

    it("joinLink platforms match expected set", () => {
      const actual = ONLINE_PLATFORMS.filter((p) => PLATFORM_FIELDS[p].joinLink);
      expect(actual).toEqual(platformsWithJoinLink);
    });

    it("platformUsername platforms match expected set", () => {
      const actual = ONLINE_PLATFORMS.filter((p) => PLATFORM_FIELDS[p].platformUsername);
      expect(actual).toEqual(platformsWithUsername);
    });

    it("contactLink platforms match expected set", () => {
      const actual = ONLINE_PLATFORMS.filter((p) => PLATFORM_FIELDS[p].contactLink);
      expect(actual).toEqual(platformsWithContactLink);
    });
  });

  // == JOIN LINK INPUT ==

  describe("joinLink input", () => {
    it("renders with the provided value", () => {
      renderFields({ mode: "online", onlinePlatform: "spelltable", joinLink: "https://spelltable.com/game/123" });
      const input = screen.getByLabelText("join_link *");
      expect(input).toHaveValue("https://spelltable.com/game/123");
    });

    it("calls onJoinLinkChange on input", async () => {
      const user = userEvent.setup();
      const { props } = renderFields({ mode: "online", onlinePlatform: "spelltable" });

      const input = screen.getByLabelText("join_link *");
      await user.type(input, "https://spelltable.com/game/abc");

      expect(props.onJoinLinkChange).toHaveBeenCalled();
    });

    it("has type=url", () => {
      renderFields({ mode: "online", onlinePlatform: "spelltable" });
      const input = screen.getByLabelText("join_link *");
      expect(input).toHaveAttribute("type", "url");
    });
  });

  // == PLATFORM USERNAME INPUT ==

  describe("platformUsername input", () => {
    it("renders with the provided value", () => {
      renderFields({ mode: "online", onlinePlatform: "mtga", platformUsername: "Player#12345" });
      const input = screen.getByLabelText("platform_username *");
      expect(input).toHaveValue("Player#12345");
    });

    it("calls onPlatformUsernameChange on input", async () => {
      const user = userEvent.setup();
      const { props } = renderFields({ mode: "online", onlinePlatform: "mtga" });

      const input = screen.getByLabelText("platform_username *");
      await user.type(input, "NewPlayer");

      expect(props.onPlatformUsernameChange).toHaveBeenCalled();
    });
  });

  // == CONTACT LINK INPUT ==

  describe("contactLink input", () => {
    it("renders with the provided value", () => {
      renderFields({ mode: "online", onlinePlatform: "mtga", contactLink: "https://wa.me/999" });
      const input = screen.getByLabelText("contact_link");
      expect(input).toHaveValue("https://wa.me/999");
    });

    it("has type=url", () => {
      renderFields({ mode: "online", onlinePlatform: "mtga" });
      const input = screen.getByLabelText("contact_link");
      expect(input).toHaveAttribute("type", "url");
    });
  });

  // == AUTO-FILL FROM PROFILE ==

  describe("auto-fill from profile", () => {
    it("auto-fills contactLink from profile.whatsapp when platform=mtga and contactLink is empty", () => {
      const { props } = renderFields({
        mode: "online",
        onlinePlatform: "mtga",
        contactLink: "",
      });

      // The useEffect should have called onContactLinkChange with profile.whatsapp
      expect(props.onContactLinkChange).toHaveBeenCalledWith("https://wa.me/1234567890");
    });

    it("auto-fills platformUsername from profile.arena_username when platform=mtga and platformUsername is empty", () => {
      const { props } = renderFields({
        mode: "online",
        onlinePlatform: "mtga",
        platformUsername: "",
      });

      expect(props.onPlatformUsernameChange).toHaveBeenCalledWith("TestPlayer#12345");
    });

    it("does NOT auto-fill contactLink if already provided", () => {
      const { props } = renderFields({
        mode: "online",
        onlinePlatform: "mtga",
        contactLink: "https://existing.link",
      });

      expect(props.onContactLinkChange).not.toHaveBeenCalled();
    });

    it("does NOT auto-fill platformUsername if already provided", () => {
      const { props } = renderFields({
        mode: "online",
        onlinePlatform: "mtga",
        platformUsername: "ExistingUser",
      });

      expect(props.onPlatformUsernameChange).not.toHaveBeenCalled();
    });

    it("does NOT auto-fill contactLink for platforms that don't need it (spelltable)", () => {
      const { props } = renderFields({
        mode: "online",
        onlinePlatform: "spelltable",
        contactLink: "",
      });

      expect(props.onContactLinkChange).not.toHaveBeenCalled();
    });

    it("auto-fills contactLink from profile.whatsapp for platform=other", () => {
      const { props } = renderFields({
        mode: "online",
        onlinePlatform: "other",
        contactLink: "",
      });

      expect(props.onContactLinkChange).toHaveBeenCalledWith("https://wa.me/1234567890");
    });
  });

  // == DATE INPUT ==

  describe("date input", () => {
    it("renders a date input", () => {
      renderFields();
      const input = screen.getByLabelText("Date");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("type", "date");
    });

    it("has required attribute", () => {
      renderFields();
      const input = screen.getByLabelText("Date");
      expect(input).toBeRequired();
    });

    it("shows the date portion of startsAt", () => {
      renderFields({ startsAt: "2027-06-15T18:00" });
      const input = screen.getByLabelText("Date");
      expect(input).toHaveValue("2027-06-15");
    });

    it("calls onStartsAtChange when date and time are both set", async () => {
      const user = userEvent.setup();
      // Provide a startsAt with a time already set so that changing date propagates
      const { props } = renderFields({ startsAt: "2027-06-15T18:00" });

      const input = screen.getByLabelText("Date");
      await user.clear(input);
      await user.type(input, "2027-07-20");

      expect(props.onStartsAtChange).toHaveBeenCalledWith("2027-07-20T18:00");
    });
  });

  // == TIME PRESETS ==

  describe("time presets", () => {
    const TIME_PRESETS = ["10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"];

    it("renders 7 time preset buttons", () => {
      renderFields();

      for (const preset of TIME_PRESETS) {
        expect(screen.getByRole("button", { name: preset })).toBeInTheDocument();
      }
    });

    it('renders an "Other" button', () => {
      renderFields();
      expect(screen.getByRole("button", { name: "Other" })).toBeInTheDocument();
    });

    it("highlights the selected time preset with bg-accent", () => {
      renderFields({ startsAt: "2027-06-15T18:00" });

      const btn1800 = screen.getByRole("button", { name: "18:00" });
      expect(btn1800.className).toContain("bg-accent");

      const btn1000 = screen.getByRole("button", { name: "10:00" });
      expect(btn1000.className).not.toContain("bg-accent");
    });

    it("calls onStartsAtChange when a preset is clicked and date is set", async () => {
      const user = userEvent.setup();
      const { props } = renderFields({ startsAt: "2027-06-15T10:00" });

      await user.click(screen.getByRole("button", { name: "20:00" }));

      expect(props.onStartsAtChange).toHaveBeenCalledWith("2027-06-15T20:00");
    });

    it("does NOT call onStartsAtChange when a preset is clicked but date is empty", async () => {
      const user = userEvent.setup();
      const { props } = renderFields({ startsAt: "" });

      await user.click(screen.getByRole("button", { name: "18:00" }));

      // propagate only fires when both date and time are set
      expect(props.onStartsAtChange).not.toHaveBeenCalled();
    });
  });

  // == CUSTOM TIME ==

  describe("custom time input", () => {
    it('does NOT show custom time input by default', () => {
      renderFields();
      expect(screen.queryByDisplayValue(/:/)).toBeFalsy();
      // No time input[type=time] should be visible
      const timeInputs = document.querySelectorAll('input[type="time"]');
      expect(timeInputs.length).toBe(0);
    });

    it('shows custom time input when "Other" is clicked', async () => {
      const user = userEvent.setup();
      renderFields();

      await user.click(screen.getByRole("button", { name: "Other" }));

      const timeInput = document.querySelector('input[type="time"]');
      expect(timeInput).toBeInTheDocument();
    });

    it('"Other" button is highlighted when custom time is active', async () => {
      const user = userEvent.setup();
      renderFields();

      await user.click(screen.getByRole("button", { name: "Other" }));

      const otherBtn = screen.getByRole("button", { name: "Other" });
      expect(otherBtn.className).toContain("bg-accent");
    });

    it("shows custom time input when startsAt has a non-preset time", () => {
      renderFields({ startsAt: "2027-06-15T13:30" });

      const timeInput = document.querySelector('input[type="time"]');
      expect(timeInput).toBeInTheDocument();
      expect(timeInput).toHaveValue("13:30");
    });

    it("hides custom time input when a preset is clicked after Other", async () => {
      const user = userEvent.setup();
      renderFields({ startsAt: "2027-06-15T13:30" });

      // Custom time should be visible initially (non-preset time)
      expect(document.querySelector('input[type="time"]')).toBeInTheDocument();

      // Click a preset
      await user.click(screen.getByRole("button", { name: "18:00" }));

      expect(document.querySelector('input[type="time"]')).not.toBeInTheDocument();
    });
  });

  // == MIN PLAYERS ==

  describe("minPlayers input", () => {
    it("renders a number input with the current value", () => {
      renderFields({ minPlayers: 4 });
      const input = screen.getByLabelText("min_players");
      expect(input).toHaveAttribute("type", "number");
      expect(input).toHaveValue(4);
    });

    it("has min=2 attribute", () => {
      renderFields();
      const input = screen.getByLabelText("min_players");
      expect(input).toHaveAttribute("min", "2");
    });

    it("calls onMinPlayersChange on input", async () => {
      const user = userEvent.setup();
      const { props } = renderFields({ minPlayers: 2 });

      const input = screen.getByLabelText("min_players") as HTMLInputElement;
      // Use tripleClick to select all then type to replace
      await user.tripleClick(input);
      await user.keyboard("6");

      // The last call should contain 6
      const lastCall = props.onMinPlayersChange.mock.calls.at(-1);
      expect(lastCall?.[0]).toBe(6);
    });
  });

  // == AVAILABLE PLAYERS HINT ==

  describe("AvailablePlayersHint", () => {
    it("renders AvailablePlayersHint component", () => {
      renderFields();
      expect(screen.getByTestId("available-players-hint")).toBeInTheDocument();
    });
  });

  // == HYBRID MODE ==

  describe("hybrid mode shows both venue and platform fields", () => {
    it("renders venue select AND platform select in hybrid mode", () => {
      renderFields({ mode: "hybrid" });

      expect(screen.getByText("venue *")).toBeInTheDocument();
      expect(screen.getByText("online_platform")).toBeInTheDocument();
    });
  });

  // == idPrefix ==

  describe("idPrefix", () => {
    it("applies idPrefix to input ids", () => {
      renderFields({ idPrefix: "q_" });

      expect(document.getElementById("q_date")).toBeInTheDocument();
      expect(document.getElementById("q_min_players")).toBeInTheDocument();
    });

    it("default idPrefix is empty", () => {
      renderFields();

      expect(document.getElementById("date")).toBeInTheDocument();
      expect(document.getElementById("min_players")).toBeInTheDocument();
    });
  });
});
