import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  SERVICES,
  whatsappLink,
  WHATSAPP_DISPLAY,
  type CartItem,
  type Service,
} from "@/lib/brightride";

export const Route = createFileRoute("/order")({
  head: () => ({
    meta: [
      { title: "Order a laundry service — BrightRide" },
      {
        name: "description",
        content:
          "Pick carpets, duvets, sofa sets, clothes or shoes, add them to your cart and send your BrightRide service request.",
      },
      { property: "og:title", content: "Order a laundry service — BrightRide" },
      {
        property: "og:description",
        content: "Choose what to clean, add to cart and send your request.",
      },
    ],
  }),
  component: () => (
    <Guard allow={["customer", "admin"]}>
      <OrderPage />
    </Guard>
  ),
});

function OrderPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [open, setOpen] = useState<Service | null>(null);
  const [variant, setVariant] = useState<string | undefined>();
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  const total = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  const openService = (s: Service) => {
    setOpen(s);
    setVariant(s.options?.[0]?.label);
    setSize("");
    setQty(1);
  };

  const addToCart = () => {
    if (!open) return;
    const price = open.options
      ? (open.options.find((o) => o.label === variant)?.price ?? open.basePrice)
      : open.basePrice;
    setCart((c) => [
      ...c,
      {
        id: crypto.randomUUID(),
        key: open.key,
        name: open.name,
        emoji: open.emoji,
        variant,
        size: size || undefined,
        quantity: qty,
        unitPrice: price,
      },
    ]);
    setOpen(null);
    toast.success(`${open.name} added to your service cart`);
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
          total,
          status: "pending",
          pickup_address: profile?.address ?? null,
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

      const message = buildWhatsAppMessage({
        name: `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim(),
        phone: profile?.phone ?? "",
        address: profile?.address,
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

  return (
    <AppShell>
      <PageHeader
        title="Order a new service"
        subtitle="Select what should be cleaned"
        back="/dashboard"
      />

      <div className="mx-4 grid grid-cols-2 gap-2">
        {SERVICES.map((s) => (
          <button key={s.key} onClick={() => openService(s)} className="surface p-3 text-left">
            <div className="flex items-center justify-between">
              <span className="text-2xl">{s.emoji}</span>
              {s.oldPrice ? (
                <span className="flex items-center gap-1">
                  <span className="text-[10px] text-ink/40 line-through">{ksh(s.oldPrice)}</span>
                  <span className="rounded-full bg-sun/20 px-1.5 py-0.5 text-[10px] font-bold text-sun">
                    -25%
                  </span>
                </span>
              ) : (
                <span className="text-[11px] font-bold text-ink/50">from {ksh(s.basePrice)}</span>
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

          <button
            onClick={placeOrder}
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

            {open.options ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {open.options.map((o) => (
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

            {open.sizeInput ? (
              <input
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="Size of carpet (optional) e.g. 5×8 ft"
                className="mb-3 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-[14px] outline-none focus:border-brand"
              />
            ) : null}

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
