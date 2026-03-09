import { render, screen } from "@testing-library/react";
import { AttendeeList } from "../AttendeeList";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

function makeAttendee(overrides: Record<string, unknown> = {}) {
  return {
    user_id: "user-1",
    status: "going" as const,
    power_level: null,
    confirmed_at: null,
    checked_in_at: null,
    profiles: { display_name: "Alice", playstyle: null },
    ...overrides,
  };
}

describe("AttendeeList", () => {
  it("renders heading with going count", () => {
    const attendees = [
      makeAttendee({ user_id: "u1", status: "going" }),
      makeAttendee({ user_id: "u2", status: "going" }),
      makeAttendee({ user_id: "u3", status: "maybe" }),
    ];

    render(<AttendeeList attendees={attendees} />);

    // Header shows "attendees (2)" for 2 going
    expect(screen.getByText(/attendees/)).toBeInTheDocument();
    expect(screen.getByText("attendees (2)")).toBeInTheDocument();
  });

  it("renders attendee display names", () => {
    const attendees = [
      makeAttendee({ user_id: "u1", profiles: { display_name: "Alice", playstyle: null } }),
      makeAttendee({ user_id: "u2", profiles: { display_name: "Bob", playstyle: null } }),
    ];

    render(<AttendeeList attendees={attendees} />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows 'unknown' when profile display_name is missing", () => {
    const attendees = [
      makeAttendee({ user_id: "u1", profiles: null }),
    ];

    render(<AttendeeList attendees={attendees} />);

    expect(screen.getByText("common:unknown")).toBeInTheDocument();
  });

  it("groups attendees by status", () => {
    const attendees = [
      makeAttendee({ user_id: "u1", status: "going", profiles: { display_name: "Alice", playstyle: null } }),
      makeAttendee({ user_id: "u2", status: "maybe", profiles: { display_name: "Bob", playstyle: null } }),
      makeAttendee({ user_id: "u3", status: "not_going", profiles: { display_name: "Charlie", playstyle: null } }),
    ];

    render(<AttendeeList attendees={attendees} />);

    // Status group headers
    expect(screen.getByText("going (1)")).toBeInTheDocument();
    expect(screen.getByText("maybe (1)")).toBeInTheDocument();
    expect(screen.getByText("not_going (1)")).toBeInTheDocument();
  });

  it("does not render empty status groups", () => {
    const attendees = [
      makeAttendee({ user_id: "u1", status: "going" }),
    ];

    render(<AttendeeList attendees={attendees} />);

    expect(screen.queryByText("maybe (0)")).not.toBeInTheDocument();
    expect(screen.queryByText(/^not_going/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^waitlisted/)).not.toBeInTheDocument();
  });

  it("renders status badge for each attendee", () => {
    const attendees = [
      makeAttendee({ user_id: "u1", status: "going" }),
      makeAttendee({ user_id: "u2", status: "maybe" }),
    ];

    render(<AttendeeList attendees={attendees} />);

    // Each attendee gets a badge with their status text
    // The status badge uses t(attendee.status) which returns the key
    const goingBadges = screen.getAllByText("going");
    expect(goingBadges.length).toBeGreaterThanOrEqual(1);
    const maybeBadges = screen.getAllByText("maybe");
    expect(maybeBadges.length).toBeGreaterThanOrEqual(1);
  });

  describe("organizer view", () => {
    it("shows 'Confirmed' badge for confirmed going attendees", () => {
      const attendees = [
        makeAttendee({
          user_id: "u1",
          status: "going",
          confirmed_at: "2026-03-08T10:00:00Z",
          checked_in_at: null,
        }),
      ];

      render(<AttendeeList attendees={attendees} isOrganizer={true} />);

      expect(screen.getByText("Confirmed")).toBeInTheDocument();
    });

    it("shows 'Checked in' badge for checked-in attendees", () => {
      const attendees = [
        makeAttendee({
          user_id: "u1",
          status: "going",
          confirmed_at: "2026-03-08T10:00:00Z",
          checked_in_at: "2026-03-08T18:00:00Z",
        }),
      ];

      render(<AttendeeList attendees={attendees} isOrganizer={true} />);

      expect(screen.getByText("Checked in")).toBeInTheDocument();
    });

    it("shows 'Unconfirmed' badge for unconfirmed going attendees", () => {
      const attendees = [
        makeAttendee({
          user_id: "u1",
          status: "going",
          confirmed_at: null,
          checked_in_at: null,
        }),
      ];

      render(<AttendeeList attendees={attendees} isOrganizer={true} />);

      expect(screen.getByText("Unconfirmed")).toBeInTheDocument();
    });

    it("does not show confirmation badges when isOrganizer is false", () => {
      const attendees = [
        makeAttendee({
          user_id: "u1",
          status: "going",
          confirmed_at: "2026-03-08T10:00:00Z",
          checked_in_at: null,
        }),
      ];

      render(<AttendeeList attendees={attendees} isOrganizer={false} />);

      expect(screen.queryByText("Confirmed")).not.toBeInTheDocument();
      expect(screen.queryByText("Unconfirmed")).not.toBeInTheDocument();
      expect(screen.queryByText("Checked in")).not.toBeInTheDocument();
    });

    it("does not show confirmation badges for non-going statuses", () => {
      const attendees = [
        makeAttendee({
          user_id: "u1",
          status: "maybe",
          confirmed_at: null,
          checked_in_at: null,
        }),
      ];

      render(<AttendeeList attendees={attendees} isOrganizer={true} />);

      expect(screen.queryByText("Confirmed")).not.toBeInTheDocument();
      expect(screen.queryByText("Unconfirmed")).not.toBeInTheDocument();
      expect(screen.queryByText("Checked in")).not.toBeInTheDocument();
    });

    it("checked_in takes precedence over confirmed", () => {
      const attendees = [
        makeAttendee({
          user_id: "u1",
          status: "going",
          confirmed_at: "2026-03-08T10:00:00Z",
          checked_in_at: "2026-03-08T18:00:00Z",
        }),
      ];

      render(<AttendeeList attendees={attendees} isOrganizer={true} />);

      // Should show "Checked in" but not "Confirmed"
      expect(screen.getByText("Checked in")).toBeInTheDocument();
      expect(screen.queryByText("Confirmed")).not.toBeInTheDocument();
    });
  });

  it("renders avatar fallback with first letter of name", () => {
    const attendees = [
      makeAttendee({
        user_id: "u1",
        profiles: { display_name: "Alice", playstyle: null },
      }),
    ];

    render(<AttendeeList attendees={attendees} />);

    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("shows '?' for avatar when profile is null", () => {
    const attendees = [
      makeAttendee({ user_id: "u1", profiles: null }),
    ];

    render(<AttendeeList attendees={attendees} />);

    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("renders power level badge when power_level is set", () => {
    const attendees = [
      makeAttendee({ user_id: "u1", power_level: 3 }),
    ];

    render(<AttendeeList attendees={attendees} />);

    // PowerLevelBadge renders the level number and label
    expect(screen.getByText(/Focused/)).toBeInTheDocument();
  });

  it("does not render power level badge when power_level is null", () => {
    const attendees = [
      makeAttendee({ user_id: "u1", power_level: null }),
    ];

    render(<AttendeeList attendees={attendees} />);

    expect(screen.queryByText(/Jank|Casual|Focused|Optimized|cEDH/)).not.toBeInTheDocument();
  });

  it("renders playstyle emoji for casual", () => {
    const attendees = [
      makeAttendee({
        user_id: "u1",
        profiles: { display_name: "Alice", playstyle: "casual" },
      }),
    ];

    render(<AttendeeList attendees={attendees} />);

    // Casual playstyle shows dice emoji
    expect(screen.getByTitle("casual")).toBeInTheDocument();
  });

  it("renders playstyle emoji for competitive", () => {
    const attendees = [
      makeAttendee({
        user_id: "u1",
        profiles: { display_name: "Bob", playstyle: "competitive" },
      }),
    ];

    render(<AttendeeList attendees={attendees} />);

    expect(screen.getByTitle("competitive")).toBeInTheDocument();
  });
});
