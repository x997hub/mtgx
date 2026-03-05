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
    // Date/time input
    expect(screen.getByLabelText("date_time")).toBeInTheDocument();
    // Min players input
    expect(screen.getByLabelText("min_players")).toBeInTheDocument();
  });

  it("shows toast when city is empty on submit", async () => {
    renderForm();

    const form = document.querySelector("form")!;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "City is required",
          variant: "destructive",
        })
      );
    });
  });

  it("shows toast when date is empty on submit", async () => {
    // Provide city so we get past city validation
    renderForm({ city: "Tel Aviv" });

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
    renderForm({ city: "Tel Aviv" });

    // Set starts_at to a future date
    const dateInput = screen.getByLabelText("date_time");
    await userEvent.type(dateInput, "2027-06-15T18:00");

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
    renderForm({ city: "Tel Aviv" });

    const dateInput = screen.getByLabelText("date_time");
    await userEvent.type(dateInput, "2027-06-15T18:00");

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
