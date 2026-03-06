/**
 * Maps API error codes to i18n keys for user-friendly error messages.
 */
export const ERROR_MAP: Record<string, string> = {
  event_full: "common:errors.event_full",
  event_not_found: "common:errors.event_not_found",
  already_registered: "common:errors.already_registered",
  not_authenticated: "common:errors.not_authenticated",
  network_error: "common:errors.network_error",
  rate_limited: "common:errors.rate_limited",
  capacity_exceeded: "common:errors.event_full",
  forbidden: "common:errors.forbidden",
  validation_error: "common:errors.validation_error",
  server_error: "common:errors.server_error",
};

/**
 * Extracts a mapped i18n key from an error, or returns a generic fallback key.
 */
export function getErrorKey(error: unknown): string {
  if (!error) return "common:errors.unknown";

  // PostgreSQL / Supabase error with a code field
  if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, unknown>;

    // Edge Function JSON body: { code: "event_full", message: "..." }
    if (typeof obj.code === "string" && ERROR_MAP[obj.code]) {
      return ERROR_MAP[obj.code];
    }

    // Supabase PostgREST error: { message: "capacity_exceeded" }
    if (typeof obj.message === "string") {
      const msg = obj.message;
      for (const [code, key] of Object.entries(ERROR_MAP)) {
        if (msg.includes(code)) return key;
      }
    }

    // Fetch / network errors
    if (obj instanceof TypeError && String(obj.message).includes("fetch")) {
      return ERROR_MAP.network_error;
    }
  }

  if (typeof error === "string") {
    for (const [code, key] of Object.entries(ERROR_MAP)) {
      if (error.includes(code)) return key;
    }
  }

  return "common:errors.unknown";
}

/**
 * Extracts a plain-text error message (non-i18n) from an error.
 * Use getErrorKey() instead when you want an i18n-ready key.
 */
export function getErrorMessage(error: unknown): string {
  if (!error) return "An unknown error occurred";

  if (typeof error === "string") return error;

  if (error instanceof Error) return error.message;

  if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, unknown>;
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.error === "string") return obj.error;
  }

  return "An unknown error occurred";
}
