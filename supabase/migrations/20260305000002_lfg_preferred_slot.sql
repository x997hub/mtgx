-- Add preferred time slot to LFG signals
ALTER TABLE public.looking_for_game
  ADD COLUMN IF NOT EXISTS preferred_slot time_slot;
