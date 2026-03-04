import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
export default function NotFoundPage() {
    const { t } = useTranslation("common");
    return (_jsxs("div", { className: "flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center", children: [_jsx("p", { className: "text-6xl font-bold text-accent", children: "404" }), _jsx("p", { className: "text-lg text-text-secondary", children: t("page_not_found") }), _jsx(Button, { asChild: true, children: _jsx(Link, { to: "/", children: t("go_home") }) })] }));
}
