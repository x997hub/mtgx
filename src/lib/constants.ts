import type {
  MtgFormat, DayOfWeek, TimeSlot, CarAccess, ProxyPolicy,
  FeedbackType, FeedbackStatus, EventStatus, RsvpStatus, AvailabilityLevel,
} from "@/types/database.types";

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

/** Event status badge colors */
export const EVENT_STATUS_COLORS: Record<EventStatus, string> = {
  active: "bg-emerald-700 text-emerald-100",
  confirmed: "bg-blue-700 text-blue-100",
  cancelled: "bg-red-700 text-red-100",
  expired: "bg-gray-700 text-gray-300",
};

/** RSVP status badge colors */
export const RSVP_STATUS_COLORS: Record<RsvpStatus, string> = {
  going: "bg-emerald-700",
  maybe: "bg-amber-700",
  not_going: "bg-gray-600",
  waitlisted: "bg-indigo-700",
  pending_confirmation: "bg-yellow-700",
};

/** RSVP display order */
export const RSVP_STATUS_ORDER: RsvpStatus[] = ["going", "maybe", "not_going", "waitlisted", "pending_confirmation"];

/** Feedback type badge colors */
export const FEEDBACK_TYPE_COLORS: Record<FeedbackType, string> = {
  bug: "bg-red-700/20 text-red-400",
  suggestion: "bg-blue-700/20 text-blue-400",
  question: "bg-amber-700/20 text-amber-400",
};

/** Feedback status badge colors */
export const FEEDBACK_STATUS_COLORS: Record<FeedbackStatus, string> = {
  new: "bg-blue-700 text-blue-100",
  in_progress: "bg-amber-700 text-amber-100",
  resolved: "bg-emerald-700 text-emerald-100",
  closed: "bg-gray-700 text-gray-300",
};

/** Availability level colors (interactive, with hover) */
export const AVAILABILITY_LEVEL_COLORS: Record<AvailabilityLevel, string> = {
  available: "bg-emerald-600 hover:bg-emerald-500",
  sometimes: "bg-amber-600 hover:bg-amber-500",
  unavailable: "bg-gray-700 hover:bg-gray-600",
};

/** Mood tag toggle colors (for selector buttons) */
export const MOOD_TAG_TOGGLE_COLORS: Record<string, { active: string; inactive: string }> = {
  casual: { active: "bg-emerald-700 text-emerald-100", inactive: "bg-gray-700 text-gray-400" },
  competitive: { active: "bg-red-700 text-red-100", inactive: "bg-gray-700 text-gray-400" },
  deck_test: { active: "bg-blue-700 text-blue-100", inactive: "bg-gray-700 text-gray-400" },
  training: { active: "bg-purple-700 text-purple-100", inactive: "bg-gray-700 text-gray-400" },
};

/** Mood tag badge colors */
export const MOOD_TAG_COLORS: Record<string, string> = {
  casual: "bg-emerald-700/30 text-emerald-300 border-emerald-700/50",
  competitive: "bg-red-700/30 text-red-300 border-red-700/50",
  deck_test: "bg-blue-700/30 text-blue-300 border-blue-700/50",
  training: "bg-purple-700/30 text-purple-300 border-purple-700/50",
};

/** Mood tag display labels */
export const MOOD_TAG_LABELS: Record<string, string> = {
  casual: "Casual",
  competitive: "Competitive",
  deck_test: "Deck Test",
  training: "Training",
};
