-- Fix payment-proofs bucket to be public so proof links work
UPDATE storage.buckets 
SET public = true 
WHERE id = 'payment-proofs';

-- Ensure RLS policies allow public read access
DROP POLICY IF EXISTS "Anyone can view payment proofs" ON storage.objects;
CREATE POLICY "Anyone can view payment proofs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'payment-proofs');