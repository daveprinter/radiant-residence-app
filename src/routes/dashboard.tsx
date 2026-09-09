import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { InstallPrompt } from "@/components/InstallPrompt";
import { LocationBanner } from "@/components/LocationBanner";
import { ksh, SERVICES, stageProgress } from "@/lib/brightride";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "My laundry dashboard — BrightRide" },
      {
        name: "description",
        content:
          "See your ongoing cleaning, order new laundry services and reach the BrightRide team.",
      },
      { property: "og:title", content: "My laundry dashboard — BrightRide" },
      {
        property: "og:description",
        content: "Track ongoing cleaning and order new laundry services.",
      },
    ],
  }),
  component: () => (
    <Guard allow={["customer", "admin"]}>
      <Dashboard />
    </Guard>
  ),
});

function Dashboard() {
  const { user, profile } = useAuth();

  const { data } = useQuery({
    queryKey: ["active-order", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user!.id)
        .not("status", "in", "(delivered,cancelled)")
        .order("created_at", { ascending: false })
        .limit(1);
      const order = orders?.[0];
      if (!order) return null;
      const { data: items } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", order.id);
      return { order, items: items ?? [] };
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["order-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: rows } = await supabase.from("orders").select("total,status").eq("user_id", user!.id);
      const all = rows ?? [];
      return {
        count: all.length,
        spent: all.reduce((s, r) => s + (r.total ?? 0), 0),
      };
    },
  });

  const items = data?.items ?? [];
  const overall = items.length
    ? Math.round(items.reduce((s, i) => s + stageProgress(i.stage), 0) / items.length)
    : 0;

  return (
    <AppShell>
      <InstallPrompt />
      <LocationBanner />

      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand/60">
            Welcome back
          </p>
          <h1 className="font-display text-[22px] font-extrabold leading-tight">
            Hi, {profile?.first_name || "there"}
          </h1>
        </div>
        <Link
          to="/settings"
          className="grid size-10 place-items-center rounded-full bg-card text-lg shadow-sm"
        >
          👤
        </Link>
      </div>

      <div className="mx-4 grid grid-cols-2 gap-2">
        <div className="surface p-3">
          <p className="text-[11px] font-semibold text-ink/50">Total orders</p>
          <p className="font-display text-lg font-extrabold">{stats?.count ?? 0}</p>
        </div>
        <div className="surface p-3">
          <p className="text-[11px] font-semibold text-ink/50">Total spent</p>
          <p className="font-display text-lg font-extrabold">{ksh(stats?.spent ?? 0)}</p>
        </div>
      </div>

      <div className="mx-4 mt-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[15px] font-bold">Ongoing cleaning</h2>
          {data?.order ? (
            <span className="text-[12px] font-semibold text-brand">Order #{data.order.code}</span>
          ) : null}
        </div>

        {data?.order ? (
          <Link
            to="/orders/$orderId"
            params={{ orderId: data.order.id }}
            className="brand-gradient relative block overflow-hidden rounded-3xl p-4 text-primary-foreground shadow-md"
          >
            <div className="laundro absolute -right-6 -top-6 grid size-28 place-items-center rounded-full bg-white/10 text-4xl">
              🫧
            </div>
            <div className="relative flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-white/15 text-2xl">
                🧺
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-bold capitalize">{data.order.status}</p>
                <p className="text-[12px] text-primary-foreground/70">
                  {items.length} item{items.length === 1 ? "" : "s"} in this order
                </p>
              </div>
              {data.order.eta ? (
                <span className="rounded-full bg-white/20 px-2 py-1 text-[12px] font-semibold">
                  ETA{" "}
                  {new Date(data.order.eta).toLocaleTimeString("en-KE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              ) : null}
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-aqua" style={{ width: `${overall}%` }} />
            </div>
            <p className="mt-1.5 text-[11px] font-medium text-primary-foreground/70">
              {overall}% complete
            </p>
            <div className="relative mt-3 grid grid-cols-3 gap-2">
              {items.slice(0, 3).map((i) => (
                <div key={i.id} className="rounded-xl bg-white/10 p-2 text-center">
                  <p className="text-lg">{i.emoji}</p>
                  <p className="text-[11px] font-semibold">{i.label}</p>
                  <div className="mt-1 h-1 rounded-full bg-white/25">
                    <div
                      className="h-full rounded-full bg-aqua"
                      style={{ width: `${stageProgress(i.stage)}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-[10px] capitalize text-primary-foreground/70">
                    {i.stage}
                  </p>
                </div>
              ))}
            </div>
            <span className="mt-3 block w-full rounded-xl bg-card py-2.5 text-center text-[13px] font-bold text-brand">
              View order details
            </span>
          </Link>
        ) : (
          <div className="surface p-5 text-center">
            <p className="text-[13px] text-ink/60">No cleaning in progress right now.</p>
            <Link
              to="/order"
              className="mt-3 inline-block rounded-xl bg-ink px-4 py-2.5 text-[13px] font-bold text-primary-foreground"
            >
              Order a service
            </Link>
          </div>
        )}
      </div>

      <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
        <Tile to="/wallet" icon="💳" title="Wallet" sub="Pay & top up" />
        <Tile to="/rewards" icon="🎁" title="Rewards" sub="Points & coupons" />
        <Tile to="/notifications" icon="🔔" title="Alerts" sub="Order updates" />
        <Tile to="/complaints" icon="⚠️" title="Complaints" sub="File to management" />
      </div>

      <div className="mx-4 mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[15px] font-bold">Order a new service</h2>
          <span className="text-[12px] font-semibold text-brand/70">KSh 350 / basket</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {SERVICES.slice(0, 4).map((s) => (
            <Link key={s.key} to="/order" className="surface p-3">
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
                  <span className="text-[11px] font-bold text-ink/50">{ksh(s.basePrice)}</span>
                )}
              </div>
              <p className="mt-2 text-[13px] font-bold">{s.name}</p>
              <p className="text-[11px] text-ink/50">{s.subtitle}</p>
              <span className="mt-2 block w-full rounded-lg border border-brand/20 py-1.5 text-center text-[12px] font-bold text-brand">
                Add to cart
              </span>
            </Link>
          ))}
        </div>
        <Link
          to="/order"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3 text-[14px] font-bold text-primary-foreground"
        >
          Order service now <span>→</span>
        </Link>
      </div>
    </AppShell>
  );
}
