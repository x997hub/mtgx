import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
export function ProtectedRoute({ children }) {
    const { isAuthenticated, isLoading, profile } = useAuth();
    const location = useLocation();
    if (isLoading) {
        return (_jsx("div", { className: "flex min-h-screen items-center justify-center bg-[#1a1a2e]", children: _jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-2 border-[#e94560] border-t-transparent" }) }));
    }
    if (!isAuthenticated) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    // If authenticated but no profile, redirect to onboarding
    // (unless already on /onboarding to avoid infinite loop)
    if (!profile && location.pathname !== "/onboarding") {
        return _jsx(Navigate, { to: "/onboarding", replace: true });
    }
    return _jsx(_Fragment, { children: children });
}
