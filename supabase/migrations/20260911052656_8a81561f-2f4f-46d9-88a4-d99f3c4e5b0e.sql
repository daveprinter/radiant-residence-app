DROP POLICY IF EXISTS "insert own role" ON public.user_roles;
CREATE POLICY "insert first customer or partner role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role IN ('customer'::public.app_role, 'partner'::public.app_role)
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles existing
    WHERE existing.user_id = auth.uid()
  )
);