-- Allow Platform Admins to update any organization (for verification, etc.)
CREATE POLICY "Platform admins can update any organization" 
ON public.organizations 
FOR UPDATE 
USING (is_platform_admin(auth.uid()));