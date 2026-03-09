/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../ProtectedRoute";

// ProtectedRoute uses useAuth() which reads from useAuthStore internally,
// so we mock the useAuth hook directly
vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/hooks/useAuth";

const mockedUseAuth = vi.mocked(useAuth);

function renderWithRouter(initialPath: string) {
  let currentLocation = "";

  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/login"
          element={<div data-testid="login-page">Login</div>}
        />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <div data-testid="onboarding-page">Onboarding</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div data-testid="dashboard-page">Dashboard</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <div data-testid="protected-content">Protected Content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );

  return { currentLocation };
}

describe("ProtectedRoute", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows spinner when isLoading is true", () => {
    mockedUseAuth.mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
      profileChecked: false,
      profile: null,
      session: null,
      user: null,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter("/dashboard");

    // Should show the spinner (animate-spin class)
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-page")).not.toBeInTheDocument();
  });

  it("redirects to /login when not authenticated", () => {
    mockedUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      profileChecked: false,
      profile: null,
      session: null,
      user: null,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter("/dashboard");

    expect(screen.getByTestId("login-page")).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-page")).not.toBeInTheDocument();
  });

  it("redirects to /onboarding when authenticated but no profile and not on /onboarding", () => {
    mockedUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      profileChecked: true,
      profile: null,
      session: {} as any,
      user: { id: "user-1" } as any,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter("/dashboard");

    expect(screen.getByTestId("onboarding-page")).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-page")).not.toBeInTheDocument();
  });

  it("renders children when on /onboarding and authenticated with no profile", () => {
    mockedUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      profileChecked: true,
      profile: null,
      session: {} as any,
      user: { id: "user-1" } as any,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter("/onboarding");

    expect(screen.getByTestId("onboarding-page")).toBeInTheDocument();
  });

  it("renders children when authenticated with profile", () => {
    mockedUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      profileChecked: true,
      profile: { id: "user-1", display_name: "Alice", city: "Tel Aviv" } as any,
      session: {} as any,
      user: { id: "user-1" } as any,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter("/dashboard");

    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
  });

  it("shows spinner when authenticated but profileChecked is false", () => {
    mockedUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      profileChecked: false,
      profile: null,
      session: {} as any,
      user: { id: "user-1" } as any,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter("/dashboard");

    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-page")).not.toBeInTheDocument();
  });
});
