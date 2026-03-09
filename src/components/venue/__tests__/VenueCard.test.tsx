import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { VenueCard } from "../VenueCard";
import type { VenueWithEventCount } from "@/hooks/useVenues";

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

function makeVenue(overrides: Partial<VenueWithEventCount> = {}): VenueWithEventCount {
  return {
    id: "venue-1",
    name: "Game Zone",
    city: "Tel Aviv",
    address: "123 Main St",
    owner_id: "user-1",
    supported_formats: ["pauper", "commander"],
    capacity: 32,
    hours: null,
    contacts: null,
    latitude: 32.0853,
    longitude: 34.7818,
    venue_qr_token: "token-1",
    created_at: "2026-01-01T00:00:00Z",
    upcoming_event_count: 0,
    ...overrides,
  };
}

function renderVenueCard(venue: VenueWithEventCount) {
  return render(
    <MemoryRouter>
      <VenueCard venue={venue} />
    </MemoryRouter>
  );
}

describe("VenueCard", () => {
  it("renders venue name", () => {
    renderVenueCard(makeVenue({ name: "Card Castle" }));
    expect(screen.getByText("Card Castle")).toBeInTheDocument();
  });

  it("renders venue city via CityBadge", () => {
    renderVenueCard(makeVenue({ city: "Herzliya" }));
    expect(screen.getByText("Herzliya")).toBeInTheDocument();
  });

  it("renders venue address", () => {
    renderVenueCard(makeVenue({ address: "456 Oak Ave" }));
    expect(screen.getByText("456 Oak Ave")).toBeInTheDocument();
  });

  it("renders format badges for supported formats", () => {
    renderVenueCard(makeVenue({ supported_formats: ["pauper", "commander", "standard"] }));
    expect(screen.getByText("pauper")).toBeInTheDocument();
    expect(screen.getByText("commander")).toBeInTheDocument();
    expect(screen.getByText("standard")).toBeInTheDocument();
  });

  it("does not render format badges when supported_formats is empty", () => {
    renderVenueCard(makeVenue({ supported_formats: [] }));
    expect(screen.queryByText("pauper")).not.toBeInTheDocument();
    expect(screen.queryByText("commander")).not.toBeInTheDocument();
  });

  it("shows event count badge when upcoming_event_count > 0", () => {
    renderVenueCard(makeVenue({ upcoming_event_count: 5 }));
    // The badge renders: {count} {t("venue:events_count", { count })}
    // Our mock t returns "venue:events_count 5"
    expect(screen.getByText(/venue:events_count 5/)).toBeInTheDocument();
  });

  it("does not show event count badge when upcoming_event_count is 0", () => {
    renderVenueCard(makeVenue({ upcoming_event_count: 0 }));
    // The venue:events_count key should not appear
    expect(screen.queryByText(/venue:events_count/)).not.toBeInTheDocument();
  });

  it("links to /venues/{id}", () => {
    renderVenueCard(makeVenue({ id: "venue-42" }));
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/venues/venue-42");
  });

  it("renders link as a block element", () => {
    renderVenueCard(makeVenue());
    const link = screen.getByRole("link");
    expect(link.className).toContain("block");
  });
});
