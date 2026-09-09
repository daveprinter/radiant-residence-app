import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Guard } from "@/components/Guard";
import { PageHeader } from "@/components/AppShell";
import { STAGES } from "@/lib/brightride";
import { pretty } from "@/lib/platform";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Workshop jobs — BrightRide Laundry" },
      {
        name: "description",
        content:
          "Laundry workers see the items assigned to them and move each one through washing, drying, ironing and packing.",
      },
      { property: "og:title", content: "Workshop jobs — BrightRide Laundry" },
      { property: "og:description", content: "Move laundry items through each cleaning stage." },
    ],
  }),
  component: () => (
    <Guard allow={["staff", "admin"]}>
      <StaffBoard />
    </Guard>
  ),
});

function StaffBoard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["staff-jobs"],
    refetchInterval: 20000,
    queryFn: async () => {
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .not("status", "in", "(delivered,cancelled)")
        .order("created_at", { ascending: false })
        .limit(40);
      const ids = (orders ?? []).map((o) => o.id);
      const { data: items } = ids.length
        ? await supabase.from("order_items").select("*").in("order_id", ids)
        : { data: [] };
      return { orders: orders ?? [], items: items ?? [] };
    },
  });

  const advance = async (id: string, stage: string) => {
    const idx = STAGES.indexOf(stage as (typeof STAGES)[number]);
    const next = STAGES[Math.min(STAGES.length - 1, idx + 1)];
    if (!next) return;
    await supabase.from("order_items").update({ stage: next }).eq("id", id);
    toast.success(`Marked ${next}`);
    void qc.invalidateQueries({ queryKey: ["staff-jobs"] });
  };

  return (
    <div className="min-h-screen bg-background pb-16 text-ink">
      <PageHeader title="Workshop jobs" subtitle="Your assigned laundry" />

      <div className="mx-4 grid gap-2">
        {(data?.orders ?? []).map((o) => {
          const items = (data?.items ?? []).filter((i) => i.order_id === o.id);
          return (
            <div key={o.id} className="surface p-4">
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-bold">Order #{o.code}</p>
                <span className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold capitalize text-brand">
                  {pretty(o.status)}
                </span>
              </div>
              <div className="mt-2 grid gap-2">
                {items.map((i) => (
                  <div key={i.id} className="flex items-center gap-2 rounded-xl bg-muted p-2.5">
                    <span className="text-lg">{i.emoji}</span>
                    <div className="flex-1">
                      <p className="text-[12px] font-bold">
                        {i.label} ×{i.quantity}
                      </p>
                      <p className="text-[11px] capitalize text-ink/50">{i.stage}</p>
                    </div>
                    <button
                      onClick={() => void advance(i.id, i.stage)}
                      className="rounded-lg bg-ink px-3 py-1.5 text-[11px] font-bold text-primary-foreground"
                    >
                      Next stage
                    </button>
                  </div>
                ))}
                {items.length === 0 ? (
                  <p className="text-[12px] text-ink/50">No items on this order.</p>
                ) : null}
              </div>
            </div>
          );
        })}
        {data && data.orders.length === 0 ? (
          <p className="px-1 text-[12px] text-ink/50">No laundry waiting right now.</p>
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
