import { supabase } from "@/lib/supabase";

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mtgx-api`;

/**
 * Build a full URL for the mtgx-api Edge Function.
 * @param path - route path, e.g. "/rsvp", "/events"
 */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

/**
 * Get a fresh access token from the Supabase client.
 * This ensures token refresh happens before API calls, avoiding 401s from stale tokens.
 */
export async function getAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  return session.access_token;
}

/**
 * Convenience wrapper around `fetch` that targets the mtgx-api Edge Function.
 * Automatically prepends the API base URL, includes the Supabase apikey header,
 * and injects a fresh Authorization header if not already provided.
 * @param path - route path, e.g. "/rsvp", "/events"
 * @param options - standard RequestInit options
 */
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const headers = new Headers(options?.headers);
  if (!headers.has("apikey")) {
    headers.set("apikey", import.meta.env.VITE_SUPABASE_ANON_KEY);
  }
  if (!headers.has("Authorization")) {
    const token = await getAccessToken();
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(apiUrl(path), { ...options, headers });
}
