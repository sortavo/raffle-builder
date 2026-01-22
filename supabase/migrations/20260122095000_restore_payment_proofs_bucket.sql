-- Restore payment-proofs bucket if it was deleted
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Recreate RLS policies for payment-proofs bucket
DROP POLICY IF EXISTS "Anyone can upload payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Org members can delete payment proofs" ON storage.objects;

CREATE POLICY "Anyone can upload payment proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Anyone can view payment proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs');

CREATE POLICY "Org members can delete payment proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'payment-proofs' AND
  EXISTS (
    SELECT 1 FROM raffles r
    WHERE r.id::text = (storage.foldername(name))[1]
    AND has_org_access(auth.uid(), r.organization_id)
  )
);
