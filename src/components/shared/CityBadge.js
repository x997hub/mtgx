import { jsx as _jsx } from "react/jsx-runtime";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
export function CityBadge({ city, className }) {
    return (_jsx(Badge, { variant: "outline", className: cn("text-gray-300", className), children: city }));
}
