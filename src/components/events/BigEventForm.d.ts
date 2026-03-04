import type { MtgFormat } from "@/types/database.types";
interface BigEventFormProps {
    defaultValues?: Partial<{
        title: string;
        format: MtgFormat;
        venue_id: string;
        min_players: number;
        max_players: number;
        fee_text: string;
        description: string;
    }>;
}
export declare function BigEventForm({ defaultValues }: BigEventFormProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=BigEventForm.d.ts.map