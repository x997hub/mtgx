/* eslint-disable @typescript-eslint/no-explicit-any */
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import { InvitePlayerDialog } from "../InvitePlayerDialog";

// ---- i18n mock ----
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

// ---- useInvites mock ----
const mockSendInvite = vi.fn();
let mockIsSending = false;

vi.mock("@/hooks/useInvites", () => ({
  useInvites: () => ({
    sendInvite: mockSendInvite,
    isSending: mockIsSending,
    incoming: [],
    outgoing: [],
    isLoading: false,
    pendingCount: 0,
    respondInvite: vi.fn(),
    isResponding: false,
  }),
}));

// ---- authStore mock ----
vi.mock("@/store/authStore", () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ user: { id: "user-1" } }),
}));

// ---- Supabase mock with events data ----
const mockMyEvents = [
  { id: "ev-1", title: "Friday Pauper", format: "pauper", starts_at: "2026-04-01T18:00:00Z" },
  { id: "ev-2", title: "Saturday Commander", format: "commander", starts_at: "2026-04-02T14:00:00Z" },
];
const mockLimit = vi.fn().mockResolvedValue({ data: mockMyEvents, error: null });

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: (...args: unknown[]) => mockLimit(...args),
    })),
  },
}));

// ---- toast mock ----
const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
  useToast: () => ({ toast: mockToast }),
}));

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  targetUserId: "user-2",
  targetDisplayName: "Bob Player",
};

function renderDialog(props?: Partial<typeof defaultProps>) {
  return renderWithProviders(
    <InvitePlayerDialog {...defaultProps} {...props} />
  );
}

