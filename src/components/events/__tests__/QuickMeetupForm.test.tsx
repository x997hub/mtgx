/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QuickMeetupForm } from "../QuickMeetupForm";

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

function renderForm(defaultValues?: any) {
  return render(
    <MemoryRouter>
      <QuickMeetupForm defaultValues={defaultValues} />
    </MemoryRouter>
  );
}

describe("QuickMeetupForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateEvent.mockResolvedValue({ id: "new-event" });
  });

  it("renders form fields", () => {
    renderForm();

    // Submit button
    expect(
      screen.getByRole("button", { name: "create_quick_meetup" })
    ).toBeInTheDocument();
    // Date input (split picker: date field)
    expect(screen.getByLabelText("Date")).toBeInTheDocument();
    // Min players input
    expect(screen.getByLabelText("min_players")).toBeInTheDocument();
  });

  it("shows toast when venue is empty on submit", async () => {
    renderForm();

    const form = document.querySelector("form")!;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Venue is required",
          variant: "destructive",
        })
      );
    });
  });

  it("shows toast when date is empty on submit", async () => {
    // Provide venue_id so we get past venue validation
    renderForm({ venue_id: "venue-1" });

    const form = document.querySelector("form")!;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Date is required",
          variant: "destructive",
        })
      );
    });
  });

  it('successful submit calls createEvent with type "quick"', async () => {
    renderForm({ venue_id: "venue-1", city: "Tel Aviv" });

    // Set date via split picker
    const dateInput = screen.getByLabelText("Date");
    await userEvent.type(dateInput, "2027-06-15");

    // Click a time preset button (e.g. 18:00)
    await userEvent.click(screen.getByRole("button", { name: "18:00" }));

    const form = document.querySelector("form")!;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(mockCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          organizer_id: "user-1",
          type: "quick",
          city: "Tel Aviv",
          format: "pauper",
        })
      );
    });

    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("expires_at is starts_at + 24h", async () => {
    renderForm({ venue_id: "venue-1", city: "Tel Aviv" });

    // Set date via split picker
    const dateInput = screen.getByLabelText("Date");
    await userEvent.type(dateInput, "2027-06-15");

    // Click a time preset button (e.g. 18:00)
    await userEvent.click(screen.getByRole("button", { name: "18:00" }));

    const form = document.querySelector("form")!;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(mockCreateEvent).toHaveBeenCalled();
    });

    const callArgs = mockCreateEvent.mock.calls[0][0];
    const startsAt = new Date(callArgs.starts_at);
    const expiresAt = new Date(callArgs.expires_at);
    const diffMs = expiresAt.getTime() - startsAt.getTime();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    expect(diffMs).toBe(twentyFourHoursMs);
  });
});
