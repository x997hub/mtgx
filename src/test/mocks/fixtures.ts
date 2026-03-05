import type { Session, User } from "@supabase/supabase-js";

export const mockUser: User = {
  id: "user-1",
  aud: "authenticated",
  role: "authenticated",
  email: "test@example.com",
  email_confirmed_at: "2026-01-01T00:00:00Z",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  app_metadata: { provider: "google" },
  user_metadata: {
    full_name: "Test Player",
    avatar_url: "https://example.com/avatar.jpg",
  },
  identities: [],
};

export const mockSession: Session = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: mockUser,
};

export const mockProfile = {
  id: "user-1",
  display_name: "Test Player",
  city: "Tel Aviv",
  formats: ["pauper", "commander"] as const,
  whatsapp: "+972501234567",
  role: "player" as const,
  reliability_score: 1.0,
  created_at: "2026-01-01T00:00:00Z",
  bio: null,
  avatar_url: "https://example.com/avatar.jpg",
  interested_in_trading: false,
  car_access: null,
};

export const mockEvent = {
  id: "event-1",
  organizer_id: "user-2",
  venue_id: null,
  type: "big" as const,
  title: "Pauper Cup #1",
  format: "pauper" as const,
  city: "Tel Aviv",
  starts_at: new Date(Date.now() + 86400000).toISOString(),
  duration_min: 180,
  min_players: 4,
  max_players: 16,
  fee_text: null,
  description: "Test event",
  status: "active" as const,
  cloned_from: null,
  expires_at: null,
  created_at: "2026-01-01T00:00:00Z",
  venues: null,
  rsvps: [{ count: 5 }],
};

export const mockVenue = {
  id: "venue-1",
  owner_id: "user-3",
  name: "Test Venue",
  city: "Tel Aviv",
  address: "123 Main St",
  hours: null,
  capacity: 30,
  contacts: null,
  supported_formats: ["pauper", "commander"],
  created_at: "2026-01-01T00:00:00Z",
};
