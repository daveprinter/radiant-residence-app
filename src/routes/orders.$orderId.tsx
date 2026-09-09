import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { ksh, STAGES, stageProgress } from "@/lib/brightride";

export const Route = createFileRoute("/orders/$orderId")({
  head: () => ({
    meta: [
      { title: "Cleaning progress — BrightRide Laundry" },
      {
        name: "description",
        content:
          "See exactly what is being cleaned, the stage of each item and the estimated time remaining.",
      },
      { property: "og:title", content: "Cleaning progress — BrightRide Laundry" },
      {
        property: "og:description",
        content: "What is being cleaned and how much time is left.",
      },
    ],
  }),
  component: () => (
    <Guard allow={["customer", "admin"]}>
      <OrderDetail />
    </Guard>
  ),
});

function remaining(eta: string | null) {
  if (!eta) return "Being scheduled";
  const ms = new Date(eta).getTime() - Date.now();
  if (ms <= 0) return "Ready very soon";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m remaining` : `${m}m remaining`;
}

function OrderDetail() {
  const { orderId } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["order", orderId],
    refetchInterval: 30000,
    queryFn: async () => {
      const [{ data: order }, { data: items }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", orderId),
      ]);
      return { order, items: items ?? [] };
    },
  });

  const order = data?.order;
  const items = data?.items ?? [];
  const overall = items.length
    ? Math.round(items.reduce((s, i) => s + stageProgress(i.stage), 0) / items.length)
    : 0;

  return (
    <AppShell>
      <PageHeader
        title="Ongoing cleaning"
        subtitle={order ? `Order #${order.code}` : "Loading…"}
        back
      />

      {order ? (
        <>
          <div className="brand-gradient mx-4 rounded-3xl p-4 text-primary-foreground">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-bold capitalize">{order.status}</p>
              <span className="rounded-full bg-white/20 px-2.5 py-1 text-[12px] font-semibold">
                {remaining(order.eta)}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-aqua" style={{ width: `${overall}%` }} />
            </div>
            <p className="mt-1.5 text-[11px] text-primary-foreground/70">{overall}% complete</p>
          </div>

          <div className="mx-4 mt-4 grid gap-2">
            <h2 className="text-[15px] font-bold">Items being cleaned</h2>
            {items.map((i) => {
              const idx = STAGES.indexOf(i.stage as (typeof STAGES)[number]);
              return (
                <div key={i.id} className="surface p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-2xl bg-mint text-xl">
                      {i.emoji}
                    </span>
                    <div className="flex-1">
                      <p className="text-[14px] font-bold">
                        {i.label} <span className="text-ink/40">×{i.quantity}</span>
                      </p>
                      <p className="text-[11px] text-ink/50">
                        {i.variant || "Standard"} · {ksh(i.unit_price * i.quantity)}
                      </p>
                    </div>
                    <span className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold capitalize text-brand">
                      {i.stage}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${stageProgress(i.stage)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between">
                    {STAGES.map((s, si) => (
                      <span
                        key={s}
                        className={`text-[9px] font-semibold capitalize ${
                          si <= idx ? "text-brand" : "text-ink/30"
                        }`}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="surface mx-4 mt-4 p-4">
            <div className="flex justify-between text-[13px]">
              <span className="text-ink/50">Pickup address</span>
              <span className="font-semibold">{order.pickup_address || "Not set"}</span>
            </div>
            <div className="mt-2 flex justify-between text-[14px] font-bold">
              <span>Total</span>
              <span>{ksh(order.total)}</span>
            </div>
          </div>
        </>
      ) : null}
    </AppShell>
  );
}
