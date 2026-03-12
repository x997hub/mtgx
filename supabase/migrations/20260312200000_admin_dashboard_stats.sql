-- ============================================================================
-- Admin Dashboard Stats: Level 1 migration
-- Adds daily_stats table, confirmed_count on events, first_rsvp_date on profiles
-- ============================================================================

-- 1. Daily stats table for time-series aggregation
CREATE TABLE IF NOT EXISTS public.daily_stats (
  stat_date   date        NOT NULL,
  metric_key  text        NOT NULL,
  value       numeric     NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (stat_date, metric_key)
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats (stat_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_stats_key ON daily_stats (metric_key, stat_date DESC);

ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_stats_admin_read" ON daily_stats
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. Add confirmed_count to events (denormalized counter)
ALTER TABLE events ADD COLUMN IF NOT EXISTS confirmed_count smallint NOT NULL DEFAULT 0;

-- Backfill confirmed_count from existing data
UPDATE events e SET confirmed_count = (
  SELECT COUNT(*)::smallint FROM rsvps r
  WHERE r.event_id = e.id AND r.status = 'going'
);

-- Trigger to sync confirmed_count on RSVP changes
CREATE OR REPLACE FUNCTION sync_confirmed_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  target_event_id uuid;
BEGIN
  target_event_id := COALESCE(NEW.event_id, OLD.event_id);
  UPDATE events SET confirmed_count = (
    SELECT COUNT(*)::smallint FROM rsvps
    WHERE event_id = target_event_id AND status = 'going'
  ) WHERE id = target_event_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_confirmed_count ON rsvps;
CREATE TRIGGER trg_sync_confirmed_count
  AFTER INSERT OR UPDATE OR DELETE ON rsvps
  FOR EACH ROW EXECUTE FUNCTION sync_confirmed_count();

-- 3. Add first_rsvp_date to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_rsvp_date timestamptz;

-- Backfill first_rsvp_date from existing data
UPDATE profiles p SET first_rsvp_date = sub.first_date
FROM (
  SELECT user_id, MIN(created_at) AS first_date
  FROM rsvps
  WHERE status IN ('going', 'maybe')
  GROUP BY user_id
) sub
WHERE p.id = sub.user_id AND p.first_rsvp_date IS NULL;

-- Trigger to set first_rsvp_date on first RSVP
CREATE OR REPLACE FUNCTION set_first_rsvp_date()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IN ('going', 'maybe') THEN
    UPDATE profiles
    SET first_rsvp_date = NOW()
    WHERE id = NEW.user_id AND first_rsvp_date IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_first_rsvp_date ON rsvps;
CREATE TRIGGER trg_set_first_rsvp_date
  AFTER INSERT ON rsvps
  FOR EACH ROW EXECUTE FUNCTION set_first_rsvp_date();
