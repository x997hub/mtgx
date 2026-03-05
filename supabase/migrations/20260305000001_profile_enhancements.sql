-- ==========================================
-- Profile Enhancements: morning slot, bio, avatar, car access, trading
-- ==========================================

-- Add morning time slot to enum
ALTER TYPE time_slot ADD VALUE IF NOT EXISTS 'morning' BEFORE 'day';

-- Add new profile columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS car_access TEXT CHECK (car_access IN ('yes', 'no', 'sometimes'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interested_in_trading BOOLEAN NOT NULL DEFAULT false;
