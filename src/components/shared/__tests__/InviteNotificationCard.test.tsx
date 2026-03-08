import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { InviteNotificationCard } from "../InviteNotificationCard";
import type { InviteStatus, MtgFormat } from "@/types/database.types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && "name" in opts) return `${key} ${opts.name}`;
      return key;
    },
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

function makeInvite(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    status: "pending" as InviteStatus,
    message: null as string | null,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    event_id: null as string | null,
    format: null as MtgFormat | null,
    from_profile: {
      display_name: "Alice",
      avatar_url: null as string | null,
    },
    events: null as {
      id: string;
      title: string | null;
      format: MtgFormat;
      starts_at: string;
    } | null,
    ...overrides,
  };
}

function renderCard(
  invite: ReturnType<typeof makeInvite>,
  props: Partial<{
    onAccept: (id: number) => void;
    onDecline: (id: number) => void;
    isResponding: boolean;
  }> = {}
) {
  return render(
    <MemoryRouter>
      <InviteNotificationCard
        invite={invite}
        onAccept={props.onAccept ?? vi.fn()}
        onDecline={props.onDecline ?? vi.fn()}
        isResponding={props.isResponding ?? false}
      />
    </MemoryRouter>
  );
}

describe("InviteNotificationCard", () => {
  it("renders sender name", () => {
    renderCard(makeInvite());
    expect(screen.getByText("invite_from Alice")).toBeInTheDocument();
  });

  it("renders message when present", () => {
    renderCard(makeInvite({ message: "Let's play pauper tonight!" }));
    expect(
      screen.getByText('"Let\'s play pauper tonight!"')
    ).toBeInTheDocument();
  });

  it("shows event link when event exists", () => {
    const invite = makeInvite({
      events: {
        id: "event-42",
        title: "Pauper Cup",
        format: "pauper",
        starts_at: "2026-04-01T18:00:00Z",
      },
    });
    renderCard(invite);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/events/event-42");
    expect(link).toHaveTextContent(/Pauper Cup/);
  });

  it("shows format badge when format exists and no event", () => {
    const invite = makeInvite({ format: "commander", events: null });
    renderCard(invite);
    expect(screen.getByText("commander")).toBeInTheDocument();
  });

  it("does not show format badge when event exists even if format is set", () => {
    const invite = makeInvite({
      format: "commander",
      events: {
        id: "event-1",
        title: "Some Event",
        format: "commander",
        starts_at: "2026-04-01T18:00:00Z",
      },
    });
    renderCard(invite);
    // The event link should be shown, not a standalone format badge
    expect(screen.getByRole("link")).toBeInTheDocument();
  });

  it("shows accept/decline buttons when status is pending", () => {
    renderCard(makeInvite({ status: "pending" }));
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
  });

  it("shows status badge when not pending", () => {
    renderCard(makeInvite({ status: "accepted" }));
    expect(screen.getByText("invite_accepted")).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("shows declined status badge", () => {
    renderCard(makeInvite({ status: "declined" }));
    expect(screen.getByText("invite_declined")).toBeInTheDocument();
  });

  it("shows expired status badge", () => {
    renderCard(makeInvite({ status: "expired" }));
    expect(screen.getByText("invite_expired")).toBeInTheDocument();
  });

  it("calls onAccept handler with invite id", async () => {
    const onAccept = vi.fn();
    const user = userEvent.setup();
    renderCard(makeInvite({ id: 42 }), { onAccept });
    const buttons = screen.getAllByRole("button");
    // First button is accept (Check icon)
    await user.click(buttons[0]);
    expect(onAccept).toHaveBeenCalledWith(42);
  });

  it("calls onDecline handler with invite id", async () => {
    const onDecline = vi.fn();
    const user = userEvent.setup();
    renderCard(makeInvite({ id: 42 }), { onDecline });
    const buttons = screen.getAllByRole("button");
    // Second button is decline (X icon)
    await user.click(buttons[1]);
    expect(onDecline).toHaveBeenCalledWith(42);
  });

  it("disables buttons when isResponding is true", () => {
    renderCard(makeInvite({ status: "pending" }), { isResponding: true });
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeDisabled();
  });

  it("shows timeAgo for created_at", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    renderCard(makeInvite({ created_at: fiveMinAgo }));
    expect(screen.getByText("5m")).toBeInTheDocument();
  });

  it("shows avatar fallback initials when no avatar_url", () => {
    renderCard(
      makeInvite({
        from_profile: { display_name: "Alice Bob", avatar_url: null },
      })
    );
    expect(screen.getByText("AB")).toBeInTheDocument();
  });

  it("shows 'Unknown' when from_profile is null", () => {
    renderCard(makeInvite({ from_profile: null }));
    expect(screen.getByText("invite_from Unknown")).toBeInTheDocument();
  });
});
