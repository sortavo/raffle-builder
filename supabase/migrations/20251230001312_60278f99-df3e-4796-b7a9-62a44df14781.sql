-- Fix function search path security issue
CREATE OR REPLACE FUNCTION public.increment_coupon_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.coupons 
  SET current_uses = current_uses + 1, updated_at = now()
  WHERE id = NEW.coupon_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;