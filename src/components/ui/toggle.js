import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
const toggleVariants = cva("inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-[#16213e] hover:text-gray-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e94560] disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-[#16213e] data-[state=on]:text-white", {
    variants: {
        variant: {
            default: "bg-transparent",
            outline: "border border-gray-600 bg-transparent shadow-sm hover:bg-[#16213e] hover:text-white",
        },
        size: {
            default: "h-9 min-w-9 px-2",
            sm: "h-8 min-w-8 px-1.5",
            lg: "h-10 min-w-10 px-2.5",
        },
    },
    defaultVariants: {
        variant: "default",
        size: "default",
    },
});
const Toggle = React.forwardRef(({ className, variant, size, ...props }, ref) => (_jsx(TogglePrimitive.Root, { ref: ref, className: cn(toggleVariants({ variant, size, className })), ...props })));
Toggle.displayName = TogglePrimitive.Root.displayName;
export { Toggle, toggleVariants };
