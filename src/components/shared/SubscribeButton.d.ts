import type { Database } from "@/types/database.types";
type SubscriptionTarget = Database["public"]["Enums"]["subscription_target"];
type MtgFormat = Database["public"]["Enums"]["mtg_format"];
interface SubscribeButtonProps {
    targetType: SubscriptionTarget;
    /** Required for organizer / venue targets */
    targetId?: string;
    /** Required for format_city target */
    format?: MtgFormat;
    /** Required for format_city target */
    city?: string;
    className?: string;
}
export declare function SubscribeButton({ targetType, targetId, format, city, className, }: SubscribeButtonProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=SubscribeButton.d.ts.map