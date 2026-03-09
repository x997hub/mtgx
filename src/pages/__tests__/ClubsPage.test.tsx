/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { VenueWithEventCount } from "@/hooks/useVenues";

// Mock react-i18next
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

// Mock leaflet and react-leaflet (not available in jsdom)
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => null,
  Marker: () => null,
  Popup: () => null,
  useMap: () => ({
    flyTo: vi.fn(),
  }),
}));

vi.mock("leaflet", () => ({
  default: {
    Icon: {
      Default: {
        prototype: {},
        mergeOptions: vi.fn(),
      },
    },
  },
}));

vi.mock("leaflet/dist/images/marker-icon-2x.png", () => ({ default: "" }));
vi.mock("leaflet/dist/images/marker-icon.png", () => ({ default: "" }));
vi.mock("leaflet/dist/images/marker-shadow.png", () => ({ default: "" }));

// Mock useVenues
let mockVenuesData: {
  data: VenueWithEventCount[] | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} = {
  data: undefined,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};

vi.mock("@/hooks/useVenues", () => ({
  useVenues: () => mockVenuesData,
}));

// Mock useAuthStore
let mockProfile: any = { role: "player" };

vi.mock("@/store/authStore", () => ({
  useAuthStore: (selector: (state: any) => any) =>
    selector({
      profile: mockProfile,
    }),
}));

// Mock VenueCard
vi.mock("@/components/venue/VenueCard", () => ({
  VenueCard: ({ venue }: { venue: VenueWithEventCount }) => (
    <div data-testid="venue-card">{venue.name}</div>
  ),
}));

// Mock EmptyState
vi.mock("@/components/shared/EmptyState", () => ({
  EmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

// Mock QueryErrorState
vi.mock("@/components/shared/QueryErrorState", () => ({
  QueryErrorState: ({ onRetry }: { onRetry?: () => void }) => (
    <div data-testid="error-state">
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

function makeVenue(overrides: Partial<VenueWithEventCount> = {}): VenueWithEventCount {
  return {
    id: "venue-1",
    name: "Game Zone",
    city: "Tel Aviv",
    address: "123 Main St",
    owner_id: "user-1",
    supported_formats: ["pauper"],
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

// Lazy-load the component after all mocks are set up
let ClubsPage: any;
beforeAll(async () => {
  const mod = await import("../ClubsPage");
  ClubsPage = mod.default;
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ClubsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("ClubsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfile = { role: "player" };
    mockVenuesData = {
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
  });

  it("renders page title", () => {
    renderPage();
    expect(screen.getByText("venue:clubs_map")).toBeInTheDocument();
  });

  it("renders loading skeletons when isLoading", () => {
    mockVenuesData = {
      ...mockVenuesData,
      isLoading: true,
    };

    renderPage();

    const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders error state when isError", () => {
    mockVenuesData = {
      ...mockVenuesData,
      isError: true,
    };

    renderPage();

    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });

  it("renders empty state when venues array is empty", () => {
    mockVenuesData = {
      ...mockVenuesData,
      data: [],
    };

    renderPage();

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText("venue:no_clubs")).toBeInTheDocument();
  });

  it("renders venue cards when venues are present", () => {
    mockVenuesData = {
      ...mockVenuesData,
      data: [
        makeVenue({ id: "venue-1", name: "Game Zone" }),
        makeVenue({ id: "venue-2", name: "Card Castle" }),
      ],
    };

    renderPage();

    const venueCards = screen.getAllByTestId("venue-card");
    expect(venueCards).toHaveLength(2);
    expect(screen.getByText("Game Zone")).toBeInTheDocument();
    expect(screen.getByText("Card Castle")).toBeInTheDocument();
  });

  it("shows 'Add Club' button for admin role", () => {
    mockProfile = { role: "admin" };
    mockVenuesData = { ...mockVenuesData, data: [] };

    renderPage();

    expect(screen.getByText("venue:add_venue")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /venue:add_venue/ });
    expect(link).toHaveAttribute("href", "/venues/new");
  });

  it("shows 'Add Club' button for club_owner role", () => {
    mockProfile = { role: "club_owner" };
    mockVenuesData = { ...mockVenuesData, data: [] };

    renderPage();

    expect(screen.getByText("venue:add_venue")).toBeInTheDocument();
  });

  it("hides 'Add Club' button for player role", () => {
    mockProfile = { role: "player" };
    mockVenuesData = { ...mockVenuesData, data: [] };

    renderPage();

    expect(screen.queryByText("venue:add_venue")).not.toBeInTheDocument();
  });

  it("hides 'Add Club' button for organizer role", () => {
    mockProfile = { role: "organizer" };
    mockVenuesData = { ...mockVenuesData, data: [] };

    renderPage();

    expect(screen.queryByText("venue:add_venue")).not.toBeInTheDocument();
  });

  it("renders map container", () => {
    mockVenuesData = { ...mockVenuesData, data: [] };

    renderPage();

    expect(screen.getByTestId("map-container")).toBeInTheDocument();
  });
});
