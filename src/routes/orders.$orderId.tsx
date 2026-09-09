import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { ksh, STAGES, stageProgress } from "@/lib/brightride";
import { pretty } from "@/lib/platform";

export const Route = createFileRoute("/orders/$orderId")({
  head: () => ({
    meta: [
      { title: "Cleaning progress & receipt — BrightRide Laundry" },
      {
        name: "description",
        content:
          "See what is being cleaned, follow your delivery, read the full receipt and rate your BrightRide order.",
      },
      { property: "og:title", content: "Cleaning progress & receipt — BrightRide Laundry" },
      {
        property: "og:description",
        content: "Track cleaning, view the receipt and rate the order.",
      },
    ],
  }),
  component: () => (
    <Guard allow={["customer", "admin"]}>
      <OrderDetail />
    </Guard>
  ),
});

const TIMELINE = [
  "pending",
  "approved",
  "collected",
  "processing",
  "ready",
  "out_for_delivery",
  "delivered",
] as const;

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
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["order", orderId],
    refetchInterval: 30000,
    queryFn: async () => {
      const [{ data: order }, { data: items }, { data: review }, { data: payments }] =
        await Promise.all([
          supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
          supabase.from("order_items").select("*").eq("order_id", orderId),
          supabase.from("reviews").select("*").eq("order_id", orderId).maybeSingle(),
          supabase.from("payments").select("*").eq("order_id", orderId),
        ]);
      return { order, items: items ?? [], review, payments: payments ?? [] };
    },
  });

  const order = data?.order;
  const items = data?.items ?? [];
  const overall = items.length
    ? Math.round(items.reduce((s, i) => s + stageProgress(i.stage), 0) / items.length)
    : 0;
  const timelineIdx = order ? TIMELINE.indexOf(order.status as (typeof TIMELINE)[number]) : -1;

  const shareReceipt = () => {
    if (!order) return;
    const lines = [
      `BrightRide Laundry — Receipt`,
      `Order #${order.code}`,
      ...items.map((i) => `${i.label} ×${i.quantity} — ${ksh(i.unit_price * i.quantity)}`),
      `Subtotal: ${ksh(order.subtotal || order.total)}`,
      `Delivery: ${ksh(order.delivery_fee)}`,
      `Discount: -${ksh(order.discount)}`,
      `Total: ${ksh(order.total)}`,
    ].join("\n");
    void navigator.clipboard.writeText(lines);
    toast.success("Receipt copied — you can paste and share it");
  };

  return (
    <AppShell>
      <PageHeader
        title="Order details"
        subtitle={order ? `Order #${order.code}` : "Loading…"}
        back
      />

      {order ? (
        <>
          <div className="brand-gradient mx-4 rounded-3xl p-4 text-primary-foreground">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-bold capitalize">{pretty(order.status)}</p>
              <span className="rounded-full bg-white/20 px-2.5 py-1 text-[12px] font-semibold">
                {remaining(order.eta)}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-aqua" style={{ width: `${overall}%` }} />
            </div>
            <p className="mt-1.5 text-[11px] text-primary-foreground/70">{overall}% complete</p>
          </div>

          <div className="surface mx-4 mt-3 p-4">
            <h2 className="text-[14px] font-bold">Order timeline</h2>
            <div className="mt-2 grid gap-1.5">
              {TIMELINE.map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <span
                    className={`grid size-5 place-items-center rounded-full text-[10px] font-bold ${
                      i <= timelineIdx ? "bg-brand text-primary-foreground" : "bg-muted text-ink/40"
                    }`}
                  >
                    {i <= timelineIdx ? "✓" : i + 1}
                  </span>
                  <span
                    className={`text-[12px] font-semibold capitalize ${
                      i <= timelineIdx ? "text-ink" : "text-ink/40"
                    }`}
                  >
                    {pretty(s)}
                  </span>
                </div>
              ))}
            </div>
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
            <h2 className="text-[14px] font-bold">Pickup & delivery</h2>
            <Line label="Service" value={pretty(order.delivery_mode)} />
            <Line label="Pickup" value={order.pickup_address || "Not set"} />
            <Line label="Drop-off" value={order.delivery_address || order.pickup_address || "Not set"} />
            <Line
              label="Scheduled"
              value={
                order.scheduled_at
                  ? new Date(order.scheduled_at).toLocaleString("en-KE", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "To be confirmed"
              }
            />
            <Line label="Delivery status" value={pretty(order.delivery_status)} />
          </div>

          <div className="surface mx-4 mt-3 p-4">
            <h2 className="text-[14px] font-bold">Receipt</h2>
            <Line label="Subtotal" value={ksh(order.subtotal || order.total)} />
            <Line label="Delivery fee" value={order.delivery_fee ? ksh(order.delivery_fee) : "Free"} />
            <Line label="Discount" value={order.discount ? `-${ksh(order.discount)}` : "—"} />
            {order.coupon_code ? <Line label="Coupon" value={order.coupon_code} /> : null}
            <Line label="Payment" value={pretty(order.payment_status)} />
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-[15px] font-bold">
              <span>Total</span>
              <span>{ksh(order.total)}</span>
            </div>
            <button
              onClick={shareReceipt}
              className="mt-3 w-full rounded-xl border border-brand/30 py-2.5 text-[12px] font-bold text-brand"
            >
              Copy / share receipt
            </button>
          </div>

          {user && order.user_id === user.id ? (
            <RateOrder
              orderId={order.id}
              userId={user.id}
              existing={data?.review ?? null}
              onSaved={() => void qc.invalidateQueries({ queryKey: ["order", orderId] })}
            />
          ) : null}
        </>
      ) : null}
    </AppShell>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-1.5 flex justify-between text-[13px]">
      <span className="text-ink/50">{label}</span>
      <span className="text-right font-semibold capitalize">{value}</span>
    </div>
  );
}

