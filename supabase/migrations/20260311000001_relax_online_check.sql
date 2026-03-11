-- Relax CHECK: online events need at least one of join_link, contact_link, or platform_username
-- contact_link is optional (auto-filled from profile WhatsApp)
ALTER TABLE events DROP CONSTRAINT IF EXISTS chk_online_has_link;
ALTER TABLE events ADD CONSTRAINT chk_online_has_link
  CHECK (mode = 'in_person' OR join_link IS NOT NULL OR contact_link IS NOT NULL OR platform_username IS NOT NULL);
