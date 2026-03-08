import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import { AutoMatchSettings } from "../AutoMatchSettings";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@example.com" },
    profile: null,
    isLoading: false,
  }),
}));

const mockUpsert = vi.fn();
let mockPrefs: Record<string, unknown> | null = null;
let mockIsLoading = false;

vi.mock("@/hooks/useAutoMatch", () => ({
  useAutoMatch: () => ({
    prefs: mockPrefs,
    isLoading: mockIsLoading,
    upsert: mockUpsert,
    isUpdating: false,
  }),
}));

describe("AutoMatchSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    mockPrefs = {
      user_id: "user-1",
      formats: ["pauper"],
      event_types: ["big", "quick"],
      match_days: {},
      radius: "my_city",
      max_daily_notifications: 3,
      is_active: true,
    };
    mockUpsert.mockResolvedValue({});
  });

  it("renders nothing when loading", () => {
    mockIsLoading = true;
    const { container } = renderWithProviders(<AutoMatchSettings />);
    expect(container.firstChild).toBeNull();
  });

  it("renders with initial state", () => {
    renderWithProviders(<AutoMatchSettings />);
    expect(screen.getByText("auto_match_title")).toBeInTheDocument();
    expect(screen.getByText("auto_match_description")).toBeInTheDocument();
    expect(screen.getByText("auto_match_active")).toBeInTheDocument();
  });

  it("shows format buttons when active", () => {
    renderWithProviders(<AutoMatchSettings />);
    expect(screen.getByText("pauper")).toBeInTheDocument();
    expect(screen.getByText("commander")).toBeInTheDocument();
    expect(screen.getByText("standard")).toBeInTheDocument();
    expect(screen.getByText("draft")).toBeInTheDocument();
  });

  it("shows event type buttons when active", () => {
    renderWithProviders(<AutoMatchSettings />);
    expect(screen.getByText("big_event")).toBeInTheDocument();
    expect(screen.getByText("quick_meetup")).toBeInTheDocument();
  });

  it("toggle format works", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AutoMatchSettings />);

    // Commander is not in initial formats, click to add it
    await user.click(screen.getByText("commander"));

    // Now save and check what was passed
    await user.click(screen.getByText("save"));

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          formats: expect.arrayContaining(["pauper", "commander"]),
        })
      );
    });
  });

  it("toggle format off works", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AutoMatchSettings />);

    // Pauper is in initial formats, click to remove it
    await user.click(screen.getByText("pauper"));

    await user.click(screen.getByText("save"));

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          formats: [],
        })
      );
    });
  });

  it("save button calls upsert", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AutoMatchSettings />);

    await user.click(screen.getByText("save"));

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-1",
          is_active: true,
          radius: "my_city",
          max_daily_notifications: 3,
        })
      );
    });
  });

  it("save shows success toast", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AutoMatchSettings />);

    await user.click(screen.getByText("save"));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({ title: "profile_saved" });
    });
  });

  it("save shows error toast on failure", async () => {
    mockUpsert.mockRejectedValue(new Error("fail"));
    const user = userEvent.setup();
    renderWithProviders(<AutoMatchSettings />);

    await user.click(screen.getByText("save"));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "error",
        variant: "destructive",
      });
    });
  });

  it("active toggle hides settings when deactivated", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AutoMatchSettings />);

    // Settings should be visible initially (isActive=true)
    expect(screen.getByText("auto_match_formats")).toBeInTheDocument();

    // Click active toggle to deactivate
    await user.click(screen.getByText("auto_match_active"));

    // Settings section should be hidden
    expect(screen.queryByText("auto_match_formats")).not.toBeInTheDocument();
  });

  it("active toggle shows settings when reactivated", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AutoMatchSettings />);

    // Deactivate
    await user.click(screen.getByText("auto_match_active"));
    expect(screen.queryByText("auto_match_formats")).not.toBeInTheDocument();

    // Reactivate
    await user.click(screen.getByText("auto_match_active"));
    expect(screen.getByText("auto_match_formats")).toBeInTheDocument();
  });

  it("save with isActive=false sends is_active: false", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AutoMatchSettings />);

    // Deactivate
    await user.click(screen.getByText("auto_match_active"));

    await user.click(screen.getByText("save"));

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: false,
        })
      );
    });
  });

  it("renders schedule grid when active", () => {
    renderWithProviders(<AutoMatchSettings />);
    expect(screen.getByText("auto_match_schedule")).toBeInTheDocument();
  });

  it("renders radius select when active", () => {
    renderWithProviders(<AutoMatchSettings />);
    expect(screen.getByText("auto_match_radius")).toBeInTheDocument();
  });

  it("renders max daily select when active", () => {
    renderWithProviders(<AutoMatchSettings />);
    expect(screen.getByText("auto_match_max_daily")).toBeInTheDocument();
  });

  it("renders without prefs (new user, null prefs)", () => {
    mockPrefs = null;
    renderWithProviders(<AutoMatchSettings />);
    expect(screen.getByText("auto_match_title")).toBeInTheDocument();
    // Save button should still be available
    expect(screen.getByText("save")).toBeInTheDocument();
  });
});
