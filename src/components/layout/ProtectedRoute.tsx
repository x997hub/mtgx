import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, profileChecked, profile } = useAuth();
  const location = useLocation();

  // Wait for both auth and profile check to complete
  if (isLoading || (isAuthenticated && !profileChecked)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a1a2e]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e94560] border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated but no profile, redirect to onboarding
  // (unless already on /onboarding to avoid infinite loop)
  if (!profile && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
