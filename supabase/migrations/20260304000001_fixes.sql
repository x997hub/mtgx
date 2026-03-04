-- Fix: RLS policies for internal tables (block public access, only service role can access)
CREATE POLICY "outbox_no_public_access" ON notification_outbox FOR ALL USING (false);
CREATE POLICY "sent_no_public_access" ON notification_sent FOR ALL USING (false);

-- Fix: Missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_history_event ON rsvp_history(event_id);
CREATE INDEX IF NOT EXISTS idx_outbox_processing ON notification_outbox(status, attempts, created_at)
  WHERE status = 'pending' AND attempts < 3;
