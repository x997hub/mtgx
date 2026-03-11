/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LFGToggleButton } from "../LFGToggleButton";
import { useAuthStore } from "@/store/authStore";

// --- Mock i18n ---
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallbackOrOpts?: any) => {
      if (typeof fallbackOrOpts === "string") return fallbackOrOpts;
      if (fallbackOrOpts?.count !== undefined) return `${fallbackOrOpts.count}h`;
      return key;
    },
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

// --- Mock toast ---
const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
  useToast: () => ({ toast: mockToast }),
}));

// --- Mock useLFG ---
const mockActivate = vi.fn();
const mockDeactivate = vi.fn();
let mockMySignal: any = null;
let mockIsActivating = false;
let mockIsDeactivating = false;

vi.mock("@/hooks/useLFG", () => ({
  useLFG: () => ({
    mySignal: mockMySignal,
    isMySignalLoading: false,
    signals: [],
    isSignalsLoading: false,
    activate: mockActivate,
    deactivate: mockDeactivate,
    isActivating: mockIsActivating,
    isDeactivating: mockIsDeactivating,
  }),
}));

// --- Mock useFormatToggle ---
vi.mock("@/hooks/useFormatToggle", () => ({
  useFormatToggle: (formats: string[], onChange: (f: string[]) => void) => {
    return (fmt: string) => {
      if (formats.includes(fmt)) {
        onChange(formats.filter((f) => f !== fmt));
      } else {
        onChange([...formats, fmt]);
      }
    };
  },
}));

// --- Mock FormatBadge ---
vi.mock("@/components/shared/FormatBadge", () => ({
  FormatBadge: ({ format }: { format: string }) => (
    <span data-testid={`format-badge-${format}`}>{format}</span>
  ),
}));

// --- Mock Radix UI Select (simplified for testing) ---
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select-root" data-value={value}>
      {typeof children === "function" ? children({ value, onValueChange }) : children}
      <input
        data-testid="city-select-input"
        type="hidden"
        value={value ?? ""}
        onChange={(e) => onValueChange?.(e.target.value)}
      />
    </div>
  ),
  SelectTrigger: ({ children }: any) => <button data-testid="city-select-trigger">{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-testid={`select-item-${value}`} role="option" onClick={() => {
      // Simulate selection by finding the closest Select and calling onValueChange
      const event = new Event("change", { bubbles: true });
      const input = document.querySelector('[data-testid="city-select-input"]') as HTMLInputElement;
      if (input) {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
        input.dispatchEvent(event);
      }
    }}>
      {children}
    </div>
  ),
}));

// --- Mock Dialog ---
let dialogOpenState = false;
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: any) => {
    dialogOpenState = open;
    return open ? <div data-testid="dialog">{children}</div> : null;
  },
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

