import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
export class ErrorBoundary extends Component {
    state = { hasError: false };
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error, info) {
        console.error("ErrorBoundary caught:", error, info);
    }
    render() {
        if (this.state.hasError) {
            return (_jsx("div", { className: "flex min-h-[50vh] items-center justify-center p-4", children: _jsx(Card, { children: _jsxs(CardContent, { className: "flex flex-col items-center gap-4 p-8 text-center", children: [_jsx(AlertTriangle, { className: "h-12 w-12 text-accent" }), _jsx("p", { className: "text-lg font-semibold text-text-primary", children: "Something went wrong" }), _jsx(Button, { onClick: () => this.setState({ hasError: false }), children: "Try again" })] }) }) }));
        }
        return this.props.children;
    }
}
