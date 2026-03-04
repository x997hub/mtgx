import type { Database } from "@/types/database.types";
type SubscriptionTarget = Database["public"]["Enums"]["subscription_target"];
interface SubscribeButtonProps {
    targetType: SubscriptionTarget;
    targetId?: string;
    className?: string;
}
export declare function SubscribeButton({ targetType, targetId, className }: SubscribeButtonProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=SubscribeButton.d.ts.map