import type {
  MtgFormat, DayOfWeek, TimeSlot, CarAccess, ProxyPolicy,
  FeedbackType, FeedbackStatus, EventStatus, RsvpStatus, AvailabilityLevel,
  EventMode, OnlinePlatform,
} from "@/types/database.types";

export const FORMATS: MtgFormat[] = ["pauper", "commander", "standard", "draft"];

export const CITIES = ["Rishon LeZion", "Tel Aviv", "Ramat Gan", "Herzliya", "Kfar Saba"] as const;

export const DAYS: DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export const SLOTS: TimeSlot[] = ["morning", "day", "evening"];

export const CAR_ACCESS_OPTIONS: CarAccess[] = ["yes", "no", "sometimes"];

/** Active/inactive toggle colors for format selection buttons */
export const FORMAT_TOGGLE_COLORS: Record<MtgFormat, { active: string; inactive: string }> = {
  pauper: { active: "bg-format-pauper text-white", inactive: "bg-surface-hover text-text-secondary" },
  commander: { active: "bg-format-commander text-white", inactive: "bg-surface-hover text-text-secondary" },
  standard: { active: "bg-format-standard text-white", inactive: "bg-surface-hover text-text-secondary" },
  draft: { active: "bg-format-draft text-white", inactive: "bg-surface-hover text-text-secondary" },
};

/** Badge colors for format display */
export const FORMAT_BADGE_COLORS: Record<MtgFormat, string> = {
  pauper: "bg-format-pauper text-white",
  commander: "bg-format-commander text-white",
  standard: "bg-format-standard text-white",
  draft: "bg-format-draft text-white",
};

/** Default mood tag slugs (matching DB seed) */
export const MOOD_TAG_SLUGS = ["casual", "competitive", "deck_test", "training"] as const;
export type MoodTagSlug = (typeof MOOD_TAG_SLUGS)[number];

/** Proxy policy options */
export const PROXY_POLICIES: ProxyPolicy[] = ["none", "partial", "full"];

/** Proxy policy display colors */
export const PROXY_POLICY_COLORS: Record<ProxyPolicy, string> = {
  none: "bg-danger/60 text-white",
  partial: "bg-warning/60 text-white",
  full: "bg-success/60 text-white",
};

/** Event mode options */
export const EVENT_MODES: EventMode[] = ["in_person", "online", "hybrid"];

/** Online platform options */
export const ONLINE_PLATFORMS: OnlinePlatform[] = ["spelltable", "mtgo", "mtga", "discord", "zoom", "other"];

/** Platform display labels */
export const PLATFORM_LABELS: Record<OnlinePlatform, string> = {
  spelltable: "Spelltable",
  mtgo: "MTGO",
  mtga: "MTG Arena",
  discord: "Discord",
  zoom: "Zoom",
  other: "Other",
};

/** Event mode display labels */
export const EVENT_MODE_LABELS: Record<EventMode, string> = {
  in_person: "In Person",
  online: "Online",
  hybrid: "Hybrid",
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
  active: "bg-going-soft text-success",
  confirmed: "bg-info/10 text-info",
  cancelled: "bg-not-going-soft text-danger",
  expired: "bg-surface-hover text-text-secondary",
};

/** RSVP status badge colors */
export const RSVP_STATUS_COLORS: Record<RsvpStatus, string> = {
  going: "bg-success",
  maybe: "bg-warning",
  not_going: "bg-surface-hover",
  waitlisted: "bg-info",
  pending_confirmation: "bg-warning",
};

/** RSVP display order */
export const RSVP_STATUS_ORDER: RsvpStatus[] = ["going", "maybe", "not_going", "waitlisted", "pending_confirmation"];

/** Feedback type badge colors */
export const FEEDBACK_TYPE_COLORS: Record<FeedbackType, string> = {
  bug: "bg-not-going-soft text-danger",
  suggestion: "bg-info/10 text-info",
  question: "bg-maybe-soft text-warning",
};

/** Feedback status badge colors */
export const FEEDBACK_STATUS_COLORS: Record<FeedbackStatus, string> = {
  new: "bg-info/10 text-info",
  in_progress: "bg-maybe-soft text-warning",
  resolved: "bg-going-soft text-success",
  closed: "bg-surface-hover text-text-secondary",
};

/** Player skill level badge colors */
export const LEVEL_COLORS: Record<string, string> = {
  casual: "bg-going-soft text-success",
  regular: "bg-info/10 text-info",
  competitive: "bg-not-going-soft text-danger",
};

/** Availability level colors (interactive, with hover) */
export const AVAILABILITY_LEVEL_COLORS: Record<AvailabilityLevel, string> = {
  available: "bg-success hover:bg-success/80",
  sometimes: "bg-warning hover:bg-warning/80",
  unavailable: "bg-surface-hover hover:bg-surface-hover/80",
};

/** Mood tag toggle colors (for selector buttons) */
export const MOOD_TAG_TOGGLE_COLORS: Record<string, { active: string; inactive: string }> = {
  casual: { active: "bg-mood-casual text-white", inactive: "bg-surface-hover text-text-secondary" },
  competitive: { active: "bg-mood-competitive text-white", inactive: "bg-surface-hover text-text-secondary" },
  deck_test: { active: "bg-mood-deck-test text-white", inactive: "bg-surface-hover text-text-secondary" },
  training: { active: "bg-mood-training text-white", inactive: "bg-surface-hover text-text-secondary" },
};

/** Mood tag badge colors */
export const MOOD_TAG_COLORS: Record<string, string> = {
  casual: "bg-mood-casual-soft text-mood-casual border-mood-casual/30",
  competitive: "bg-mood-competitive-soft text-mood-competitive border-mood-competitive/30",
  deck_test: "bg-mood-deck-test-soft text-mood-deck-test border-mood-deck-test/30",
  training: "bg-mood-training-soft text-mood-training border-mood-training/30",
};

/** Mood tag display labels */
export const MOOD_TAG_LABELS: Record<string, string> = {
  casual: "Casual",
  competitive: "Competitive",
  deck_test: "Deck Test",
  training: "Training",
};
