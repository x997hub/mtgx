import { render, screen } from "@testing-library/react";
import { FormatBadge } from "../FormatBadge";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

describe("FormatBadge", () => {
  it("renders the format name from translation", () => {
    render(<FormatBadge format="pauper" />);
    expect(screen.getByText("pauper")).toBeInTheDocument();
  });

  it("applies design-system color class for pauper", () => {
    render(<FormatBadge format="pauper" />);
    const badge = screen.getByText("pauper");
    expect(badge.className).toContain("bg-format-pauper");
    expect(badge.className).toContain("text-white");
  });

  it("applies design-system color class for commander", () => {
    render(<FormatBadge format="commander" />);
    const badge = screen.getByText("commander");
    expect(badge.className).toContain("bg-format-commander");
    expect(badge.className).toContain("text-white");
  });

  it("applies design-system color class for standard", () => {
    render(<FormatBadge format="standard" />);
    const badge = screen.getByText("standard");
    expect(badge.className).toContain("bg-format-standard");
    expect(badge.className).toContain("text-white");
  });

  it("applies design-system color class for draft", () => {
    render(<FormatBadge format="draft" />);
    const badge = screen.getByText("draft");
    expect(badge.className).toContain("bg-format-draft");
    expect(badge.className).toContain("text-white");
  });

  it("applies border-none class", () => {
    render(<FormatBadge format="pauper" />);
    const badge = screen.getByText("pauper");
    expect(badge.className).toContain("border-none");
  });

  it("merges custom className", () => {
    render(<FormatBadge format="pauper" className="extra-class" />);
    const badge = screen.getByText("pauper");
    expect(badge.className).toContain("extra-class");
  });
});
