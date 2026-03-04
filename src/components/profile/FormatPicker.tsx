import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { FORMATS, FORMAT_PICKER_COLORS } from "@/lib/constants";
import type { MtgFormat } from "@/types/database.types";

interface FormatPickerProps {
  selected: MtgFormat[];
  onChange: (formats: MtgFormat[]) => void;
}

export function FormatPicker({ selected, onChange }: FormatPickerProps) {
  const { t } = useTranslation("events");

  const toggle = (format: MtgFormat) => {
    if (selected.includes(format)) {
      onChange(selected.filter((f) => f !== format));
    } else {
      onChange([...selected, format]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {FORMATS.map((format) => {
        const isSelected = selected.includes(format);
        return (
          <button
            key={format}
            type="button"
            onClick={() => toggle(format)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-colors min-h-[44px]",
              isSelected
                ? FORMAT_PICKER_COLORS[format]
                : "border-gray-600 text-gray-400 hover:border-gray-500"
            )}
          >
            {t(format)}
          </button>
        );
      })}
    </div>
  );
}
