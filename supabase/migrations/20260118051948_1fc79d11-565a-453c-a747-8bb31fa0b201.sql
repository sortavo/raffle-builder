-- Enable RLS on all 32 partition tables
DO $$
BEGIN
  FOR i IN 0..31 LOOP
    EXECUTE format('ALTER TABLE public.ticket_reservation_status_p%s ENABLE ROW LEVEL SECURITY', i);
  END LOOP;
END $$;