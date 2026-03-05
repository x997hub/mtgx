import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RSVPDialog } from "../RSVPDialog";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

const mockMutateAsync = vi.fn();

vi.mock("@/hooks/useRSVP", () => ({
  useRSVP: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/components/ui/use-toast", () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

describe("RSVPDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    eventId: "event-1",
    currentStatus: null as "going" | "maybe" | "not_going" | null | undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({});
  });

  it("renders 3 status buttons", () => {
    render(<RSVPDialog {...defaultProps} />);

    expect(screen.getByRole("button", { name: "going" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "maybe" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "not_going" })).toBeInTheDocument();
  });

  it("calls mutateAsync on button click", async () => {
    const user = userEvent.setup();
    render(<RSVPDialog {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "going" }));

    expect(mockMutateAsync).toHaveBeenCalledWith({
      eventId: "event-1",
      status: "going",
    });
  });

  it("closes dialog on success", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<RSVPDialog {...defaultProps} onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole("button", { name: "maybe" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows toast on error and does not close", async () => {
    const { toast } = await import("@/components/ui/use-toast");
    mockMutateAsync.mockRejectedValue(new Error("fail"));

    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<RSVPDialog {...defaultProps} onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole("button", { name: "going" }));

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" })
    );
    // onOpenChange(false) should NOT have been called
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("disables buttons when isPending", async () => {
    // Re-mock with isPending=true
    const mod = await import("@/hooks/useRSVP");
    const originalUseRSVP = mod.useRSVP;
    (mod as any).useRSVP = () => ({
      mutateAsync: mockMutateAsync,
      isPending: true,
    });

    render(<RSVPDialog {...defaultProps} />);

    // Restore original after render
    (mod as any).useRSVP = originalUseRSVP;

    expect(screen.getByRole("button", { name: "going" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "maybe" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "not_going" })).toBeDisabled();
  });
});
