import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import {
  buildWhatsAppMessage,
  ksh,
  orderCode,
  whatsappLink,
  WHATSAPP_DISPLAY,
  type CartItem,
} from "@/lib/brightride";
import { couponDiscount, DELIVERY_MODES, loadSettings, notify, num } from "@/lib/platform";

export const Route = createFileRoute("/order")({
  head: () => ({
    meta: [
      { title: "Order a laundry service — BrightRide" },
      {
        name: "description",
        content:
          "Pick clothes, bedding, curtains, carpets or shoes, choose pickup or delivery, apply a coupon and send your BrightRide request.",
      },
      { property: "og:title", content: "Order a laundry service — BrightRide" },
      {
        property: "og:description",
        content: "Choose what to clean, pick a time slot and send your request.",
      },
    ],
  }),
  component: () => (
    <Guard allow={["customer", "admin"]}>
      <OrderPage />
    </Guard>
  ),
});

type ServiceRow = {
  id: string;
  key: string;
  name: string;
  category: string;
  emoji: string;
  subtitle: string;
  base_price: number;
  old_price: number | null;
  options: unknown;
};

type Opt = { label: string; price: number };

function parseOptions(value: unknown): Opt[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((o) =>
    o && typeof o === "object" && "label" in o && "price" in o
      ? [{ label: String((o as Opt).label), price: Number((o as Opt).price) }]
      : [],
  );
}

function OrderPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [open, setOpen] = useState<ServiceRow | null>(null);
  const [variant, setVariant] = useState<string | undefined>();
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<string>("pickup_delivery");
  const [slot, setSlot] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);

  const { data } = useQuery({
    queryKey: ["catalogue"],
    queryFn: async () => {
      const [services, settings] = await Promise.all([
        supabase
          .from("services")
          .select("*")
          .eq("active", true)
          .order("sort_order", { ascending: true }),
        loadSettings(),
      ]);
      return { services: (services.data ?? []) as ServiceRow[], settings };
    },
  });

  const services = data?.services ?? [];
  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const baseFee = num(data?.settings["delivery"]?.["fee"], 150);
  const freeAbove = num(data?.settings["delivery"]?.["free_above"], 3000);
  const deliveryFee =
    mode === "dropoff" || subtotal === 0 || subtotal >= freeAbove ? 0 : baseFee;
  const discount = coupon?.discount ?? 0;
  const total = Math.max(0, subtotal + deliveryFee - discount);

  const openService = (s: ServiceRow) => {
    setOpen(s);
    setVariant(parseOptions(s.options)[0]?.label);
    setSize("");
    setQty(1);
  };

  const addToCart = () => {
    if (!open) return;
    const opts = parseOptions(open.options);
    const price = opts.length
      ? (opts.find((o) => o.label === variant)?.price ?? open.base_price)
      : open.base_price;
    setCart((c) => [
      ...c,
      {
        id: crypto.randomUUID(),
        key: open.key,
        name: open.name,
        emoji: open.emoji,
        ...(variant ? { variant } : {}),
        ...(size ? { size } : {}),
        quantity: qty,
        unitPrice: price,
      },
    ]);
    setOpen(null);
    toast.success(`${open.name} added to your service cart`);
  };

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    const { data: row } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code)
      .eq("active", true)
      .maybeSingle();
    if (!row) {
      toast.error("That code is not valid");
      return;
    }
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      toast.error("That code has expired");
      return;
    }
    const value = couponDiscount(row, subtotal);
    if (value <= 0) {
      toast.error(`Minimum order for this code is ${ksh(row.min_order)}`);
      return;
    }
    setCoupon({ code, discount: value });
    toast.success(`${ksh(value)} discount applied`);
  };

  const placeOrder = async () => {
    if (!user || cart.length === 0) return;
    setBusy(true);
    try {
      const code = orderCode();
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          code,
          subtotal,
          delivery_fee: deliveryFee,
          discount,
          coupon_code: coupon?.code ?? null,
          total,
          status: "pending",
          delivery_mode: mode,
          scheduled_at: slot ? new Date(slot).toISOString() : null,
          pickup_address: profile?.address ?? null,
          delivery_address: profile?.address ?? null,
          eta: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("order_items").insert(
        cart.map((i) => ({
          order_id: order.id,
          label: i.name,
          variant: [i.variant, i.size].filter(Boolean).join(" · ") || null,
          emoji: i.emoji,
          quantity: i.quantity,
          unit_price: i.unitPrice,
          stage: "queued",
        })),
      );

      if (coupon) {
        await supabase.from("coupon_redemptions").insert({
          coupon_code: coupon.code,
          user_id: user.id,
          order_id: order.id,
          discount: coupon.discount,
        });
      }

      const perHundred = num(data?.settings["loyalty"]?.["points_per_100"], 1);
      const points = Math.floor((total / 100) * perHundred);
      if (points > 0) {
        await supabase
          .from("loyalty_ledger")
          .insert({ user_id: user.id, points, reason: "order", order_id: order.id });
      }

      await notify(
        user.id,
        `Order #${code} received`,
        `We have your request for ${ksh(total)}. We will confirm your pickup shortly.`,
        "order",
      );

      const message = buildWhatsAppMessage({
        name: `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim(),
        phone: profile?.phone ?? "",
        address: profile?.address ?? null,
        code,
        items: cart,
        total,
      });
      window.open(whatsappLink(message), "_blank");
      toast.success("Request sent to BrightRide management");
      void navigate({ to: "/orders/$orderId", params: { orderId: order.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not place the order");
    } finally {
      setBusy(false);
    }
  };

  const openOptions = open ? parseOptions(open.options) : [];

  return (
    <AppShell>
      <PageHeader
        title="Order a new service"
        subtitle="Select what should be cleaned"
        back="/dashboard"
      />

      <div className="mx-4 grid grid-cols-2 gap-2">
        {services.map((s) => (
          <button key={s.key} onClick={() => openService(s)} className="surface p-3 text-left">
            <div className="flex items-center justify-between">
              <span className="text-2xl">{s.emoji}</span>
              {s.old_price ? (
                <span className="flex items-center gap-1">
                  <span className="text-[10px] text-ink/40 line-through">{ksh(s.old_price)}</span>
                  <span className="rounded-full bg-sun/20 px-1.5 py-0.5 text-[10px] font-bold text-sun">
                    sale
                  </span>
                </span>
              ) : (
                <span className="text-[11px] font-bold text-ink/50">from {ksh(s.base_price)}</span>
              )}
            </div>
            <p className="mt-2 text-[13px] font-bold">{s.name}</p>
            <p className="text-[11px] text-ink/50">{s.subtitle}</p>
            <span className="mt-2 block w-full rounded-lg border border-brand/20 py-1.5 text-center text-[12px] font-bold text-brand">
              Add to cart
            </span>
          </button>
        ))}
      </div>

      {cart.length > 0 ? (
        <div className="mx-4 mt-4">
          <h2 className="mb-2 text-[15px] font-bold">Service cart</h2>
          <div className="surface divide-y divide-border">
            {cart.map((i) => (
              <div key={i.id} className="flex items-center gap-3 p-3">
                <span className="text-xl">{i.emoji}</span>
                <div className="flex-1">
                  <p className="text-[13px] font-bold">{i.name}</p>
                  <p className="text-[11px] text-ink/50">
                    {[i.variant, i.size].filter(Boolean).join(" · ") || "Standard"} · ×{i.quantity}
                  </p>
                </div>
                <span className="text-[13px] font-bold">{ksh(i.unitPrice * i.quantity)}</span>
                <button
                  onClick={() => setCart((c) => c.filter((x) => x.id !== i.id))}
                  className="text-ink/35"
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="surface mt-3 p-4">
            <h3 className="text-[14px] font-bold">Pickup & delivery</h3>
            <div className="mt-2 flex gap-2">
              {DELIVERY_MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={`flex-1 rounded-xl px-2 py-2 text-[11px] font-bold ${
                    mode === m.value ? "bg-ink text-primary-foreground" : "bg-muted text-ink/60"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <label className="mt-3 block text-[12px] font-semibold text-ink/60">
              Preferred date & time
            </label>
            <input
              type="datetime-local"
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-[14px] outline-none focus:border-brand"
            />
            <p className="mt-1.5 text-[11px] text-ink/50">
              Pickup address: {profile?.address || "Set it in your profile"}
            </p>
          </div>

          <div className="surface mt-3 p-4">
            <h3 className="text-[14px] font-bold">Coupon</h3>
            <div className="mt-2 flex gap-2">
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="Enter a code"
                className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-[14px] outline-none focus:border-brand"
              />
              <button
                onClick={() => void applyCoupon()}
                className="rounded-xl bg-ink px-4 text-[12px] font-bold text-primary-foreground"
              >
                Apply
              </button>
            </div>
            {coupon ? (
              <p className="mt-1.5 text-[11px] font-semibold text-brand">
                {coupon.code} · {ksh(coupon.discount)} off
              </p>
            ) : null}
          </div>

          <div className="surface mt-3 p-4 text-[13px]">
            <Row label="Subtotal" value={ksh(subtotal)} />
            <Row label="Delivery fee" value={deliveryFee ? ksh(deliveryFee) : "Free"} />
            {discount ? <Row label="Discount" value={`-${ksh(discount)}`} /> : null}
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-[15px] font-bold">
              <span>Total</span>
              <span>{ksh(total)}</span>
            </div>
          </div>

          <button
            onClick={() => void placeOrder()}
            disabled={busy}
            className="mt-3 flex w-full items-center justify-between rounded-xl bg-ink px-4 py-3 text-[14px] font-bold text-primary-foreground disabled:opacity-60"
          >
            <span>{busy ? "Sending…" : "Order service now"}</span>
            <span>{ksh(total)}</span>
          </button>
          <p className="mt-1.5 text-center text-[11px] text-ink/50">
            Sends your request to WhatsApp <span className="font-semibold">{WHATSAPP_DISPLAY}</span>{" "}
            and to the management dashboard
          </p>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/40" onClick={() => setOpen(null)}>
          <div
            className="w-full rounded-t-3xl bg-card p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="text-2xl">{open.emoji}</span>
              <div>
                <p className="text-[16px] font-bold">{open.name}</p>
                <p className="text-[12px] text-ink/50">{open.subtitle}</p>
              </div>
            </div>

            {openOptions.length ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {openOptions.map((o) => (
                  <button
                    key={o.label}
                    onClick={() => setVariant(o.label)}
                    className={`rounded-xl border px-3 py-2 text-[12px] font-bold ${
                      variant === o.label
                        ? "border-brand bg-mint text-brand"
                        : "border-border text-ink/60"
                    }`}
                  >
                    {o.label} · {ksh(o.price)}
                  </button>
                ))}
              </div>
            ) : null}

            <input
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="Any note, e.g. size 5×8 ft or stain details"
              className="mb-3 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-[14px] outline-none focus:border-brand"
            />

            <div className="mb-4 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-ink/60">Quantity</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="grid size-9 place-items-center rounded-full bg-muted text-lg"
                >
                  −
                </button>
                <span className="w-6 text-center font-display text-lg font-extrabold">{qty}</span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="grid size-9 place-items-center rounded-full bg-muted text-lg"
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={addToCart}
              className="w-full rounded-xl bg-ink py-3 text-[14px] font-bold text-primary-foreground"
            >
              Add to cart
            </button>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-ink/50">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
