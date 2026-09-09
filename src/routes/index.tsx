import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Splash } from "@/components/Splash";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BrightRide Laundry Services — Pickup & Delivery in Nairobi" },
      {
        name: "description",
        content:
          "Order laundry, carpet, duvet and sofa cleaning from BrightRide. Track your cleaning live, chat with the team and get pickup and delivery.",
      },
      { property: "og:title", content: "BrightRide Laundry Services" },
      {
        property: "og:description",
        content: "Order laundry cleaning, track progress live and get pickup and delivery.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const [minTime, setMinTime] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinTime(true), 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (loading || !minTime) return;
    if (!user) {
      void navigate({ to: "/auth" });
    } else if (roles.includes("admin")) {
      void navigate({ to: "/admin" });
    } else if (roles.includes("partner")) {
      void navigate({ to: "/partner" });
    } else {
      void navigate({ to: "/dashboard" });
    }
  }, [loading, minTime, user, roles, navigate]);

  return <Splash />;
}
