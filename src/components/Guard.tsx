import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Splash } from "@/components/Splash";
import { useAuth, type Role } from "@/lib/auth";

export function Guard({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      void navigate({ to: "/auth" });
      return;
    }
    if (roles.length && !roles.some((r) => allow.includes(r))) {
      if (roles.includes("admin")) void navigate({ to: "/admin" });
      else if (roles.includes("staff")) void navigate({ to: "/staff" });
      else if (roles.includes("rider")) void navigate({ to: "/rider" });
      else if (roles.includes("partner")) void navigate({ to: "/partner" });
      else void navigate({ to: "/dashboard" });
    }
  }, [loading, user, roles, allow, navigate]);

  if (loading || !user) return <Splash label="Loading your account…" />;
  return <>{children}</>;
}
