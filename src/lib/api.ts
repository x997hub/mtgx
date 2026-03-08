const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mtgx-api`;

/**
 * Build a full URL for the mtgx-api Edge Function.
 * @param path - route path, e.g. "/rsvp", "/events"
 */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

/**
 * Convenience wrapper around `fetch` that targets the mtgx-api Edge Function.
 * Automatically prepends the API base URL to the given path.
 * @param path - route path, e.g. "/rsvp", "/events"
 * @param options - standard RequestInit options
 */
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), options);
}
