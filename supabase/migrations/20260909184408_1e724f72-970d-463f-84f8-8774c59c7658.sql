REVOKE EXECUTE ON FUNCTION public.is_team(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;