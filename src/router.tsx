import { createBrowserRouter } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

const LoginPage = lazy(() => import("@/pages/LoginPage"));
const OnboardingPage = lazy(() => import("@/pages/OnboardingPage"));
const EventFeedPage = lazy(() => import("@/pages/EventFeedPage"));
const EventDetailPage = lazy(() => import("@/pages/EventDetailPage"));
const CreateEventPage = lazy(() => import("@/pages/CreateEventPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const ProfileEditPage = lazy(() => import("@/pages/ProfileEditPage"));
const VenuePage = lazy(() => import("@/pages/VenuePage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <LazyPage>
        <LoginPage />
      </LazyPage>
    ),
  },
  {
    path: "/onboarding",
    element: (
      <ProtectedRoute>
        <LazyPage>
          <OnboardingPage />
        </LazyPage>
      </ProtectedRoute>
    ),
  },
  {
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "/",
        element: (
          <LazyPage>
            <EventFeedPage />
          </LazyPage>
        ),
      },
      {
        path: "/events/:id",
        element: (
          <LazyPage>
            <EventDetailPage />
          </LazyPage>
        ),
      },
      {
        path: "/events/new",
        element: (
          <LazyPage>
            <CreateEventPage />
          </LazyPage>
        ),
      },
      {
        path: "/profile",
        element: (
          <LazyPage>
            <ProfilePage />
          </LazyPage>
        ),
      },
      {
        path: "/profile/edit",
        element: (
          <LazyPage>
            <ProfileEditPage />
          </LazyPage>
        ),
      },
      {
        path: "/venues/:id",
        element: (
          <LazyPage>
            <VenuePage />
          </LazyPage>
        ),
      },
      {
        path: "/settings",
        element: (
          <LazyPage>
            <SettingsPage />
          </LazyPage>
        ),
      },
      {
        path: "/admin",
        element: (
          <LazyPage>
            <AdminPage />
          </LazyPage>
        ),
      },
      {
        path: "*",
        element: (
          <LazyPage>
            <NotFoundPage />
          </LazyPage>
        ),
      },
    ],
  },
]);
