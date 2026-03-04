import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
export function FormLayout({ children, className }) {
    return (_jsx("div", { className: cn("mx-auto w-full max-w-lg px-4 py-6", className), children: children }));
}
