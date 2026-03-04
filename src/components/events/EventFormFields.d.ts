import type { MtgFormat } from "@/types/database.types";
export interface EventFormFieldsProps {
    format: MtgFormat;
    onFormatChange: (format: MtgFormat) => void;
    city: string;
    onCityChange: (city: string) => void;
    startsAt: string;
    onStartsAtChange: (startsAt: string) => void;
    minPlayers: number;
    onMinPlayersChange: (minPlayers: number) => void;
    /** HTML id prefix to avoid collisions when both forms are on the same page */
    idPrefix?: string;
}
export declare function EventFormFields({ format, onFormatChange, city, onCityChange, startsAt, onStartsAtChange, minPlayers, onMinPlayersChange, idPrefix, }: EventFormFieldsProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=EventFormFields.d.ts.map