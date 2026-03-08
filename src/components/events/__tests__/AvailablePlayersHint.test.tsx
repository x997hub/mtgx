import { render, screen } from "@testing-library/react";
import { AvailablePlayersHint } from "../AvailablePlayersHint";

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

let mockCount: number | undefined | null = 5;

vi.mock("@/hooks/useAvailablePlayersCount", () => ({
  useAvailablePlayersCount: () => ({
    data: mockCount,
  }),
}));

describe("AvailablePlayersHint", () => {
  beforeEach(() => {
    mockCount = 5;
  });

  it("shows count when available", () => {
    render(
      <AvailablePlayersHint
        city="Tel Aviv"
        format="pauper"
        startsAt="2026-04-01T18:00:00Z"
      />
    );
    expect(
      screen.getByText("available_players_hint 5")
    ).toBeInTheDocument();
  });

  it("hidden when count is 0", () => {
    mockCount = 0;
    const { container } = render(
      <AvailablePlayersHint
        city="Tel Aviv"
        format="pauper"
        startsAt="2026-04-01T18:00:00Z"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("hidden when count is null", () => {
    mockCount = null;
    const { container } = render(
      <AvailablePlayersHint
        city="Tel Aviv"
        format="pauper"
        startsAt="2026-04-01T18:00:00Z"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("hidden when count is undefined", () => {
    mockCount = undefined;
    const { container } = render(
      <AvailablePlayersHint
        city="Tel Aviv"
        format="pauper"
        startsAt="2026-04-01T18:00:00Z"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("handles empty city gracefully", () => {
    mockCount = 0;
    const { container } = render(
      <AvailablePlayersHint
        city=""
        format="pauper"
        startsAt="2026-04-01T18:00:00Z"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("handles empty format gracefully", () => {
    mockCount = 0;
    const { container } = render(
      <AvailablePlayersHint
        city="Tel Aviv"
        format=""
        startsAt="2026-04-01T18:00:00Z"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("handles empty startsAt gracefully", () => {
    mockCount = 0;
    const { container } = render(
      <AvailablePlayersHint
        city="Tel Aviv"
        format="pauper"
        startsAt=""
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows large count", () => {
    mockCount = 42;
    render(
      <AvailablePlayersHint
        city="Herzliya"
        format="commander"
        startsAt="2026-04-01T10:00:00Z"
      />
    );
    expect(
      screen.getByText("available_players_hint 42")
    ).toBeInTheDocument();
  });
});
