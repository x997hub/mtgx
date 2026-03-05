import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "../ErrorBoundary";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

function ProblemChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div data-testid="child">All good</div>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // Suppress React error boundary console.error output
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("shows fallback when child throws", () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
    expect(screen.getByText("error_occurred")).toBeInTheDocument();
    expect(screen.getByText("try_again")).toBeInTheDocument();
  });

  it('"Try again" button resets error state and renders children', async () => {
    const user = userEvent.setup();

    // Use a component whose throw behavior we can control via key remounting
    let shouldThrow = true;
    function ConditionalChild() {
      if (shouldThrow) throw new Error("Boom");
      return <div data-testid="child">Recovered</div>;
    }

    const { rerender } = render(
      <ErrorBoundary>
        <ConditionalChild />
      </ErrorBoundary>
    );

    // Error state should be shown
    expect(screen.getByText("error_occurred")).toBeInTheDocument();

    // Fix the error condition
    shouldThrow = false;

    // Click "try again"
    await user.click(screen.getByText("try_again"));

    // After reset, children should render
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Recovered")).toBeInTheDocument();
  });
});
