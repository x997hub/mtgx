import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFilterStore } from "@/store/filterStore";
import { FORMATS } from "@/lib/constants";
import type { MtgFormat } from "@/types/database.types";

export function FormatFilter() {
  const { t } = useTranslation("events");
  const { format, setFormat } = useFilterStore();

  return (
    <Select
      value={format ?? "all"}
      onValueChange={(v) => setFormat(v === "all" ? null : (v as MtgFormat))}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder={t("all_formats")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t("all_formats")}</SelectItem>
        {FORMATS.map((f) => (
          <SelectItem key={f} value={f}>
            {t(f)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
