import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { router } from "@/router";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import "@/i18n";
export function App() {
    return (_jsx(QueryClientProvider, { client: queryClient, children: _jsxs(ErrorBoundary, { children: [_jsx(RouterProvider, { router: router }), _jsx(Toaster, {})] }) }));
}
