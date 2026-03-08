import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import { RecommendedPlayersPanel } from "../RecommendedPlayersPanel";
import type { MtgFormat } from "@/types/database.types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && "count" in opts) return `${key} ${opts.count}`;
      return key;
    },
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const mockSendBulkInvites = vi.fn();

const mockPlayers = [
  {
    user_id: "u1",
    display_name: "Alice",
    city: "Tel Aviv",
    formats: ["pauper", "commander"] as MtgFormat[],
    reliability_score: 1.0,
    played_together: true,
    avatar_url: null,
  },
  {
    user_id: "u2",
    display_name: "Bob",
    city: "Tel Aviv",
    formats: ["draft"] as MtgFormat[],
    reliability_score: 0.9,
    played_together: false,
    avatar_url: "https://example.com/bob.jpg",
  },
  {
    user_id: "u3",
    display_name: "Charlie",
    city: "Herzliya",
    formats: ["standard"] as MtgFormat[],
    reliability_score: 0.8,
    played_together: false,
    avatar_url: null,
  },
];

let mockIsLoading = false;
let mockPlayersData = mockPlayers;

vi.mock("@/hooks/useRecommendedPlayers", () => ({
  useRecommendedPlayers: () => ({
    players: mockPlayersData,
    isLoading: mockIsLoading,
    sendBulkInvites: mockSendBulkInvites,
    isSending: false,
  }),
}));

function renderPanel(props?: Partial<{ eventId: string; onDone: () => void }>) {
  return renderWithProviders(
    <RecommendedPlayersPanel
      eventId={props?.eventId ?? "event-1"}
      onDone={props?.onDone ?? vi.fn()}
    />
  );
}

describe("RecommendedPlayersPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    mockPlayersData = mockPlayers;
  });

  it("shows loading skeletons when loading", () => {
    mockIsLoading = true;
    const { container } = renderPanel();
    // Skeleton elements are rendered (4 total: 1 header + 3 content)
    const skeletons = container.querySelectorAll('[class*="animate-pulse"], [data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  it("shows empty state when no players", () => {
    mockPlayersData = [];
    renderPanel();
    expect(screen.getByText("no_recommended_players")).toBeInTheDocument();
  });

  it("renders done button when no players", () => {
    mockPlayersData = [];
    renderPanel();
    expect(screen.getByText("done")).toBeInTheDocument();
  });

  it("renders player list with display names", () => {
    renderPanel();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
  });

  it("renders format badges for players", () => {
    renderPanel();
    expect(screen.getByText("pauper")).toBeInTheDocument();
    expect(screen.getByText("commander")).toBeInTheDocument();
    expect(screen.getByText("draft")).toBeInTheDocument();
    expect(screen.getByText("standard")).toBeInTheDocument();
  });

  it("shows 'played_together' badge for players who played together", () => {
    renderPanel();
    expect(screen.getByText("played_together")).toBeInTheDocument();
  });

  it("toggles single player selection", async () => {
    const user = userEvent.setup();
    renderPanel();

    // Initially the send button shows count 0
    expect(screen.getByText("send_invitations (0)")).toBeInTheDocument();

    // Click on Alice's row
    await user.click(screen.getByText("Alice"));

    expect(screen.getByText("send_invitations (1)")).toBeInTheDocument();

    // Click again to deselect
    await user.click(screen.getByText("Alice"));

    expect(screen.getByText("send_invitations (0)")).toBeInTheDocument();
  });

  it("toggles select all", async () => {
    const user = userEvent.setup();
    renderPanel();

    // Click select all
    const selectAllBtn = screen.getByText(/select_all/);
    await user.click(selectAllBtn);

    expect(screen.getByText("send_invitations (3)")).toBeInTheDocument();

    // Click select all again to deselect all
    await user.click(selectAllBtn);

    expect(screen.getByText("send_invitations (0)")).toBeInTheDocument();
  });

  it("send button is disabled when none selected", () => {
    renderPanel();
    const sendBtn = screen.getByText("send_invitations (0)").closest("button");
    expect(sendBtn).toBeDisabled();
  });

  it("send button is enabled when players are selected", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByText("Alice"));

    const sendBtn = screen.getByText("send_invitations (1)").closest("button");
    expect(sendBtn).not.toBeDisabled();
  });

  it("calls sendBulkInvites on send", async () => {
    mockSendBulkInvites.mockResolvedValue({ invited: 2 });
    const onDone = vi.fn();
    const user = userEvent.setup();
    renderPanel({ onDone });

    // Select Alice and Bob
    await user.click(screen.getByText("Alice"));
    await user.click(screen.getByText("Bob"));

    // Click send
    const sendBtn = screen.getByText("send_invitations (2)").closest("button")!;
    await user.click(sendBtn);

    expect(mockSendBulkInvites).toHaveBeenCalledWith({
      eventId: "event-1",
      userIds: expect.arrayContaining(["u1", "u2"]),
      message: undefined,
    });
    expect(onDone).toHaveBeenCalled();
  });

  it("shows skip button that calls onDone", async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    renderPanel({ onDone });

    await user.click(screen.getByText("skip"));

    expect(onDone).toHaveBeenCalled();
  });

  it("renders avatar fallback for players without avatar", () => {
    renderPanel();
    // Alice has no avatar, initials "A"
    expect(screen.getByText("A")).toBeInTheDocument();
    // Charlie has no avatar, initials "C"
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("shows select count in select_all button", async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(screen.getByText("select_all (0/3)")).toBeInTheDocument();

    await user.click(screen.getByText("Alice"));

    expect(screen.getByText("select_all (1/3)")).toBeInTheDocument();
  });
});
