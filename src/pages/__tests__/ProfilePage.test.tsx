import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProfilePage from "../ProfilePage";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock useAuth
let mockAuthData = {
  user: { id: "user-1", email: "test@test.com" } as any,
  session: {} as any,
  isAuthenticated: true,
  isLoading: false,
  profileChecked: true,
  profile: {
    id: "user-1",
    display_name: "Alice",
    city: "Tel Aviv",
    formats: ["pauper", "commander"],
    role: "player",
  } as any,
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockAuthData,
  useAuthListener: vi.fn(),
}));

// Mock useProfile
let mockProfileData = {
  profile: {
    id: "user-1",
    display_name: "Alice",
    city: "Tel Aviv",
    formats: ["pauper", "commander"],
    whatsapp: "+972501234567",
    bio: "MTG enthusiast",
    car_access: "yes",
    interested_in_trading: true,
    role: "player",
    reliability_score: 0.95,
    avatar_url: null,
    created_at: "2026-01-01T00:00:00Z",
  } as any,
  availability: [] as any[],
  isLoading: false,
  updateProfile: vi.fn(),
  upsertProfile: vi.fn(),
  updateAvailability: vi.fn(),
  isUpdating: false,
};

vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => mockProfileData,
}));

// Mock useSubscription
vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({
    subscriptions: [],
    isLoading: false,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    isSubscribing: false,
  }),
}));

// Mock useInvitePreferences
vi.mock("@/hooks/useInvitePreferences", () => ({
  useInvitePreferences: () => ({
    prefs: null,
    isLoading: false,
    upsert: vi.fn(),
    updateDnd: vi.fn(),
    isUpdating: false,
  }),
}));

// Mock react-router-dom useParams
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ userId: undefined }),
  };
});

// Mock OrganizerStatsCard (requires QueryClient)
vi.mock("@/components/profile/OrganizerStatsCard", () => ({
  OrganizerStatsCard: () => null,
}));

// Mock InvitePlayerDialog
vi.mock("@/components/players/InvitePlayerDialog", () => ({
  InvitePlayerDialog: () => null,
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthData = {
      user: { id: "user-1", email: "test@test.com" } as any,
      session: {} as any,
      isAuthenticated: true,
      isLoading: false,
      profileChecked: true,
      profile: {
        id: "user-1",
        display_name: "Alice",
        city: "Tel Aviv",
        formats: ["pauper", "commander"],
        role: "player",
      } as any,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
    };
    mockProfileData = {
      profile: {
        id: "user-1",
        display_name: "Alice",
        city: "Tel Aviv",
        formats: ["pauper", "commander"],
        whatsapp: "+972501234567",
        bio: "MTG enthusiast",
        car_access: "yes",
        interested_in_trading: true,
        role: "player",
        reliability_score: 0.95,
        avatar_url: null,
        created_at: "2026-01-01T00:00:00Z",
      } as any,
      availability: [],
      isLoading: false,
      updateProfile: vi.fn(),
      upsertProfile: vi.fn(),
      updateAvailability: vi.fn(),
      isUpdating: false,
    };
  });

  it("shows loading skeletons when isLoading is true", () => {
    mockProfileData = {
      ...mockProfileData,
      profile: null,
      isLoading: true,
    };

    renderPage();

    // Loading state has Skeleton components (h-24, h-40, h-32)
    const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows empty state when profile is null and not loading", () => {
    mockProfileData = {
      ...mockProfileData,
      profile: null,
      isLoading: false,
    };

    renderPage();

    expect(screen.getByText("no_results")).toBeInTheDocument();
  });

  it("renders user display name and city", () => {
    renderPage();

    expect(screen.getByText("Alice")).toBeInTheDocument();
    // City appears in both the profile header and CityBadge
    const cityElements = screen.getAllByText("Tel Aviv");
    expect(cityElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders bio when present", () => {
    renderPage();

    expect(screen.getByText("MTG enthusiast")).toBeInTheDocument();
  });

  it("does not render bio section when bio is null", () => {
    mockProfileData = {
      ...mockProfileData,
      profile: {
        ...mockProfileData.profile,
        bio: null,
      },
    };

    renderPage();

    expect(screen.queryByText("bio")).not.toBeInTheDocument();
  });

  it("renders edit button with link to /profile/edit for own profile", () => {
    renderPage();

    const editLinks = screen.getAllByRole("link", { name: /edit_profile/i });
    // There's an icon edit button and a bottom edit button
    expect(editLinks.length).toBeGreaterThanOrEqual(1);
    const linkHrefs = editLinks.map((link) => link.getAttribute("href"));
    expect(linkHrefs).toContain("/profile/edit");
  });

  it("renders format badges for user's formats", () => {
    renderPage();

    expect(screen.getByText("pauper")).toBeInTheDocument();
    expect(screen.getByText("commander")).toBeInTheDocument();
  });

  it("renders WhatsApp link when whatsapp is set", () => {
    renderPage();

    expect(screen.getByText("whatsapp_chat")).toBeInTheDocument();
  });

  it("does not render WhatsApp link when whatsapp is null", () => {
    mockProfileData = {
      ...mockProfileData,
      profile: {
        ...mockProfileData.profile,
        whatsapp: null,
      },
    };

    renderPage();

    expect(screen.queryByText("whatsapp_chat")).not.toBeInTheDocument();
  });

  it("renders car access info when set", () => {
    renderPage();

    expect(screen.getByText("car_yes")).toBeInTheDocument();
  });

  it("renders trading interest when interested_in_trading is true", () => {
    renderPage();

    expect(screen.getByText("interested_in_trading")).toBeInTheDocument();
  });

  it("shows role badge", () => {
    renderPage();

    expect(screen.getByText("role_player")).toBeInTheDocument();
  });
});
