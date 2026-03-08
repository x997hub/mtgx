import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import { InvitePlayerDialog } from "../InvitePlayerDialog";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

const mockSendInvite = vi.fn();

vi.mock("@/hooks/useInvites", () => ({
  useInvites: () => ({
    sendInvite: mockSendInvite,
    isSending: false,
    incoming: [],
    outgoing: [],
    isLoading: false,
    pendingCount: 0,
    respondInvite: vi.fn(),
    isResponding: false,
  }),
}));

vi.mock("@/store/authStore", () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ user: { id: "user-1" } }),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  targetUserId: "user-2",
  targetDisplayName: "Bob Player",
};

function renderDialog(
  props?: Partial<typeof defaultProps>
) {
  return renderWithProviders(
    <InvitePlayerDialog {...defaultProps} {...props} />
  );
}

describe("InvitePlayerDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendInvite.mockResolvedValue({});
  });

  it("renders dialog when open=true", () => {
    renderDialog();
    expect(screen.getByText(/invite_to_play/)).toBeInTheDocument();
    expect(screen.getByText(/Bob Player/)).toBeInTheDocument();
  });

  it("shows target player name in title", () => {
    renderDialog({ targetDisplayName: "Alice Wonder" });
    expect(screen.getByText(/Alice Wonder/)).toBeInTheDocument();
  });

  it("does not render content when open=false", () => {
    renderDialog({ open: false });
    expect(screen.queryByText(/invite_to_play/)).not.toBeInTheDocument();
  });

  it("shows format select when no event is selected", () => {
    renderDialog();
    expect(screen.getByText("format")).toBeInTheDocument();
  });

  it("message textarea has maxLength 200", () => {
    renderDialog();
    const textarea = screen.getByPlaceholderText("invite_message_placeholder");
    expect(textarea).toHaveAttribute("maxLength", "200");
  });

  it("allows typing a message", async () => {
    const user = userEvent.setup();
    renderDialog();
    const textarea = screen.getByPlaceholderText("invite_message_placeholder");
    await user.type(textarea, "Hey, want to play?");
    expect(textarea).toHaveValue("Hey, want to play?");
  });

  it("calls sendInvite when send button is clicked", async () => {
    const user = userEvent.setup();
    renderDialog();

    const sendBtn = screen.getByText("invite_send").closest("button")!;
    await user.click(sendBtn);

    await waitFor(() => {
      expect(mockSendInvite).toHaveBeenCalledWith(
        expect.objectContaining({
          to_user_id: "user-2",
          format: "pauper",
        })
      );
    });
  });

  it("calls onOpenChange(false) on cancel", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onOpenChange });

    await user.click(screen.getByText("cancel"));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

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
});
