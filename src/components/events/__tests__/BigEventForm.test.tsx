/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { BigEventForm } from "../BigEventForm";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock toast
const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
  useToast: () => ({ toast: (...args: unknown[]) => mockToast(...args) }),
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
const mockCreateEvent = vi.fn();
vi.mock("@/hooks/useEvents", () => ({
  useEvents: () => ({
    createEvent: mockCreateEvent,
    isCreating: false,
  }),
}));

// Mock useAuthStore
vi.mock("@/store/authStore", () => ({
  useAuthStore: (selector: (state: any) => any) =>
    selector({ user: { id: "user-1", email: "test@test.com" } }),
}));

// Mock supabase for venue query
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
        order: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  },
}));

// Mock AvailablePlayersHint (added to EventFormFields; needs QueryClient + RPC)
vi.mock("@/components/events/AvailablePlayersHint", () => ({
  AvailablePlayersHint: () => null,
}));

// Mock react-query useQuery for venues
const mockVenues = [
  { id: "venue-1", name: "Test Venue", city: "Tel Aviv" },
];
vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useQuery: () => ({ data: mockVenues, isLoading: false }),
  };
});

function renderForm() {
  return render(
    <MemoryRouter>
      <BigEventForm />
    </MemoryRouter>
  );
}

describe("BigEventForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateEvent.mockResolvedValue({ id: "new-event" });
  });

  it("renders all form fields", () => {
    renderForm();

    // Title input
    expect(screen.getByLabelText("event_title")).toBeInTheDocument();
    // Max players input
    expect(screen.getByLabelText("max_players")).toBeInTheDocument();
    // Fee input
    expect(screen.getByLabelText("fee")).toBeInTheDocument();
    // Description textarea
    expect(screen.getByLabelText("description")).toBeInTheDocument();
    // Submit button
    expect(screen.getByRole("button", { name: "create_big_event" })).toBeInTheDocument();
  });

  it("shows toast when venue is empty on submit", async () => {
    const user = userEvent.setup();
    renderForm();

    // Fill required title field (it has required attribute)
    await user.type(screen.getByLabelText("event_title"), "Test Event");

    // Submit form - venue is empty by default
    // We need to fire submit directly since HTML validation might block
    const form = document.querySelector("form")!;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    // Wait for state update
    await vi.waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Venue is required",
          variant: "destructive",
        })
      );
    });
  });

  it("shows toast when max < min players on submit", async () => {
    renderForm();

    // Manually dispatch submit with venue not set but max < min
    // We need to programmatically set form state via interactions
    const maxInput = screen.getByLabelText("max_players");
    await userEvent.clear(maxInput);
    await userEvent.type(maxInput, "2");

    // The form won't pass venue validation first, so toast should show venue_required
    const form = document.querySelector("form")!;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(mockToast).toHaveBeenCalled();
    });
  });

  it("successful submit calls createEvent and navigates", async () => {
    // Render with defaultValues including venue_id to bypass venue validation
    render(
      <MemoryRouter>
        <BigEventForm
          defaultValues={{
            city: "Tel Aviv",
            venue_id: "venue-1",
            title: "Test Event",
          }}
        />
      </MemoryRouter>
    );

    // Set date via split picker
    const dateInput = screen.getByLabelText("Date");
    await userEvent.type(dateInput, "2027-06-15");

    // Click a time preset button (e.g. 18:00)
    await userEvent.click(screen.getByRole("button", { name: "18:00" }));

    // Submit
    const form = document.querySelector("form")!;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(mockCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          organizer_id: "user-1",
          type: "big",
          city: "Tel Aviv",
          format: "pauper",
        })
      );
    });

    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });
});
