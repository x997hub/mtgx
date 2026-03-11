-- Add Arena username to profiles for MTGA auto-fill
ALTER TABLE profiles ADD COLUMN arena_username TEXT;
ALTER TABLE profiles ADD CONSTRAINT chk_arena_username_length
  CHECK (arena_username IS NULL OR length(arena_username) <= 100);
