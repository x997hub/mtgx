import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScheduleGrid } from "../ScheduleGrid";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

const DAYS = ["sun", "mon", "tue"];
const SLOTS = ["day", "evening"];
const STATES = ["always", "if_free", "never"] as const;
type State = (typeof STATES)[number];

const STATE_COLORS: Record<State, string> = {
  always: "bg-emerald-600 hover:bg-emerald-500",
  if_free: "bg-amber-600 hover:bg-amber-500",
  never: "bg-gray-700 hover:bg-gray-600",
};

const STATE_LABELS: Record<State, string> = {
  always: "Always",
  if_free: "If free",
  never: "Never",
};

describe("ScheduleGrid", () => {
  it("renders grid with correct days as column headers", () => {
    render(
      <ScheduleGrid
        days={DAYS}
        slots={SLOTS}
        states={[...STATES]}
        stateColors={STATE_COLORS}
        stateLabels={STATE_LABELS}
        value={{}}
      />
    );

    // Day headers
    expect(screen.getByText("sun")).toBeInTheDocument();
    expect(screen.getByText("mon")).toBeInTheDocument();
    expect(screen.getByText("tue")).toBeInTheDocument();
  });

  it("renders grid with correct slot row labels", () => {
    render(
      <ScheduleGrid
        days={DAYS}
        slots={SLOTS}
        states={[...STATES]}
        stateColors={STATE_COLORS}
        stateLabels={STATE_LABELS}
        value={{}}
      />
    );

    // Slot row labels use `${slot}_slot` pattern
    expect(screen.getByText("day_slot")).toBeInTheDocument();
    expect(screen.getByText("evening_slot")).toBeInTheDocument();
  });

  it("renders correct number of grid cells", () => {
    render(
      <ScheduleGrid
        days={DAYS}
        slots={SLOTS}
        states={[...STATES]}
        stateColors={STATE_COLORS}
        stateLabels={STATE_LABELS}
        value={{}}
        onChange={vi.fn()}
      />
    );

    // 3 days x 2 slots = 6 buttons
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(6);
  });

  it("uses last state as default when no value for a cell", () => {
    render(
      <ScheduleGrid
        days={DAYS}
        slots={SLOTS}
        states={[...STATES]}
        stateColors={STATE_COLORS}
        stateLabels={STATE_LABELS}
        value={{}}
        onChange={vi.fn()}
      />
    );

    // Default state is last = "never", title should be "Never"
    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => {
      expect(btn).toHaveAttribute("title", "Never");
    });
  });

  it("applies correct state color from value", () => {
    render(
      <ScheduleGrid
        days={DAYS}
        slots={SLOTS}
        states={[...STATES]}
        stateColors={STATE_COLORS}
        stateLabels={STATE_LABELS}
        value={{ sun_day: "always", mon_evening: "if_free" }}
        onChange={vi.fn()}
      />
    );

    const alwaysBtn = screen.getByTitle("Always");
    expect(alwaysBtn.className).toContain("bg-emerald-600");

    const ifFreeBtn = screen.getByTitle("If free");
    expect(ifFreeBtn.className).toContain("bg-amber-600");
  });

  it("click cycles through states", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ScheduleGrid
        days={["sun"]}
        slots={["day"]}
        states={[...STATES]}
        stateColors={STATE_COLORS}
        stateLabels={STATE_LABELS}
        value={{}}
        onChange={onChange}
      />
    );

    const button = screen.getByRole("button");
    // Default state is "never" (last in states). Click should cycle to "always" (index 0 after wrapping)
    // "never" is at index 2, (2+1) % 3 = 0, so next is "always"
    await user.click(button);

    expect(onChange).toHaveBeenCalledWith({ sun_day: "always" });
  });

  it("click cycles from always to if_free", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ScheduleGrid
        days={["sun"]}
        slots={["day"]}
        states={[...STATES]}
        stateColors={STATE_COLORS}
        stateLabels={STATE_LABELS}
        value={{ sun_day: "always" }}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole("button"));

    expect(onChange).toHaveBeenCalledWith({ sun_day: "if_free" });
  });

  it("click cycles from if_free to never", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ScheduleGrid
        days={["sun"]}
        slots={["day"]}
        states={[...STATES]}
        stateColors={STATE_COLORS}
        stateLabels={STATE_LABELS}
        value={{ sun_day: "if_free" }}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole("button"));

    expect(onChange).toHaveBeenCalledWith({ sun_day: "never" });
  });

  it("read-only mode when no onChange provided", () => {
    render(
      <ScheduleGrid
        days={DAYS}
        slots={SLOTS}
        states={[...STATES]}
        stateColors={STATE_COLORS}
        stateLabels={STATE_LABELS}
        value={{}}
      />
    );

    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it("read-only click does not call onChange", async () => {
    const user = userEvent.setup();

    render(
      <ScheduleGrid
        days={["sun"]}
        slots={["day"]}
        states={[...STATES]}
        stateColors={STATE_COLORS}
        stateLabels={STATE_LABELS}
        value={{}}
      />
    );

    const button = screen.getByRole("button");
    await user.click(button);
    // No error, nothing happened
  });

  it("legend shows all states", () => {
    render(
      <ScheduleGrid
        days={DAYS}
        slots={SLOTS}
        states={[...STATES]}
        stateColors={STATE_COLORS}
        stateLabels={STATE_LABELS}
        value={{}}
      />
    );

    expect(screen.getByText("Always")).toBeInTheDocument();
    expect(screen.getByText("If free")).toBeInTheDocument();
    expect(screen.getByText("Never")).toBeInTheDocument();
  });

  it("preserves other values when clicking a cell", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ScheduleGrid
        days={["sun", "mon"]}
        slots={["day"]}
        states={[...STATES]}
        stateColors={STATE_COLORS}
        stateLabels={STATE_LABELS}
        value={{ sun_day: "always", mon_day: "if_free" }}
        onChange={onChange}
      />
    );

    // Click the "always" button (sun_day)
    const alwaysBtn = screen.getByTitle("Always");
    await user.click(alwaysBtn);

    expect(onChange).toHaveBeenCalledWith({
      sun_day: "if_free",
      mon_day: "if_free",
    });
  });
});
