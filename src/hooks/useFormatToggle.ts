import { useCallback } from "react";
import type { MtgFormat } from "@/types/database.types";

/**
 * Reusable hook for toggling a format in/out of a format array.
 * Eliminates the repeated includes/filter pattern across components.
 */
export function useFormatToggle(
  formats: MtgFormat[],
  onChange: (formats: MtgFormat[]) => void,
) {
  const toggle = useCallback(
    (fmt: MtgFormat) => {
      onChange(
        formats.includes(fmt)
          ? formats.filter((f) => f !== fmt)
          : [...formats, fmt],
      );
    },
    [formats, onChange],
  );
  return toggle;
}
