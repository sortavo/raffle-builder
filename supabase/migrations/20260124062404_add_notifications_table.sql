-- Create notifications table for user notifications
-- Supports real-time updates via Supabase Realtime

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'purchase_confirmed',
    'raffle_starting',
    'raffle_ending',
    'winner_announcement',
    'ticket_reminder',
    'promotion',
    'system'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Only service role can insert notifications (via edge functions)
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Enable Realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Function to send notification (called from edge functions or triggers)
CREATE OR REPLACE FUNCTION send_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_image_url TEXT DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, body, image_url, action_url, metadata)
  VALUES (p_user_id, p_type, p_title, p_body, p_image_url, p_action_url, p_metadata)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to send notification on purchase confirmation
CREATE OR REPLACE FUNCTION notify_purchase_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    PERFORM send_notification(
      NEW.user_id,
      'purchase_confirmed',
      '¡Compra confirmada!',
      'Tu compra ha sido procesada exitosamente.',
      NULL,
      '/mis-boletos',
      jsonb_build_object('order_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on orders table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
    DROP TRIGGER IF EXISTS trigger_notify_purchase_confirmed ON orders;
    CREATE TRIGGER trigger_notify_purchase_confirmed
      AFTER INSERT OR UPDATE ON orders
      FOR EACH ROW
      EXECUTE FUNCTION notify_purchase_confirmed();
  END IF;
END $$;

-- Trigger to send notification when winner is announced
CREATE OR REPLACE FUNCTION notify_winner_announcement()
RETURNS TRIGGER AS $$
DECLARE
  v_raffle RECORD;
  v_ticket RECORD;
BEGIN
  IF NEW.status = 'won' AND (OLD.status IS NULL OR OLD.status != 'won') THEN
    -- Get raffle info
    SELECT title, slug INTO v_raffle FROM raffles WHERE id = NEW.raffle_id;

    IF NEW.user_id IS NOT NULL THEN
      PERFORM send_notification(
        NEW.user_id,
        'winner_announcement',
        '🏆 ¡Felicidades, ganaste!',
        format('Tu boleto #%s ganó en la rifa "%s"', NEW.number, v_raffle.title),
        NULL,
        format('/rifas/%s', v_raffle.slug),
        jsonb_build_object('raffle_id', NEW.raffle_id, 'ticket_number', NEW.number)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on tickets table
DROP TRIGGER IF EXISTS trigger_notify_winner ON tickets;
CREATE TRIGGER trigger_notify_winner
  AFTER UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_winner_announcement();

COMMENT ON TABLE notifications IS 'User notifications with real-time support';
