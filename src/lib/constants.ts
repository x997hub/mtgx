import type { MtgFormat, DayOfWeek, TimeSlot, CarAccess } from "@/types/database.types";

export const FORMATS: MtgFormat[] = ["pauper", "commander", "standard", "draft"];

export const CITIES = ["Rishon LeZion", "Tel Aviv", "Ramat Gan", "Herzliya", "Kfar Saba"] as const;

export const DAYS: DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export const SLOTS: TimeSlot[] = ["morning", "day", "evening"];

export const CAR_ACCESS_OPTIONS: CarAccess[] = ["yes", "no", "sometimes"];

/** Active/inactive toggle colors for format selection buttons */
export const FORMAT_TOGGLE_COLORS: Record<MtgFormat, { active: string; inactive: string }> = {
  pauper: { active: "bg-emerald-700 text-emerald-100", inactive: "bg-gray-700 text-gray-400" },
  commander: { active: "bg-purple-700 text-purple-100", inactive: "bg-gray-700 text-gray-400" },
  standard: { active: "bg-blue-700 text-blue-100", inactive: "bg-gray-700 text-gray-400" },
  draft: { active: "bg-amber-700 text-amber-100", inactive: "bg-gray-700 text-gray-400" },
};

/** Badge colors for format display */
export const FORMAT_BADGE_COLORS: Record<MtgFormat, string> = {
  pauper: "bg-emerald-700 text-emerald-100",
  commander: "bg-purple-700 text-purple-100",
  standard: "bg-blue-700 text-blue-100",
  draft: "bg-amber-700 text-amber-100",
};
