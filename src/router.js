import { jsx as _jsx } from "react/jsx-runtime";
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
function LazyPage({ children }) {
    return (_jsx(Suspense, { fallback: _jsx("div", { className: "flex min-h-[50vh] items-center justify-center", children: _jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" }) }), children: children }));
}
export const router = createBrowserRouter([
    {
        path: "/login",
        element: (_jsx(LazyPage, { children: _jsx(LoginPage, {}) })),
    },
    {
        path: "/onboarding",
        element: (_jsx(ProtectedRoute, { children: _jsx(LazyPage, { children: _jsx(OnboardingPage, {}) }) })),
    },
    {
        element: (_jsx(ProtectedRoute, { children: _jsx(AppShell, {}) })),
        children: [
            {
                path: "/",
                element: (_jsx(LazyPage, { children: _jsx(EventFeedPage, {}) })),
            },
            {
                path: "/events/:id",
                element: (_jsx(LazyPage, { children: _jsx(EventDetailPage, {}) })),
            },
            {
                path: "/events/new",
                element: (_jsx(LazyPage, { children: _jsx(CreateEventPage, {}) })),
            },
            {
                path: "/profile",
                element: (_jsx(LazyPage, { children: _jsx(ProfilePage, {}) })),
            },
            {
                path: "/profile/edit",
                element: (_jsx(LazyPage, { children: _jsx(ProfileEditPage, {}) })),
            },
            {
                path: "/venues/:id",
                element: (_jsx(LazyPage, { children: _jsx(VenuePage, {}) })),
            },
            {
                path: "/settings",
                element: (_jsx(LazyPage, { children: _jsx(SettingsPage, {}) })),
            },
            {
                path: "/admin",
                element: (_jsx(LazyPage, { children: _jsx(AdminPage, {}) })),
            },
        ],
    },
]);
