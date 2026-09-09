import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { ksh } from "@/lib/brightride";

export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "My orders — BrightRide Laundry" },
      {
        name: "description",
        content: "Every BrightRide laundry order you have placed, with status and totals.",
      },
      { property: "og:title", content: "My orders — BrightRide Laundry" },
      { property: "og:description", content: "Your BrightRide laundry orders and their status." },
    ],
  }),
  component: () => (
    <Guard allow={["customer", "admin"]}>
      <Orders />
    </Guard>
  ),
});

function Orders() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return rows ?? [];
    },
  });

  return (
    <AppShell>
      <PageHeader title="My orders" subtitle="Everything you've sent for cleaning" />
      <div className="mx-4 grid gap-2">
        {(data ?? []).map((o) => (
          <Link key={o.id} to="/orders/$orderId" params={{ orderId: o.id }} className="surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-bold">Order #{o.code}</p>
              <span className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold capitalize text-brand">
                {o.status}
              </span>
            </div>
            <p className="mt-1 text-[12px] text-ink/50">
              {new Date(o.created_at).toLocaleDateString("en-KE", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}{" "}
              · {ksh(o.total)}
            </p>
          </Link>
        ))}
        {data && data.length === 0 ? (
          <div className="surface p-6 text-center">
            <p className="text-[13px] text-ink/60">You haven't placed any orders yet.</p>
            <Link
              to="/order"
              className="mt-3 inline-block rounded-xl bg-ink px-4 py-2.5 text-[13px] font-bold text-primary-foreground"
            >
              Order a service
            </Link>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
