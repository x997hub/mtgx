/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EventFeedPage from "../EventFeedPage";
import type { EventWithRelations } from "@/hooks/useEvents";

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

// Mock navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock useEvents
let mockEventsData: {
  events: EventWithRelations[];
  isLoading: boolean;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  createEvent: () => Promise<void>;
  isCreating: boolean;
} = {
  events: [],
  isLoading: false,
  fetchNextPage: vi.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  createEvent: vi.fn(),
  isCreating: false,
};

vi.mock("@/hooks/useEvents", () => ({
  useEvents: () => mockEventsData,
}));

// Mock useGoingToday
vi.mock("@/hooks/useGoingToday", () => ({
  useGoingToday: () => ({
    instantCount: 0,
    instantSignals: [],
    myInstant: null,
    isMyInstantLoading: false,
    activate: vi.fn(),
    deactivate: vi.fn(),
    isActivating: false,
    isDeactivating: false,
  }),
}));

// Mock useInfiniteScroll
vi.mock("@/hooks/useInfiniteScroll", () => ({
  useInfiniteScroll: () => vi.fn(),
}));

// Mock useAuthStore
vi.mock("@/store/authStore", () => ({
  useAuthStore: (selector: (state: any) => any) =>
    selector({
      profile: { city: "Tel Aviv", formats: ["pauper"] },
      user: { id: "user-1" },
      isAuthenticated: true,
    }),
}));

// Mock useFilterStore
let mockFilterFormat: string | null = null;
let mockFilterCity: string | null = null;
const mockSetFormat = vi.fn();
const mockSetCity = vi.fn();

vi.mock("@/store/filterStore", () => ({
  useFilterStore: () => ({
    format: mockFilterFormat,
    city: mockFilterCity,
    setFormat: mockSetFormat,
    setCity: mockSetCity,
  }),
}));

// Mock child components that are complex
vi.mock("@/components/events/LFGBanner", () => ({
  LFGBanner: () => <div data-testid="lfg-banner" />,
}));

vi.mock("@/components/events/LFGToggleButton", () => ({
  LFGToggleButton: () => <div data-testid="lfg-toggle" />,
}));

vi.mock("@/components/events/LFGSignalList", () => ({
  LFGSignalList: () => <div data-testid="lfg-signal-list" />,
}));

vi.mock("@/components/events/GoingTodaySheet", () => ({
  GoingTodaySheet: () => null,
}));

vi.mock("@/components/shared/FAB", () => ({
  FAB: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock("@/components/shared/EmptyState", () => ({
  EmptyState: ({ title, description }: { title: string; description?: string }) => (
    <div data-testid="empty-state">
      <span>{title}</span>
      {description && <span>{description}</span>}
    </div>
  ),
}));

// Mock EventCard
vi.mock("@/components/events/EventCard", () => ({
  EventCard: ({ event }: { event: EventWithRelations }) => (
    <div data-testid="event-card">{event.title}</div>
  ),
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
    starts_at: new Date(Date.now() + 86400000).toISOString(),
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
    checkin_enabled: true,
    qr_token: "00000000-0000-0000-0000-000000000000",
    created_at: "2026-03-01T00:00:00Z",
    mode: "in_person",
    online_platform: null,
    join_link: null,
    rsvps: [{ count: 5 }],
    venues: null,
    profiles: null,
    ...overrides,
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <EventFeedPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("EventFeedPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFilterFormat = null;
    mockFilterCity = null;
    mockEventsData = {
      events: [],
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      createEvent: vi.fn(),
      isCreating: false,
    };
  });

  it("renders loading skeletons when isLoading is true", () => {
    mockEventsData = {
      ...mockEventsData,
      isLoading: true,
    };

    renderPage();

    // Skeleton elements have animate-pulse class
    const skeletons = document.querySelectorAll('[class*="h-32"]');
    expect(skeletons.length).toBe(6);
  });

  it("renders empty state when no events and not loading", () => {
    mockEventsData = {
      ...mockEventsData,
      events: [],
      isLoading: false,
    };

    renderPage();

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText("events:no_events")).toBeInTheDocument();
  });

  it("renders event cards when events are present", () => {
    mockEventsData = {
      ...mockEventsData,
      events: [
        makeEvent({ id: "event-1", title: "Pauper Cup" }),
        makeEvent({ id: "event-2", title: "Commander Night" }),
      ],
      isLoading: false,
    };

    renderPage();

    const eventCards = screen.getAllByTestId("event-card");
    expect(eventCards).toHaveLength(2);
    expect(screen.getByText("Pauper Cup")).toBeInTheDocument();
    expect(screen.getByText("Commander Night")).toBeInTheDocument();
  });

  it("does not show empty state when loading", () => {
    mockEventsData = {
      ...mockEventsData,
      events: [],
      isLoading: true,
    };

    renderPage();

    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("renders LFG components", () => {
    renderPage();

    expect(screen.getByTestId("lfg-banner")).toBeInTheDocument();
    expect(screen.getByTestId("lfg-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("lfg-signal-list")).toBeInTheDocument();
  });

  it("renders filter selects", () => {
    renderPage();

    // The Select components render trigger buttons
    const triggers = document.querySelectorAll('[role="combobox"]');
    expect(triggers.length).toBeGreaterThanOrEqual(2);
  });
});
