import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CityBadge } from "@/components/shared/CityBadge";
export function VenueHeader({ name, city, photoUrl }) {
    return (_jsxs("div", { className: "space-y-4", children: [photoUrl && (_jsx("div", { className: "aspect-video w-full overflow-hidden rounded-xl bg-[#16213e]", children: _jsx("img", { src: photoUrl, alt: name, className: "h-full w-full object-cover" }) })), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-100", children: name }), _jsx(CityBadge, { city: city })] })] }));
}
