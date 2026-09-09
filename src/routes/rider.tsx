import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Guard } from "@/components/Guard";
import { PageHeader } from "@/components/AppShell";
import { DELIVERY_STATUSES, ksh, notify, pretty } from "@/lib/platform";

export const Route = createFileRoute("/rider")({
  head: () => ({
    meta: [
      { title: "My deliveries — BrightRide Laundry" },
      {
        name: "description",
        content:
          "Riders see their assigned laundry pickups and drop-offs and mark each one picked up, on route or delivered.",
      },
      { property: "og:title", content: "My deliveries — BrightRide Laundry" },
      { property: "og:description", content: "Assigned pickups and drop-offs for riders." },
    ],
  }),
  component: () => (
    <Guard allow={["rider", "admin"]}>
      <RiderBoard />
    </Guard>
  ),
});

function RiderBoard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["rider-jobs", user?.id],
    enabled: !!user,
    refetchInterval: 20000,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("orders")
        .select("*")
        .eq("rider_id", user!.id)
        .not("delivery_status", "in", "(delivered,failed)")
        .order("created_at", { ascending: false });
      return rows ?? [];
    },
  });

  const setStatus = async (id: string, ownerId: string, code: string, status: string) => {
    await supabase
      .from("orders")
      .update({
        delivery_status: status,
        ...(status === "delivered" ? { status: "delivered" } : {}),
      })
      .eq("id", id);
    await notify(ownerId, `Order #${code}`, `Delivery update: ${pretty(status)}`, "delivery");
    toast.success(pretty(status));
    void qc.invalidateQueries({ queryKey: ["rider-jobs", user?.id] });
  };

  const next = (current: string) => {
    const i = DELIVERY_STATUSES.indexOf(current as (typeof DELIVERY_STATUSES)[number]);
    return DELIVERY_STATUSES[Math.min(DELIVERY_STATUSES.length - 2, Math.max(1, i + 1))] ?? "assigned";
  };

  return (
    <div className="min-h-screen bg-background pb-16 text-ink">
      <PageHeader title="My deliveries" subtitle="Pickups and drop-offs assigned to you" />

      <div className="mx-4 grid gap-2">
        {(data ?? []).map((o) => (
          <div key={o.id} className="surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-bold">Order #{o.code}</p>
              <span className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold capitalize text-brand">
                {pretty(o.delivery_status)}
              </span>
            </div>
            <p className="mt-1 text-[12px] text-ink/60">
              Pickup: {o.pickup_address || "Not set"}
            </p>
            <p className="text-[12px] text-ink/60">
              Drop-off: {o.delivery_address || o.pickup_address || "Not set"}
            </p>
            <p className="mt-1 text-[12px] font-semibold">
              {ksh(o.total)} · {pretty(o.payment_status)}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => void setStatus(o.id, o.user_id, o.code, next(o.delivery_status))}
                className="flex-1 rounded-xl bg-ink py-2 text-[12px] font-bold capitalize text-primary-foreground"
              >
                Mark {pretty(next(o.delivery_status))}
              </button>
              <button
                onClick={() => void setStatus(o.id, o.user_id, o.code, "delivered")}
                className="flex-1 rounded-xl border border-brand/30 py-2 text-[12px] font-bold text-brand"
              >
                Delivered
              </button>
              <button
                onClick={() => void setStatus(o.id, o.user_id, o.code, "failed")}
                className="rounded-xl border border-destructive/30 px-3 py-2 text-[12px] font-bold text-destructive"
              >
                Failed
              </button>
            </div>
          </div>
        ))}
        {data && data.length === 0 ? (
          <p className="px-1 text-[12px] text-ink/50">No deliveries assigned to you yet.</p>
        ) : null}
      </div>

      <button
        onClick={async () => {
          await signOut();
          void navigate({ to: "/auth" });
        }}
        className="mx-4 mt-6 w-[calc(100%-2rem)] rounded-xl border border-destructive/30 py-3 text-[13px] font-bold text-destructive"
      >
        Sign out
      </button>
    </div>
  );
}
