-- Seed data for MTG Meetup Platform
-- NOTE: In production, profiles.id references auth.users(id).
-- For local dev, insert auth users first via Supabase CLI.

INSERT INTO profiles (id, display_name, city, formats, whatsapp, role, reliability_score) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'TestPlayer', 'Tel Aviv', '{pauper,commander}', '+972501234567', 'player', 1.000),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'TestOrganizer', 'Tel Aviv', '{pauper,commander,draft}', '+972509876543', 'organizer', 1.000),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'AdminUser', 'Tel Aviv', '{pauper,commander,standard,draft}', '+972505555555', 'admin', 1.000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO availability (user_id, day, slot, level) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'thu', 'evening', 'available'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'sat', 'day', 'available'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'sat', 'evening', 'available'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'fri', 'evening', 'sometimes'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'thu', 'evening', 'available'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'sat', 'day', 'available'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'sat', 'evening', 'available'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'sun', 'day', 'sometimes'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'wed', 'evening', 'available')
ON CONFLICT (user_id, day, slot) DO NOTHING;

INSERT INTO venues (id, owner_id, name, city, address, hours, capacity, contacts, supported_formats) VALUES
  ('d4e5f6a7-b8c9-0123-defa-234567890123',
   'b2c3d4e5-f6a7-8901-bcde-f12345678901',
   'Rotemz Game Club',
   'Tel Aviv',
   '42 Rothschild Blvd, Tel Aviv',
   '{"sun":"10:00-22:00","mon":"14:00-22:00","tue":"14:00-22:00","wed":"14:00-22:00","thu":"14:00-23:00","fri":"10:00-16:00","sat":"10:00-23:00"}'::jsonb,
   30,
   '{"phone":"+972501112233","email":"info@rotemz.co.il"}'::jsonb,
   '{pauper,commander,draft}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, organizer_id, venue_id, type, title, format, city, starts_at, duration_min, min_players, max_players, fee_text, description, status) VALUES
  ('e5f6a7b8-c9d0-1234-efab-345678901234', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'big', 'Pauper Thursday Night', 'pauper', 'Tel Aviv', '2026-03-06 19:00:00+02', 180, 6, 16, '20 NIS entry', 'Weekly Pauper tournament at Rotemz. Swiss rounds, prizes for top 4.', 'active'),
  ('a7b8c9d0-e1f2-3456-abcd-567890123456', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'big', 'Saturday Draft Afternoon', 'draft', 'Tel Aviv', '2026-03-08 12:00:00+02', 240, 8, 8, '60 NIS (3 packs included)', 'MKM draft! 3 packs per player, 3 rounds Swiss.', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, organizer_id, venue_id, type, format, city, starts_at, duration_min, min_players, max_players, description, status) VALUES
  ('f6a7b8c9-d0e1-2345-fabc-456789012345', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'quick', 'commander', 'Tel Aviv', '2026-03-07 14:00:00+02', 120, 4, 4, 'Looking for a pod for Commander this Saturday!', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO rsvps (event_id, user_id, status) VALUES
  ('e5f6a7b8-c9d0-1234-efab-345678901234', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'going'),
  ('e5f6a7b8-c9d0-1234-efab-345678901234', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'going'),
  ('f6a7b8c9-d0e1-2345-fabc-456789012345', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'going'),
  ('a7b8c9d0-e1f2-3456-abcd-567890123456', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'going'),
  ('a7b8c9d0-e1f2-3456-abcd-567890123456', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'maybe')
ON CONFLICT (event_id, user_id) DO NOTHING;

INSERT INTO subscriptions (user_id, target_type, target_id) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'organizer', 'b2c3d4e5-f6a7-8901-bcde-f12345678901'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'venue', 'd4e5f6a7-b8c9-0123-defa-234567890123')
ON CONFLICT DO NOTHING;

INSERT INTO subscriptions (user_id, target_type, format, city) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'format_city', 'pauper', 'Tel Aviv')
ON CONFLICT DO NOTHING;
