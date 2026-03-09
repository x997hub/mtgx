-- Venue analytics function for club owners
-- show_rate and retention are NULL until QR check-in (B3) is implemented
CREATE OR REPLACE FUNCTION get_venue_analytics(p_venue_id UUID, p_days_back INT DEFAULT 30)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  v_owner_id UUID;
BEGIN
  SELECT owner_id INTO v_owner_id FROM venues WHERE id = p_venue_id;
  IF v_owner_id IS NULL OR v_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT json_build_object(
    'unique_players', (
      SELECT COUNT(DISTINCT r.user_id)
      FROM rsvps r JOIN events e ON r.event_id = e.id
      WHERE e.venue_id = p_venue_id AND r.status = 'going'
      AND e.starts_at >= NOW() - (p_days_back || ' days')::INTERVAL
    ),
    'popular_formats', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT e.format, COUNT(*) as count
        FROM events e WHERE e.venue_id = p_venue_id
        AND e.starts_at >= NOW() - (p_days_back || ' days')::INTERVAL
        GROUP BY e.format ORDER BY count DESC
      ) t
    ),
    'peak_days', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT EXTRACT(DOW FROM e.starts_at)::int as day_of_week, COUNT(*) as count
        FROM events e WHERE e.venue_id = p_venue_id
        AND e.starts_at >= NOW() - (p_days_back || ' days')::INTERVAL
        GROUP BY day_of_week ORDER BY count DESC
      ) t
    ),
    'show_rate', NULL,
    'retention', NULL
  ) INTO result;

  RETURN result;
END;
$$;
