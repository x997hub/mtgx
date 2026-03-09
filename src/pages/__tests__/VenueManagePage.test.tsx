/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import VenueManagePage from "../VenueManagePage";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
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

// Mock useAuthStore
let mockUser: any = { id: "user-1" };
let mockProfile: any = { role: "club_owner" };

vi.mock("@/store/authStore", () => ({
  useAuthStore: (selector: (state: any) => any) =>
    selector({
      user: mockUser,
      profile: mockProfile,
    }),
}));

// Mock supabase
const mockVenueData: any = null;
let mockVenueQueryResult = { data: mockVenueData, error: null };
let mockPhotosQueryResult = { data: [] as any[], error: null };

const mockSupabaseChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(() => Promise.resolve(mockVenueQueryResult)),
  order: vi.fn(() => Promise.resolve(mockPhotosQueryResult)),
  update: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  single: vi.fn(() => Promise.resolve({ data: { id: "new-venue" }, error: null })),
};

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => mockSupabaseChain),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        remove: vi.fn(),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.com/photo.jpg" } })),
      })),
    },
  },
}));

// Mock useFormatToggle
vi.mock("@/hooks/useFormatToggle", () => ({
  useFormatToggle: () => vi.fn(),
}));

// Mock toast
vi.mock("@/components/ui/use-toast", () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

function renderCreateMode() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/venues/new"]}>
        <Routes>
          <Route path="/venues/new" element={<VenueManagePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function renderEditMode(venueId = "venue-1") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/venues/${venueId}/edit`]}>
        <Routes>
          <Route path="/venues/:id/edit" element={<VenueManagePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("VenueManagePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: "user-1" };
    mockProfile = { role: "club_owner" };
    mockVenueQueryResult = { data: null, error: null };
    mockPhotosQueryResult = { data: [], error: null };

    // Reset chain mocks
    mockSupabaseChain.select.mockReturnThis();
    mockSupabaseChain.eq.mockReturnThis();
    mockSupabaseChain.maybeSingle.mockImplementation(() => Promise.resolve(mockVenueQueryResult));
    mockSupabaseChain.order.mockImplementation(() => Promise.resolve(mockPhotosQueryResult));
  });

  describe("create mode", () => {
    it("renders create venue title", () => {
      renderCreateMode();
      expect(screen.getByText("create_venue")).toBeInTheDocument();
    });

    it("renders name input field", () => {
      renderCreateMode();
      expect(screen.getByLabelText("venue_name")).toBeInTheDocument();
    });

    it("renders address field", () => {
      renderCreateMode();
      expect(screen.getByText("address")).toBeInTheDocument();
    });

    it("renders city selector", () => {
      renderCreateMode();
      expect(screen.getByText("city")).toBeInTheDocument();
    });

    it("renders capacity field", () => {
      renderCreateMode();
      expect(screen.getByText("capacity")).toBeInTheDocument();
    });

    it("renders supported formats section", () => {
      renderCreateMode();
      expect(screen.getByText("supported_formats")).toBeInTheDocument();
    });

    it("renders hours section", () => {
      renderCreateMode();
      expect(screen.getByText("hours")).toBeInTheDocument();
    });

    it("renders contacts section", () => {
      renderCreateMode();
      expect(screen.getByText("contacts")).toBeInTheDocument();
    });

    it("renders coordinates section", () => {
      renderCreateMode();
      expect(screen.getByText("coordinates")).toBeInTheDocument();
    });

    it("renders save and cancel buttons", () => {
      renderCreateMode();
      expect(screen.getByText("save")).toBeInTheDocument();
      expect(screen.getByText("cancel")).toBeInTheDocument();
    });

    it("redirects player role to /clubs", () => {
      mockProfile = { role: "player" };
      renderCreateMode();
      expect(mockNavigate).toHaveBeenCalledWith("/clubs", { replace: true });
    });

    it("allows club_owner to see form", () => {
      mockProfile = { role: "club_owner" };
      renderCreateMode();
      expect(screen.getByText("create_venue")).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("allows admin to see form", () => {
      mockProfile = { role: "admin" };
      renderCreateMode();
      expect(screen.getByText("create_venue")).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("edit mode", () => {
    it("renders edit venue title when venue loaded", async () => {
      mockVenueQueryResult = {
        data: {
          id: "venue-1",
          name: "Game Zone",
          city: "Tel Aviv",
          address: "123 Main St",
          owner_id: "user-1",
          supported_formats: ["pauper"],
          capacity: 32,
          hours: null,
          contacts: null,
          latitude: null,
          longitude: null,
          venue_qr_token: "token-1",
          created_at: "2026-01-01T00:00:00Z",
        },
        error: null,
      };

      renderEditMode();

      // Wait for venue to load
      const title = await screen.findByText("edit_venue");
      expect(title).toBeInTheDocument();
    });

    it("redirects non-owner/non-admin in edit mode", async () => {
      mockUser = { id: "other-user" };
      mockProfile = { role: "player" };
      mockVenueQueryResult = {
        data: {
          id: "venue-1",
          name: "Game Zone",
          city: "Tel Aviv",
          address: "123 Main St",
          owner_id: "user-1",
          supported_formats: [],
          capacity: null,
          hours: null,
          contacts: null,
          latitude: null,
          longitude: null,
          venue_qr_token: "token-1",
          created_at: "2026-01-01T00:00:00Z",
        },
        error: null,
      };

      renderEditMode();

      // Wait for the query to resolve
      await screen.findByText("edit_venue").catch(() => {
        // Expected — it redirects instead of rendering
      });

      expect(mockNavigate).toHaveBeenCalledWith("/venues/venue-1", { replace: true });
    });

    it("allows owner to see edit form", async () => {
      mockUser = { id: "user-1" };
      mockProfile = { role: "club_owner" };
      mockVenueQueryResult = {
        data: {
          id: "venue-1",
          name: "Game Zone",
          city: "Tel Aviv",
          address: "123 Main St",
          owner_id: "user-1",
          supported_formats: [],
          capacity: null,
          hours: null,
          contacts: null,
          latitude: null,
          longitude: null,
          venue_qr_token: "token-1",
          created_at: "2026-01-01T00:00:00Z",
        },
        error: null,
      };

      renderEditMode();
      const title = await screen.findByText("edit_venue");
      expect(title).toBeInTheDocument();
    });

    it("allows admin to edit any venue", async () => {
      mockUser = { id: "admin-user" };
      mockProfile = { role: "admin" };
      mockVenueQueryResult = {
        data: {
          id: "venue-1",
          name: "Game Zone",
          city: "Tel Aviv",
          address: "123 Main St",
          owner_id: "user-1",
          supported_formats: [],
          capacity: null,
          hours: null,
          contacts: null,
          latitude: null,
          longitude: null,
          venue_qr_token: "token-1",
          created_at: "2026-01-01T00:00:00Z",
        },
        error: null,
      };

      renderEditMode();
      const title = await screen.findByText("edit_venue");
      expect(title).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
