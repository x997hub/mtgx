import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/shared/RouteErrorBoundary";

const LoginPage = lazy(() => import("@/pages/LoginPage"));
const OnboardingPage = lazy(() => import("@/pages/OnboardingPage"));
const EventFeedPage = lazy(() => import("@/pages/EventFeedPage"));
const EventDetailPage = lazy(() => import("@/pages/EventDetailPage"));
const CreateEventPage = lazy(() => import("@/pages/CreateEventPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const ProfileEditPage = lazy(() => import("@/pages/ProfileEditPage"));
const VenuePage = lazy(() => import("@/pages/VenuePage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const AdminLayout = lazy(() => import("@/layouts/AdminLayout"));
const AdminDashboardPage = lazy(() => import("@/pages/admin/DashboardPage"));
const AdminUsersPage = lazy(() => import("@/pages/admin/UsersPage"));
const AdminEventsPage = lazy(() => import("@/pages/admin/EventsPage"));
const AdminFeedbackPage = lazy(() => import("@/pages/admin/FeedbackPage"));
const AdminMoodTagsPage = lazy(() => import("@/pages/admin/MoodTagsPage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const PlayersDirectoryPage = lazy(() => import("@/pages/PlayersDirectoryPage"));
const ClubsPage = lazy(() => import("@/pages/ClubsPage"));
const VenueManagePage = lazy(() => import("@/pages/VenueManagePage"));
const FAQPage = lazy(() => import("@/pages/FAQPage"));
const InfoPage = lazy(() => import("@/pages/InfoPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const DesignSystemPage = lazy(() => import("@/pages/DesignSystemPage"));

function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <RouteErrorBoundary>
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        }
      >
        {children}
      </Suspense>
    </RouteErrorBoundary>
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
        path: "/players",
        element: (
          <LazyPage>
            <PlayersDirectoryPage />
          </LazyPage>
        ),
      },
      {
        path: "/clubs",
        element: (
          <LazyPage>
            <ClubsPage />
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
        path: "/profile/:userId",
        element: (
          <LazyPage>
            <ProfilePage />
          </LazyPage>
        ),
      },
      {
        path: "/venues/new",
        element: (
          <LazyPage>
            <VenueManagePage />
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
        path: "/venues/:id/edit",
        element: (
          <LazyPage>
            <VenueManagePage />
          </LazyPage>
        ),
      },
      {
        path: "/notifications",
        element: (
          <LazyPage>
            <NotificationsPage />
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
        path: "/faq",
        element: (
          <LazyPage>
            <FAQPage />
          </LazyPage>
        ),
      },
      {
        path: "/about",
        element: (
          <LazyPage>
            <InfoPage />
          </LazyPage>
        ),
      },
      {
        path: "/design-system",
        element: (
          <LazyPage>
            <DesignSystemPage />
          </LazyPage>
        ),
      },
      {
        path: "/admin",
        element: (
          <LazyPage>
            <AdminLayout />
          </LazyPage>
        ),
        children: [
          { index: true, element: <Navigate to="/admin/dashboard" replace /> },
          {
            path: "dashboard",
            element: (
              <LazyPage>
                <AdminDashboardPage />
              </LazyPage>
            ),
          },
          {
            path: "users",
            element: (
              <LazyPage>
                <AdminUsersPage />
              </LazyPage>
            ),
          },
          {
            path: "events",
            element: (
              <LazyPage>
                <AdminEventsPage />
              </LazyPage>
            ),
          },
          {
            path: "feedback",
            element: (
              <LazyPage>
                <AdminFeedbackPage />
              </LazyPage>
            ),
          },
          {
            path: "mood-tags",
            element: (
              <LazyPage>
                <AdminMoodTagsPage />
              </LazyPage>
            ),
          },
        ],
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
