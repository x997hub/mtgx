import type { MtgFormat, DayOfWeek, TimeSlot, CarAccess } from "@/types/database.types";

export const FORMATS: MtgFormat[] = ["pauper", "commander", "standard", "draft"];

export const CITIES = ["Rishon LeZion", "Tel Aviv", "Ramat Gan", "Herzliya", "Kfar Saba"] as const;

export const DAYS: DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export const SLOTS: TimeSlot[] = ["morning", "day", "evening"];

export const CAR_ACCESS_OPTIONS: CarAccess[] = ["yes", "no", "sometimes"];