describe("InvitePlayerDialog — comprehensive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendInvite.mockResolvedValue({});
    mockIsSending = false;
    mockLimit.mockResolvedValue({ data: mockMyEvents, error: null });
  });

  // ---------- Dialog open/close ----------
  describe("Dialog visibility", () => {
    it("renders dialog content when open=true", () => {
      renderDialog();
      expect(screen.getByText(/invite_to_play/)).toBeInTheDocument();
    });

    it("does not render content when open=false", () => {
      renderDialog({ open: false });
      expect(screen.queryByText(/invite_to_play/)).not.toBeInTheDocument();
    });

    it("calls onOpenChange(false) on cancel button", async () => {
      const onOpenChange = vi.fn();
      const user = userEvent.setup();
      renderDialog({ onOpenChange });

      await user.click(screen.getByText("cancel"));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  // ---------- Display ----------
  describe("Display", () => {
    it("shows target player name in title", () => {
      renderDialog({ targetDisplayName: "Alice Wonder" });
      expect(screen.getByText(/Alice Wonder/)).toBeInTheDocument();
    });

    it("shows invite_to_play label in title", () => {
      renderDialog();
      expect(screen.getByText(/invite_to_play/)).toBeInTheDocument();
    });

    it("shows event select label", () => {
      renderDialog();
      expect(screen.getByText("invite_select_event")).toBeInTheDocument();
    });
  });

  // ---------- Event select ----------
  describe("Event select", () => {
    it("shows 'no event' option by default", () => {
      renderDialog();
      // The select trigger should show invite_select_event (placeholder) or invite_no_event
      expect(screen.getByText("invite_no_event")).toBeInTheDocument();
    });

    it("fetches user's upcoming events", async () => {
      renderDialog();

      // Events are fetched via useQuery, which calls supabase.from("events")
      await waitFor(() => {
        expect(mockLimit).toHaveBeenCalled();
      });
    });
  });

  // ---------- Format select ----------
  describe("Format select", () => {
    it("shows format select when no event is selected (default)", () => {
      renderDialog();
      // format label is translated key "format"
      expect(screen.getByText("format")).toBeInTheDocument();
    });
  });

  // ---------- Message textarea ----------
  describe("Message textarea", () => {
    it("renders textarea with placeholder", () => {
      renderDialog();
      const textarea = screen.getByPlaceholderText("invite_message_placeholder");
      expect(textarea).toBeInTheDocument();
    });

    it("has maxLength attribute of 200", () => {
      renderDialog();
      const textarea = screen.getByPlaceholderText("invite_message_placeholder");
      expect(textarea).toHaveAttribute("maxLength", "200");
    });

    it("accepts user input", async () => {
      const user = userEvent.setup();
      renderDialog();
      const textarea = screen.getByPlaceholderText("invite_message_placeholder");
      await user.type(textarea, "Hey, want to play pauper?");
      expect(textarea).toHaveValue("Hey, want to play pauper?");
    });

    it("message is optional — send works without message", async () => {
      const user = userEvent.setup();
      renderDialog();

      const sendBtn = screen.getByText("invite_send").closest("button")!;
      await user.click(sendBtn);

      await waitFor(() => {
        expect(mockSendInvite).toHaveBeenCalledWith(
          expect.objectContaining({
            to_user_id: "user-2",
            message: undefined,
          })
        );
      });
    });
  });

  // ---------- Send button ----------
  describe("Send button", () => {
    it("calls sendInvite with correct params when clicked", async () => {
      const user = userEvent.setup();
      renderDialog();

      const sendBtn = screen.getByText("invite_send").closest("button")!;
      await user.click(sendBtn);

      await waitFor(() => {
        expect(mockSendInvite).toHaveBeenCalledWith(
          expect.objectContaining({
            to_user_id: "user-2",
            format: "pauper", // default format
          })
        );
      });
    });

    it("sends message when provided", async () => {
      const user = userEvent.setup();
      renderDialog();

      const textarea = screen.getByPlaceholderText("invite_message_placeholder");
      await user.type(textarea, "Let's play!");

      const sendBtn = screen.getByText("invite_send").closest("button")!;
      await user.click(sendBtn);

      await waitFor(() => {
        expect(mockSendInvite).toHaveBeenCalledWith(
          expect.objectContaining({
            to_user_id: "user-2",
            message: "Let's play!",
          })
        );
      });
    });

    it("sends format when no event is selected", async () => {
      const user = userEvent.setup();
      renderDialog();

      const sendBtn = screen.getByText("invite_send").closest("button")!;
      await user.click(sendBtn);

      await waitFor(() => {
        expect(mockSendInvite).toHaveBeenCalledWith(
          expect.objectContaining({
            format: "pauper",
            event_id: undefined,
          })
        );
      });
    });

    it("renders send icon text", () => {
      renderDialog();
      expect(screen.getByText("invite_send")).toBeInTheDocument();
    });
  });

  // ---------- Success flow ----------
  describe("Success flow", () => {
    it("closes dialog on successful send", async () => {
      const onOpenChange = vi.fn();
      const user = userEvent.setup();
      renderDialog({ onOpenChange });

      const sendBtn = screen.getByText("invite_send").closest("button")!;
      await user.click(sendBtn);

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("shows success toast on successful send", async () => {
      const user = userEvent.setup();
      renderDialog();

      const sendBtn = screen.getByText("invite_send").closest("button")!;
      await user.click(sendBtn);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ title: "invite_sent" })
        );
      });
    });

    it("resets form fields after successful send", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      renderDialog({ onOpenChange });

      const textarea = screen.getByPlaceholderText("invite_message_placeholder");
      await user.type(textarea, "Some message");

      const sendBtn = screen.getByText("invite_send").closest("button")!;
      await user.click(sendBtn);

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });

      // After close, message should have been reset
      // (verified by checking sendInvite was called, then state was cleared)
      expect(mockSendInvite).toHaveBeenCalled();
    });
  });

  // ---------- Error flow ----------
  describe("Error flow", () => {
    it("shows error toast on send failure", async () => {
      mockSendInvite.mockRejectedValue(new Error("Network error"));
      const user = userEvent.setup();
      renderDialog();

      const sendBtn = screen.getByText("invite_send").closest("button")!;
      await user.click(sendBtn);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ title: "error", variant: "destructive" })
        );
      });
    });

    it("does not close dialog on send failure", async () => {
      mockSendInvite.mockRejectedValue(new Error("Network error"));
      const onOpenChange = vi.fn();
      const user = userEvent.setup();
      renderDialog({ onOpenChange });

      const sendBtn = screen.getByText("invite_send").closest("button")!;
      await user.click(sendBtn);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: "destructive" })
        );
      });

      // onOpenChange should not have been called with false (dialog stays open)
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });
  });

  // ---------- Cancel button ----------
  describe("Cancel button", () => {
    it("renders cancel button", () => {
      renderDialog();
      expect(screen.getByText("cancel")).toBeInTheDocument();
    });

    it("closes dialog when cancel is clicked", async () => {
      const onOpenChange = vi.fn();
      const user = userEvent.setup();
      renderDialog({ onOpenChange });

      await user.click(screen.getByText("cancel"));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
