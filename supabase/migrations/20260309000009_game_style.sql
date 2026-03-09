-- Add game style columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS playstyle TEXT DEFAULT 'mixed' CHECK (playstyle IN ('casual', 'competitive', 'mixed')),
  ADD COLUMN IF NOT EXISTS game_speed TEXT DEFAULT 'medium' CHECK (game_speed IN ('slow', 'medium', 'fast')),
  ADD COLUMN IF NOT EXISTS social_level TEXT DEFAULT 'moderate' CHECK (social_level IN ('quiet', 'moderate', 'talkative'));
