import type { MtgFormat } from "@/types/database.types";
interface QuickMeetupFormProps {
    defaultValues?: Partial<{
        format: MtgFormat;
        city: string;
        min_players: number;
    }>;
}
export declare function QuickMeetupForm({ defaultValues }: QuickMeetupFormProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=QuickMeetupForm.d.ts.map