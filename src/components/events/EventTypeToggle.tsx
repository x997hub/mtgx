import { useTranslation } from "react-i18next";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Database } from "@/types/database.types";

type EventType = Database["public"]["Enums"]["event_type"];

interface EventTypeToggleProps {
  value: EventType;
  onChange: (value: EventType) => void;
}

export function EventTypeToggle({ value, onChange }: EventTypeToggleProps) {
  const { t } = useTranslation("events");

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v as EventType);
      }}
      className="w-full"
      variant="outline"
    >
      <ToggleGroupItem value="big" className="flex-1 min-h-[44px]">
        {t("big_event")}
      </ToggleGroupItem>
      <ToggleGroupItem value="quick" className="flex-1 min-h-[44px]">
        {t("quick_meetup")}
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
