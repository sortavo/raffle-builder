-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to log ticket events
CREATE OR REPLACE FUNCTION public.log_ticket_event()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status) THEN
    INSERT INTO public.analytics_events (
      organization_id,
      raffle_id,
      event_type,
      metadata
    )
    SELECT
      r.organization_id,
      NEW.raffle_id,
      CASE NEW.status
        WHEN 'reserved' THEN 'ticket_reserved'
        WHEN 'sold' THEN 'ticket_sold'
        WHEN 'available' THEN 'ticket_released'
        WHEN 'canceled' THEN 'ticket_canceled'
        ELSE 'ticket_updated'
      END,
      jsonb_build_object(
        'ticket_number', NEW.ticket_number,
        'buyer_name', NEW.buyer_name,
        'buyer_email', NEW.buyer_email,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    FROM public.raffles r
    WHERE r.id = NEW.raffle_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for ticket status changes
DROP TRIGGER IF EXISTS ticket_status_change_log ON public.tickets;
CREATE TRIGGER ticket_status_change_log
AFTER UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.log_ticket_event();

-- Create function to release expired reservations
CREATE OR REPLACE FUNCTION public.release_expired_tickets()
RETURNS void AS $$
BEGIN
  UPDATE public.tickets
  SET 
    status = 'available',
    buyer_name = NULL,
    buyer_email = NULL,
    buyer_phone = NULL,
    buyer_city = NULL,
    buyer_id = NULL,
    payment_proof_url = NULL,
    payment_reference = NULL,
    payment_method = NULL,
    reserved_at = NULL,
    reserved_until = NULL,
    notes = NULL
  WHERE status = 'reserved'
    AND reserved_until < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;