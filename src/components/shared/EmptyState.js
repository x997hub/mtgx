import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
export function EmptyState({ icon: Icon, title, description, children, className }) {
    return (_jsxs("div", { className: cn("flex flex-col items-center justify-center py-12 text-center", className), children: [Icon && (_jsx("div", { className: "mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#16213e]", children: _jsx(Icon, { className: "h-8 w-8 text-gray-400" }) })), _jsx("h3", { className: "mb-1 text-lg font-semibold text-gray-200", children: title }), description && _jsx("p", { className: "mb-4 max-w-sm text-sm text-gray-400", children: description }), children && _jsx("div", { className: "flex flex-wrap items-center justify-center gap-2", children: children })] }));
}
