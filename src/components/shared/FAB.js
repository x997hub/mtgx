import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
export function FAB({ onClick, children, className }) {
    return (_jsx(Button, { onClick: onClick, className: cn("fixed bottom-20 right-4 z-30 h-14 rounded-full px-5 shadow-lg shadow-[#e94560]/25 md:hidden", className), size: "lg", children: children }));
}
