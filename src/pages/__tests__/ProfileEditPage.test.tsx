/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ProfileEditPage from "../ProfileEditPage";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock toast
const mockToastFn = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: mockToastFn }),
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

// Mock useProfile
const mockUpdateProfile = vi.fn().mockResolvedValue({});
const mockUpdateAvailability = vi.fn().mockResolvedValue({});

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
    upsertProfile: vi.fn(),
    updateAvailability: mockUpdateAvailability,
  }),
}));

// Mock useAuth
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

// Mock useAuthStore (used inside useProfile)
vi.mock("@/store/authStore", () => ({
  useAuthStore: Object.assign(
    (selector: (state: any) => any) =>
      selector({ user: { id: "user-1", email: "test@test.com" } }),
    {
      getState: () => ({
        user: { id: "user-1", email: "test@test.com" },
        setProfile: vi.fn(),
      }),
    }
  ),
}));

// Mock child components that need QueryClient (AutoMatch + InvitePreferences)
vi.mock("@/components/profile/AutoMatchSettings", () => ({
  AutoMatchSettings: () => null,
}));
vi.mock("@/components/profile/InvitePreferencesSettings", () => ({
  InvitePreferencesSettings: () => null,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <ProfileEditPage />
    </MemoryRouter>
  );
}

describe("ProfileEditPage", () => {
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

  it("shows loading skeletons when isLoading", () => {
    mockProfileData = {
      profile: null,
      availability: [],
      isLoading: true,
      isUpdating: false,
    };

    renderPage();

    // Skeleton elements should be present (they have a specific class)
    document.querySelectorAll('[class*="animate-pulse"], [class*="skeleton"]');
    // The Skeleton component renders divs; check for the container
    expect(document.querySelector(".space-y-4")).toBeInTheDocument();
    // Should NOT show the form
    expect(screen.queryByText("edit_profile")).not.toBeInTheDocument();
  });

  it("populates fields from profile", () => {
    mockProfileData = {
      profile: {
        id: "user-1",
        display_name: "Alice",
        city: "Tel Aviv",
        formats: ["pauper", "commander"],
        whatsapp: "+1234567890",
        bio: "Hello world",
        car_access: "yes",
        interested_in_trading: true,
        role: "player",
        reliability_score: 100,
        avatar_url: null,
        created_at: "2026-01-01T00:00:00Z",
      },
      availability: [],
      isLoading: false,
      isUpdating: false,
    };

    renderPage();

    expect(screen.getByLabelText("display_name")).toHaveValue("Alice");
    expect(screen.getByLabelText("whatsapp")).toHaveValue("+1234567890");
    expect(screen.getByLabelText("bio")).toHaveValue("Hello world");
  });

  it("save button disabled when displayName is empty", () => {
    mockProfileData = {
      profile: {
        id: "user-1",
        display_name: "",
        city: "Tel Aviv",
        formats: [],
        whatsapp: null,
        bio: null,
        car_access: null,
        interested_in_trading: false,
        role: "player",
        reliability_score: 100,
        avatar_url: null,
        created_at: "2026-01-01T00:00:00Z",
      },
      availability: [],
      isLoading: false,
      isUpdating: false,
    };

    renderPage();

    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  it("save button disabled when city is empty", () => {
    mockProfileData = {
      profile: {
        id: "user-1",
        display_name: "Alice",
        city: "",
        formats: [],
        whatsapp: null,
        bio: null,
        car_access: null,
        interested_in_trading: false,
        role: "player",
        reliability_score: 100,
        avatar_url: null,
        created_at: "2026-01-01T00:00:00Z",
      },
      availability: [],
      isLoading: false,
      isUpdating: false,
    };

    renderPage();

    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  it("invalid whatsapp shows toast", async () => {
    const user = userEvent.setup();

    mockProfileData = {
      profile: {
        id: "user-1",
        display_name: "Alice",
        city: "Tel Aviv",
        formats: ["pauper"],
        whatsapp: null,
        bio: null,
        car_access: null,
        interested_in_trading: false,
        role: "player",
        reliability_score: 100,
        avatar_url: null,
        created_at: "2026-01-01T00:00:00Z",
      },
      availability: [],
      isLoading: false,
      isUpdating: false,
    };

    renderPage();

    // Type an invalid phone number
    const whatsappInput = screen.getByLabelText("whatsapp");
    await user.type(whatsappInput, "abc");

    // Click save
    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    expect(mockToastFn).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "invalid_phone",
        variant: "destructive",
      })
    );
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it("valid save calls updateProfile", async () => {
    const user = userEvent.setup();

    mockProfileData = {
      profile: {
        id: "user-1",
        display_name: "Alice",
        city: "Tel Aviv",
        formats: ["pauper"],
        whatsapp: "+1234567890",
        bio: "Hi",
        car_access: null,
        interested_in_trading: false,
        role: "player",
        reliability_score: 100,
        avatar_url: null,
        created_at: "2026-01-01T00:00:00Z",
      },
      availability: [],
      isLoading: false,
      isUpdating: false,
    };

    renderPage();

    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    await vi.waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          display_name: "Alice",
          city: "Tel Aviv",
          formats: ["pauper"],
          whatsapp: "+1234567890",
          bio: "Hi",
        })
      );
    });
  });
});