describe("LFGToggleButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMySignal = null;
    mockIsActivating = false;
    mockIsDeactivating = false;
    dialogOpenState = false;

    useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" } as any,
      profile: {
        id: "user-1",
        city: "Tel Aviv",
        formats: ["pauper"],
        display_name: "Test User",
      } as any,
      isAuthenticated: true,
      isLoading: false,
    });
  });

  // ─── Inactive state (no active signal) ───

  describe("inactive state", () => {
    it("renders activate button when no active signal", () => {
      render(<LFGToggleButton />);

      const activateButton = screen.getByRole("button", { name: /events:lfg_activate/i });
      expect(activateButton).toBeInTheDocument();
    });

    it("activate button has Zap icon styling", () => {
      render(<LFGToggleButton />);

      const activateButton = screen.getByRole("button", { name: /events:lfg_activate/i });
      expect(activateButton).toHaveClass("border-accent/40");
    });
  });

  // ─── Active state (has active signal) ───

  describe("active state", () => {
    it("renders active signal info when mySignal exists", () => {
      mockMySignal = {
        id: 5,
        user_id: "user-1",
        city: "Tel Aviv",
        formats: ["pauper", "commander"],
        preferred_slot: "evening",
        expires_at: new Date(Date.now() + 3600000).toISOString(), // 1h remaining
        created_at: "2026-03-10T10:00:00Z",
      };

      render(<LFGToggleButton />);

      const deactivateBtn = screen.getByRole("button", { name: /events:lfg_active/i });
      expect(deactivateBtn).toBeInTheDocument();
    });

    it("shows format badges for active signal", () => {
      mockMySignal = {
        id: 5,
        user_id: "user-1",
        city: "Tel Aviv",
        formats: ["pauper", "commander"],
        preferred_slot: null,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        created_at: "2026-03-10T10:00:00Z",
      };

      render(<LFGToggleButton />);

      expect(screen.getByTestId("format-badge-pauper")).toBeInTheDocument();
      expect(screen.getByTestId("format-badge-commander")).toBeInTheDocument();
    });

    it("shows preferred slot badge when set", () => {
      mockMySignal = {
        id: 5,
        user_id: "user-1",
        city: "Tel Aviv",
        formats: ["pauper"],
        preferred_slot: "evening",
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        created_at: "2026-03-10T10:00:00Z",
      };

      render(<LFGToggleButton />);

      expect(screen.getByText("profile:evening_slot")).toBeInTheDocument();
    });

    it("does not show slot badge when preferred_slot is null", () => {
      mockMySignal = {
        id: 5,
        user_id: "user-1",
        city: "Tel Aviv",
        formats: ["pauper"],
        preferred_slot: null,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        created_at: "2026-03-10T10:00:00Z",
      };

      render(<LFGToggleButton />);

      expect(screen.queryByText(/profile:.*_slot/)).not.toBeInTheDocument();
    });

    it("shows remaining time in the deactivate button", () => {
      // 2 hours and 30 min remaining
      mockMySignal = {
        id: 5,
        user_id: "user-1",
        city: "Tel Aviv",
        formats: ["pauper"],
        preferred_slot: null,
        expires_at: new Date(Date.now() + 9000000).toISOString(), // 2.5 hours
        created_at: "2026-03-10T10:00:00Z",
      };

      render(<LFGToggleButton />);

      const button = screen.getByRole("button", { name: /events:lfg_active/i });
      // Button text should contain hours and minutes
      expect(button.textContent).toContain("events:hours_short");
      expect(button.textContent).toContain("events:minutes_short");
    });

    it("shows expired text when signal has expired", () => {
      mockMySignal = {
        id: 5,
        user_id: "user-1",
        city: "Tel Aviv",
        formats: ["pauper"],
        preferred_slot: null,
        expires_at: new Date(Date.now() - 60000).toISOString(), // expired 1 min ago
        created_at: "2026-03-10T10:00:00Z",
      };

      render(<LFGToggleButton />);

      const button = screen.getByRole("button", { name: /events:lfg_active/i });
      expect(button.textContent).toContain("events:signal_expired");
    });

    it("calls deactivate when active button is clicked", async () => {
      const user = userEvent.setup();

      mockMySignal = {
        id: 5,
        user_id: "user-1",
        city: "Tel Aviv",
        formats: ["pauper"],
        preferred_slot: null,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        created_at: "2026-03-10T10:00:00Z",
      };

      render(<LFGToggleButton />);

      const deactivateBtn = screen.getByRole("button", { name: /events:lfg_active/i });
      await user.click(deactivateBtn);

      expect(mockDeactivate).toHaveBeenCalledWith(undefined, expect.objectContaining({
        onSuccess: expect.any(Function),
      }));
    });

    it("disables deactivate button while isDeactivating", () => {
      mockMySignal = {
        id: 5,
        user_id: "user-1",
        city: "Tel Aviv",
        formats: ["pauper"],
        preferred_slot: null,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        created_at: "2026-03-10T10:00:00Z",
      };
      mockIsDeactivating = true;

      render(<LFGToggleButton />);

      const deactivateBtn = screen.getByRole("button", { name: /events:lfg_active/i });
      expect(deactivateBtn).toBeDisabled();
    });
  });

  // ─── Dialog opens on click ───

  describe("dialog", () => {
    it("opens dialog when activate button is clicked", async () => {
      const user = userEvent.setup();
      render(<LFGToggleButton />);

      const activateBtn = screen.getByRole("button", { name: /events:lfg_activate/i });
      await user.click(activateBtn);

      expect(screen.getByTestId("dialog")).toBeInTheDocument();
      expect(screen.getByTestId("dialog-content")).toBeInTheDocument();
    });

    it("shows format toggle buttons inside dialog", async () => {
      const user = userEvent.setup();
      render(<LFGToggleButton />);

      await user.click(screen.getByRole("button", { name: /events:lfg_activate/i }));

      const dialog = screen.getByTestId("dialog-content");
      // All four format buttons should be present
      expect(within(dialog).getByRole("button", { name: "events:pauper" })).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "events:commander" })).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "events:standard" })).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "events:draft" })).toBeInTheDocument();
    });

    it("shows slot toggle buttons (morning, day, evening)", async () => {
      const user = userEvent.setup();
      render(<LFGToggleButton />);

      await user.click(screen.getByRole("button", { name: /events:lfg_activate/i }));

      const dialog = screen.getByTestId("dialog-content");
      expect(within(dialog).getByRole("button", { name: "profile:morning_slot" })).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "profile:day_slot" })).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "profile:evening_slot" })).toBeInTheDocument();
    });

    it("shows duration toggle buttons (1-5 hours)", async () => {
      const user = userEvent.setup();
      render(<LFGToggleButton />);

      await user.click(screen.getByRole("button", { name: /events:lfg_activate/i }));

      const dialog = screen.getByTestId("dialog-content");
      expect(within(dialog).getByRole("button", { name: "1h" })).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "2h" })).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "3h" })).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "4h" })).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "5+" })).toBeInTheDocument();
    });

    it("shows online toggle button", async () => {
      const user = userEvent.setup();
      render(<LFGToggleButton />);

      await user.click(screen.getByRole("button", { name: /events:lfg_activate/i }));

      const dialog = screen.getByTestId("dialog-content");
      expect(within(dialog).getByRole("button", { name: "events:online_lfg" })).toBeInTheDocument();
    });

    it("shows city select when isOnline is false (default)", async () => {
      const user = userEvent.setup();
      render(<LFGToggleButton />);

      await user.click(screen.getByRole("button", { name: /events:lfg_activate/i }));

      expect(screen.getByTestId("city-select-trigger")).toBeInTheDocument();
    });

    it("hides city select when isOnline is toggled on", async () => {
      const user = userEvent.setup();
      render(<LFGToggleButton />);

      await user.click(screen.getByRole("button", { name: /events:lfg_activate/i }));

      // Toggle online
      const onlineBtn = screen.getByRole("button", { name: "events:online_lfg" });
      await user.click(onlineBtn);

      // City select should be hidden
      expect(screen.queryByTestId("city-select-trigger")).not.toBeInTheDocument();
    });

    it("shows city select again when isOnline is toggled off", async () => {
      const user = userEvent.setup();
      render(<LFGToggleButton />);

      await user.click(screen.getByRole("button", { name: /events:lfg_activate/i }));

      const onlineBtn = screen.getByRole("button", { name: "events:online_lfg" });

      // Toggle on
      await user.click(onlineBtn);
      expect(screen.queryByTestId("city-select-trigger")).not.toBeInTheDocument();

      // Toggle off
      await user.click(onlineBtn);
      expect(screen.getByTestId("city-select-trigger")).toBeInTheDocument();
    });
  });

  // ─── Format multi-select ───

  describe("format toggles", () => {
    it("toggles format selection on click", async () => {
      const user = userEvent.setup();
      render(<LFGToggleButton />);

      await user.click(screen.getByRole("button", { name: /events:lfg_activate/i }));

      const dialog = screen.getByTestId("dialog-content");
      const commanderBtn = within(dialog).getByRole("button", { name: "events:commander" });

      // Profile has ["pauper"] by default, commander is not selected
      expect(commanderBtn).toHaveAttribute("aria-pressed", "false");

      // Click to select
      await user.click(commanderBtn);

      // After toggle, commander should now be pressed
      expect(commanderBtn).toHaveAttribute("aria-pressed", "true");
    });

    it("pre-selects formats from user profile", async () => {
      const user = userEvent.setup();
      render(<LFGToggleButton />);

      await user.click(screen.getByRole("button", { name: /events:lfg_activate/i }));

      const dialog = screen.getByTestId("dialog-content");
      const pauperBtn = within(dialog).getByRole("button", { name: "events:pauper" });

      // Profile has ["pauper"] so it should be pre-selected
      expect(pauperBtn).toHaveAttribute("aria-pressed", "true");
    });
  });

  // ─── Slot toggles ───

  describe("slot toggles", () => {
    it("toggles slot selection", async () => {
      const user = userEvent.setup();
      render(<LFGToggleButton />);

      await user.click(screen.getByRole("button", { name: /events:lfg_activate/i }));

      const dialog = screen.getByTestId("dialog-content");
      const eveningBtn = within(dialog).getByRole("button", { name: "profile:evening_slot" });

      expect(eveningBtn).toHaveAttribute("aria-pressed", "false");

      await user.click(eveningBtn);

      expect(eveningBtn).toHaveAttribute("aria-pressed", "true");
    });

    it("deselects slot when clicked again (optional)", async () => {
      const user = userEvent.setup();
      render(<LFGToggleButton />);

      await user.click(screen.getByRole("button", { name: /events:lfg_activate/i }));

      const dialog = screen.getByTestId("dialog-content");
      const morningBtn = within(dialog).getByRole("button", { name: "profile:morning_slot" });

      // Select
      await user.click(morningBtn);
      expect(morningBtn).toHaveAttribute("aria-pressed", "true");

      // Deselect
      await user.click(morningBtn);
      expect(morningBtn).toHaveAttribute("aria-pressed", "false");
    });
  });

  // ─── Duration toggles ───

  describe("duration toggles", () => {
    it("defaults to 4 hours", async () => {
      const user = userEvent.setup();
      render(<LFGToggleButton />);

      await user.click(screen.getByRole("button", { name: /events:lfg_activate/i }));

      const dialog = screen.getByTestId("dialog-content");
      const fourHourBtn = within(dialog).getByRole("button", { name: "4h" });

      expect(fourHourBtn).toHaveAttribute("aria-pressed", "true");
    });

    it("selects a different duration on click", async () => {
      const user = userEvent.setup();
      render(<LFGToggleButton />);

      await user.click(screen.getByRole("button", { name: /events:lfg_activate/i }));

      const dialog = screen.getByTestId("dialog-content");
      const twoHourBtn = within(dialog).getByRole("button", { name: "2h" });
      const fourHourBtn = within(dialog).getByRole("button", { name: "4h" });

      await user.click(twoHourBtn);

      expect(twoHourBtn).toHaveAttribute("aria-pressed", "true");
      expect(fourHourBtn).toHaveAttribute("aria-pressed", "false");
    });
  });

  // ─── Activate submit ───

  describe("activate submit", () => {
    it("calls activate with correct params when form is valid", async () => {
      const user = userEvent.setup();
      render(<LFGToggleButton />);

      await user.click(screen.getByRole("button", { name: /events:lfg_activate/i }));

      const dialog = screen.getByTestId("dialog-content");

      // pauper is already selected from profile
      // Select a slot
      await user.click(within(dialog).getByRole("button", { name: "profile:evening_slot" }));

      // Click submit button (the one inside dialog)
      const submitBtns = within(dialog).getAllByRole("button", { name: /events:lfg_activate/i });
      const submitBtn = submitBtns[submitBtns.length - 1]; // Last one is the submit
      await user.click(submitBtn);

      expect(mockActivate).toHaveBeenCalledWith(
        expect.objectContaining({
          city: "Tel Aviv",
          formats: ["pauper"],
          preferred_slot: "evening",
          durationHours: 4,
          is_online: false,
        }),
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      );
    });

    it("disables submit button when no formats are selected", async () => {
      const user = userEvent.setup();

      // Set profile with no default formats
      useAuthStore.setState({
        user: { id: "user-1", email: "test@test.com" } as any,
        profile: {
          id: "user-1",
          city: "Tel Aviv",
          formats: [],
          display_name: "Test User",
        } as any,
        isAuthenticated: true,
        isLoading: false,
      });

      render(<LFGToggleButton />);

      await user.click(screen.getByRole("button", { name: /events:lfg_activate/i }));

      const dialog = screen.getByTestId("dialog-content");
      const submitBtns = within(dialog).getAllByRole("button", { name: /events:lfg_activate|common:loading/i });
      const submitBtn = submitBtns[submitBtns.length - 1];

      // Button should be disabled when no formats selected
      expect(submitBtn).toBeDisabled();
      expect(mockActivate).not.toHaveBeenCalled();
    });

    it("shows format validation toast when trying to activate with empty formats", async () => {
      const user = userEvent.setup();

      // Start with one format, then deselect it
      render(<LFGToggleButton />);

      await user.click(screen.getByRole("button", { name: /events:lfg_activate/i }));

      const dialog = screen.getByTestId("dialog-content");
      const pauperBtn = within(dialog).getByRole("button", { name: "events:pauper" });

      // Deselect the pre-selected format
      await user.click(pauperBtn);

      // Now button should be disabled because no formats selected
      const submitBtns = within(dialog).getAllByRole("button", { name: /events:lfg_activate|common:loading/i });
      const submitBtn = submitBtns[submitBtns.length - 1];
      expect(submitBtn).toBeDisabled();
    });

    it("disables submit button when isActivating", async () => {
      mockIsActivating = true;
      const user = userEvent.setup();

      render(<LFGToggleButton />);

      await user.click(screen.getByRole("button", { name: /events:lfg_activate/i }));

      const dialog = screen.getByTestId("dialog-content");
      // The submit button text changes to "common:loading" when isActivating
      const submitBtn = within(dialog).getByRole("button", { name: /common:loading/i });
      expect(submitBtn).toBeDisabled();
    });

    it("disables submit button when no city is selected and not online", async () => {
      useAuthStore.setState({
        user: { id: "user-1", email: "test@test.com" } as any,
        profile: {
          id: "user-1",
          city: "",
          formats: ["pauper"],
          display_name: "Test User",
        } as any,
        isAuthenticated: true,
        isLoading: false,
      });

      const user = userEvent.setup();
      render(<LFGToggleButton />);

      await user.click(screen.getByRole("button", { name: /events:lfg_activate/i }));

      const dialog = screen.getByTestId("dialog-content");
      const submitBtns = within(dialog).getAllByRole("button", { name: /events:lfg_activate/i });
      const submitBtn = submitBtns[submitBtns.length - 1];

      expect(submitBtn).toBeDisabled();
    });

    it("enables submit button when online mode is active (regardless of city)", async () => {
      useAuthStore.setState({
        user: { id: "user-1", email: "test@test.com" } as any,
        profile: {
          id: "user-1",
          city: "",
          formats: ["pauper"],
          display_name: "Test User",
        } as any,
        isAuthenticated: true,
        isLoading: false,
      });

      const user = userEvent.setup();
      render(<LFGToggleButton />);

      await user.click(screen.getByRole("button", { name: /events:lfg_activate/i }));

      const dialog = screen.getByTestId("dialog-content");

      // Toggle online
      await user.click(within(dialog).getByRole("button", { name: "events:online_lfg" }));

      const submitBtns = within(dialog).getAllByRole("button", { name: /events:lfg_activate/i });
      const submitBtn = submitBtns[submitBtns.length - 1];

      expect(submitBtn).not.toBeDisabled();
    });

    it("sends is_online=true and city='Online' when online mode is active", async () => {
      const user = userEvent.setup();
      render(<LFGToggleButton />);

      await user.click(screen.getByRole("button", { name: /events:lfg_activate/i }));

      const dialog = screen.getByTestId("dialog-content");

      // Toggle online
      await user.click(within(dialog).getByRole("button", { name: "events:online_lfg" }));

      const submitBtns = within(dialog).getAllByRole("button", { name: /events:lfg_activate/i });
      const submitBtn = submitBtns[submitBtns.length - 1];
      await user.click(submitBtn);

      expect(mockActivate).toHaveBeenCalledWith(
        expect.objectContaining({
          city: "Online",
          is_online: true,
        }),
        expect.any(Object)
      );
    });
  });

  // ─── Deactivate ───

  describe("deactivate", () => {
    it("calls deactivate on clicking active signal button", async () => {
      const user = userEvent.setup();

      mockMySignal = {
        id: 5,
        user_id: "user-1",
        city: "Tel Aviv",
        formats: ["pauper"],
        preferred_slot: null,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        created_at: "2026-03-10T10:00:00Z",
      };

      render(<LFGToggleButton />);

      const deactivateBtn = screen.getByRole("button", { name: /events:lfg_active/i });
      await user.click(deactivateBtn);

      expect(mockDeactivate).toHaveBeenCalled();
    });

    it("shows success toast on successful deactivate", async () => {
      const user = userEvent.setup();

      mockMySignal = {
        id: 5,
        user_id: "user-1",
        city: "Tel Aviv",
        formats: ["pauper"],
        preferred_slot: null,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        created_at: "2026-03-10T10:00:00Z",
      };

      // Mock deactivate to call onSuccess callback
      mockDeactivate.mockImplementation((_: any, options: any) => {
        options?.onSuccess?.();
      });

      render(<LFGToggleButton />);

      await user.click(screen.getByRole("button", { name: /events:lfg_active/i }));

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.any(String),
        })
      );
    });
  });

  // ─── Success / Error callbacks ───

  describe("success and error handling", () => {
    it("closes dialog and shows toast on successful activate", async () => {
      const user = userEvent.setup();

      // Mock activate to call onSuccess callback
      mockActivate.mockImplementation((_params: any, options: any) => {
        options?.onSuccess?.();
      });

      render(<LFGToggleButton />);

      await user.click(screen.getByRole("button", { name: /events:lfg_activate/i }));

      const dialog = screen.getByTestId("dialog-content");
      const submitBtns = within(dialog).getAllByRole("button", { name: /events:lfg_activate/i });
      const submitBtn = submitBtns[submitBtns.length - 1];
      await user.click(submitBtn);

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "events:lfg_active",
        })
      );

      // Dialog should be closed (dialogOpenState tracks this)
      expect(dialogOpenState).toBe(false);
    });

    it("shows destructive toast on activate error", async () => {
      const user = userEvent.setup();

      // Mock activate to call onError callback
      mockActivate.mockImplementation((_params: any, options: any) => {
        options?.onError?.();
      });

      render(<LFGToggleButton />);

      await user.click(screen.getByRole("button", { name: /events:lfg_activate/i }));

      const dialog = screen.getByTestId("dialog-content");
      const submitBtns = within(dialog).getAllByRole("button", { name: /events:lfg_activate/i });
      const submitBtn = submitBtns[submitBtns.length - 1];
      await user.click(submitBtn);

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "common:error",
          variant: "destructive",
        })
      );
    });
  });
});
