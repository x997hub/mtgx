import type { MtgFormat, DayOfWeek, TimeSlot, CarAccess, ProxyPolicy, FeedbackType, FeedbackStatus } from "@/types/database.types";

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

/** Default mood tag slugs (matching DB seed) */
export const MOOD_TAG_SLUGS = ["casual", "competitive", "deck_test", "training"] as const;
export type MoodTagSlug = (typeof MOOD_TAG_SLUGS)[number];

/** Proxy policy options */
export const PROXY_POLICIES: ProxyPolicy[] = ["none", "partial", "full"];

/** Proxy policy display colors */
export const PROXY_POLICY_COLORS: Record<ProxyPolicy, string> = {
  none: "bg-red-700/60 text-red-100",
  partial: "bg-yellow-700/60 text-yellow-100",
  full: "bg-green-700/60 text-green-100",
};

/** Commander power levels (1-5) */
export const POWER_LEVELS = [1, 2, 3, 4, 5] as const;
export type PowerLevel = (typeof POWER_LEVELS)[number];

/** Power level display labels */
export const POWER_LEVEL_LABELS: Record<number, string> = {
  1: "Jank / Precon",
  2: "Low",
  3: "Mid",
  4: "High",
  5: "cEDH",
};

/** LFG duration options (hours) for "Going Today" */
export const LFG_DURATION_OPTIONS = [1, 2, 3, 4, 5] as const;

/** Feedback report types */
export const FEEDBACK_TYPES: FeedbackType[] = ["bug", "suggestion", "question"];

/** Feedback report statuses */
export const FEEDBACK_STATUSES: FeedbackStatus[] = ["new", "in_progress", "resolved", "closed"];
