import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFilterStore } from "@/store/filterStore";
import { CITIES } from "@/lib/constants";

export function CityFilter() {
  const { t } = useTranslation("events");
  const { city, setCity } = useFilterStore();

  return (
    <Select
      value={city ?? "all"}
      onValueChange={(v) => setCity(v === "all" ? null : v)}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder={t("all_cities")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t("all_cities")}</SelectItem>
        {CITIES.map((c) => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