type ReviewRow = {
  quality: number;
  delivery: number;
  service: number;
  overall: number;
  comment: string | null;
};

function RateOrder({
  orderId,
  userId,
  existing,
  onSaved,
}: {
  orderId: string;
  userId: string;
  existing: ReviewRow | null;
  onSaved: () => void;
}) {
  const [quality, setQuality] = useState(existing?.quality ?? 5);
  const [delivery, setDelivery] = useState(existing?.delivery ?? 5);
  const [service, setService] = useState(existing?.service ?? 5);
  const [overall, setOverall] = useState(existing?.overall ?? 5);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("reviews")
      .upsert(
        {
          order_id: orderId,
          user_id: userId,
          quality,
          delivery,
          service,
          overall,
          comment: comment.trim() || null,
        },
        { onConflict: "order_id" },
      );
    setBusy(false);
    if (error) {
      toast.error("Could not save your rating");
      return;
    }
    toast.success("Thank you for the feedback");
    onSaved();
  };

  return (
    <div className="surface mx-4 mt-3 p-4">
      <h2 className="text-[14px] font-bold">Rate this order</h2>
      <Stars label="Laundry quality" value={quality} onChange={setQuality} />
      <Stars label="Delivery" value={delivery} onChange={setDelivery} />
      <Stars label="Customer service" value={service} onChange={setService} />
      <Stars label="Overall" value={overall} onChange={setOverall} />
      <textarea
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Tell us how it went (optional)"
        className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-brand"
      />
      <button
        onClick={() => void save()}
        disabled={busy}
        className="mt-2 w-full rounded-xl bg-ink py-2.5 text-[13px] font-bold text-primary-foreground disabled:opacity-60"
      >
        {existing ? "Update rating" : "Submit rating"}
      </button>
    </div>
  );
}

function Stars({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="mt-2 flex items-center justify-between">
      <span className="text-[12px] font-semibold text-ink/60">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            aria-label={`${label} ${n} stars`}
            className={`text-lg ${n <= value ? "opacity-100" : "opacity-25"}`}
          >
            ⭐
          </button>
        ))}
      </div>
    </div>
  );
}
