import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { EventCard } from "../EventCard";
import type { EventWithRelations } from "@/hooks/useEvents";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) => {
      if (typeof fallback === "string") return fallback;
      if (typeof fallback === "object" && fallback !== null && "count" in fallback) {
        return `${key} ${fallback.count}`;
      }
      return key;
    },
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

function makeEvent(overrides: Partial<EventWithRelations> = {}): EventWithRelations {
  return {
    id: "event-1",
    organizer_id: "user-1",
    venue_id: null,
    type: "big",
    title: "Friday Night Pauper",
    format: "pauper",
    city: "Tel Aviv",
    starts_at: "2026-04-01T18:00:00Z",
    duration_min: null,
    min_players: 4,
    max_players: 16,
    fee_text: null,
    description: null,
    status: "active",
    cloned_from: null,
    expires_at: null,
    confirmation_sent_24h: false,
    confirmation_sent_3h: false,
    mood_tags: [],
    proxy_policy: "none",
    template_id: null,
    created_at: "2026-03-01T00:00:00Z",
    rsvps: [{ count: 5 }],
    venues: null,
    profiles: null,
    ...overrides,
  };
}

function renderEventCard(event: EventWithRelations) {
  return render(
    <MemoryRouter>
      <EventCard event={event} />
    </MemoryRouter>
  );
}

describe("EventCard", () => {
  it("renders event title", () => {
    renderEventCard(makeEvent({ title: "My Cool Event" }));
    expect(screen.getByText("My Cool Event")).toBeInTheDocument();
  });

  it("shows translated event type when title is empty", () => {
    renderEventCard(makeEvent({ title: null, type: "big" }));
    expect(screen.getByText("big_event")).toBeInTheDocument();
  });

  it("shows FormatBadge with correct format", () => {
    renderEventCard(makeEvent({ format: "commander" }));
    // FormatBadge renders t(format) which returns the key
    expect(screen.getByText("commander")).toBeInTheDocument();
  });

  it("shows CityBadge", () => {
    renderEventCard(makeEvent({ city: "Herzliya" }));
    expect(screen.getByText("Herzliya")).toBeInTheDocument();
  });

  it("shows going count from rsvps", () => {
    renderEventCard(makeEvent({ rsvps: [{ count: 8 }] }));
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("shows 0 going when rsvps array is empty", () => {
    renderEventCard(makeEvent({ rsvps: [] }));
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it('shows "event_full" when going >= max_players', () => {
    renderEventCard(makeEvent({ rsvps: [{ count: 16 }], max_players: 16 }));
    expect(screen.getByText("event_full")).toBeInTheDocument();
  });

  it("shows spots_left when max_players set and spots remain", () => {
    renderEventCard(makeEvent({ rsvps: [{ count: 10 }], max_players: 16 }));
    expect(screen.getByText("spots_left 6")).toBeInTheDocument();
  });

  it("does not show spots info when max_players is null", () => {
    renderEventCard(makeEvent({ max_players: null, rsvps: [{ count: 5 }] }));
    expect(screen.queryByText(/spots_left/)).not.toBeInTheDocument();
    expect(screen.queryByText("event_full")).not.toBeInTheDocument();
  });

  it("links to /events/{id}", () => {
    renderEventCard(makeEvent({ id: "event-42" }));
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/events/event-42");
  });

  it("shows venue name when venue exists", () => {
    renderEventCard(
      makeEvent({
        venues: { name: "Game Zone", city: "Tel Aviv" },
      })
    );
    expect(screen.getByText("Game Zone")).toBeInTheDocument();
  });

  it("does not show venue section when venues is null", () => {
    renderEventCard(makeEvent({ venues: null }));
    expect(screen.queryByText("Game Zone")).not.toBeInTheDocument();
  });
});
