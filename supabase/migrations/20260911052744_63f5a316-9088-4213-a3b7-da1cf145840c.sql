CREATE OR REPLACE FUNCTION public.prevent_additional_self_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'An account role is already assigned';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.prevent_additional_self_role() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_additional_self_role() TO service_role;
CREATE TRIGGER prevent_additional_self_role_before_insert
BEFORE INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_additional_self_role();

DROP POLICY IF EXISTS "insert first customer or partner role" ON public.user_roles;
CREATE POLICY "insert own customer or partner role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role IN ('customer'::public.app_role, 'partner'::public.app_role)
);