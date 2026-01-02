-- Create table for storing all draws (pre-draws and main draw)
CREATE TABLE public.raffle_draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  prize_id TEXT NOT NULL,
  prize_name TEXT NOT NULL,
  prize_value NUMERIC,
  
  -- Winner info
  ticket_id UUID REFERENCES public.tickets(id),
  ticket_number TEXT NOT NULL,
  winner_name TEXT,
  winner_email TEXT,
  winner_phone TEXT,
  winner_city TEXT,
  
  -- Draw metadata
  draw_method TEXT NOT NULL CHECK (draw_method IN ('manual', 'lottery', 'random_org')),
  draw_metadata JSONB DEFAULT '{}',
  
  -- Draw type and scheduling
  draw_type TEXT NOT NULL DEFAULT 'pre_draw' CHECK (draw_type IN ('pre_draw', 'main_draw')),
  scheduled_date TIMESTAMPTZ,
  drawn_at TIMESTAMPTZ DEFAULT now(),
  announced BOOLEAN DEFAULT false,
  announced_at TIMESTAMPTZ,
  
  -- Notifications
  winner_notified BOOLEAN DEFAULT false,
  winner_notified_at TIMESTAMPTZ,
  
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_raffle_draws_raffle_id ON public.raffle_draws(raffle_id);
CREATE INDEX idx_raffle_draws_prize_id ON public.raffle_draws(raffle_id, prize_id);
CREATE INDEX idx_raffle_draws_drawn_at ON public.raffle_draws(drawn_at DESC);
CREATE INDEX idx_raffle_draws_announced ON public.raffle_draws(raffle_id, announced) WHERE announced = true;

-- Enable RLS
ALTER TABLE public.raffle_draws ENABLE ROW LEVEL SECURITY;

-- Org members can manage draws
CREATE POLICY "Org members can manage draws"
ON public.raffle_draws FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.raffles r
  WHERE r.id = raffle_draws.raffle_id
  AND has_org_access(auth.uid(), r.organization_id)
));

-- Public can view announced draws of active/completed raffles
CREATE POLICY "Public can view announced draws"
ON public.raffle_draws FOR SELECT
USING (
  announced = true AND
  EXISTS (
    SELECT 1 FROM public.raffles r
    WHERE r.id = raffle_draws.raffle_id
    AND r.status IN ('active', 'completed')
  )
);

-- Migrate existing winners to new table
INSERT INTO public.raffle_draws (
  raffle_id, 
  prize_id, 
  prize_name, 
  prize_value,
  ticket_number, 
  winner_name, 
  winner_email, 
  winner_phone, 
  winner_city,
  draw_method,
  draw_metadata,
  draw_type,
  drawn_at,
  announced,
  announced_at,
  created_by
)
SELECT 
  r.id,
  COALESCE((r.winner_data->>'prize_id')::TEXT, 'main'),
  r.prize_name,
  r.prize_value,
  r.winner_ticket_number,
  r.winner_data->>'buyer_name',
  r.winner_data->>'buyer_email',
  r.winner_data->>'buyer_phone',
  r.winner_data->>'buyer_city',
  COALESCE(r.winner_data->>'draw_method', 'manual'),
  COALESCE(r.winner_data->'metadata', '{}'),
  'main_draw',
  COALESCE((r.winner_data->>'draw_timestamp')::TIMESTAMPTZ, r.updated_at),
  r.winner_announced,
  CASE WHEN r.winner_announced THEN r.updated_at ELSE NULL END,
  r.created_by
FROM public.raffles r
WHERE r.winner_ticket_number IS NOT NULL;