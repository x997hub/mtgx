import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import { cn } from "@/lib/utils";
const Input = React.forwardRef(({ className, type, ...props }, ref) => {
    return (_jsx("input", { type: type, className: cn("flex h-9 w-full rounded-md border border-gray-600 bg-[#1a1a2e] px-3 py-1 text-sm text-gray-100 shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e94560] disabled:cursor-not-allowed disabled:opacity-50", className), ref: ref, ...props }));
});
Input.displayName = "Input";
export { Input };
