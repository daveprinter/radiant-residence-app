import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { ksh, loadSettings, loyaltyTier, num, referralLink } from "@/lib/platform";

export const Route = createFileRoute("/rewards")({
  head: () => ({
    meta: [
      { title: "Rewards, coupons & referrals — BrightRide" },
      {
        name: "description",
        content:
          "Check your BrightRide loyalty points and level, grab a discount code and invite friends for free laundry credit.",
      },
      { property: "og:title", content: "Rewards, coupons & referrals — BrightRide" },
      { property: "og:description", content: "Loyalty points, discount codes and referral credit." },
    ],
  }),
  component: () => (
    <Guard allow={["customer", "partner", "admin"]}>
      <Rewards />
    </Guard>
  ),
});

function Rewards() {
  const { user, profile } = useAuth();

  const { data } = useQuery({
    queryKey: ["rewards", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [ledger, coupons, used, settings] = await Promise.all([
        supabase
          .from("loyalty_ledger")
          .select("*")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false }),
        supabase.from("coupons").select("*").eq("active", true).order("created_at"),
        supabase.from("coupon_redemptions").select("coupon_code").eq("user_id", user!.id),
        loadSettings(),
      ]);
      return {
        ledger: ledger.data ?? [],
        coupons: coupons.data ?? [],
        used: (used.data ?? []).map((r) => r.coupon_code),
        settings,
      };
    },
  });

  const points = (data?.ledger ?? []).reduce((s, l) => s + (l.points ?? 0), 0);
  const tier = loyaltyTier(points);
  const kshPerPoint = num(data?.settings["loyalty"]?.["ksh_per_point"], 0.5);
  const code = profile?.referral_code ?? "";

  return (
    <AppShell>
      <PageHeader title="Rewards" subtitle="Points, coupons and referrals" />

      <div className="brand-gradient mx-4 rounded-3xl p-4 text-primary-foreground">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
          Loyalty points
        </p>
        <p className="font-display text-3xl font-extrabold">{points}</p>
        <p className="mt-1 text-[12px] text-primary-foreground/75">
          {tier.name} member · worth {ksh(points * kshPerPoint)} in discounts
        </p>
        {tier.nextAt ? (
          <>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-aqua"
                style={{ width: `${Math.min(100, Math.round((points / tier.nextAt) * 100))}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-primary-foreground/70">
              {tier.nextAt - points} points to {tier.next}
            </p>
          </>
        ) : null}
      </div>

      <div className="mx-4 mt-4 grid gap-2">
        <h2 className="text-[15px] font-bold">Available coupons</h2>
        {(data?.coupons ?? []).map((c) => {
          const spent = data?.used.includes(c.code);
          return (
            <div key={c.id} className="surface p-4">
              <div className="flex items-center justify-between">
                <p className="font-display text-[16px] font-extrabold tracking-wide">{c.code}</p>
                <span className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold text-brand">
                  {c.kind === "percent" ? `${c.amount}% off` : `${ksh(c.amount)} off`}
                </span>
              </div>
              <p className="mt-1 text-[12px] text-ink/60">{c.description}</p>
              <p className="mt-1 text-[11px] text-ink/45">
                {c.min_order > 0 ? `Minimum order ${ksh(c.min_order)} · ` : ""}
                {c.expires_at
                  ? `Expires ${new Date(c.expires_at).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}`
                  : "No expiry"}
                {spent ? " · already used" : ""}
              </p>
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(c.code);
                  toast.success("Coupon code copied — use it at checkout");
                }}
                className="mt-2 rounded-xl bg-ink px-3.5 py-2 text-[12px] font-bold text-primary-foreground"
              >
                Copy code
              </button>
            </div>
          );
        })}
      </div>

      <div className="surface mx-4 mt-4 p-4">
        <h2 className="text-[15px] font-bold">Invite a friend</h2>
        <p className="mt-1 text-[12px] text-ink/60">
          Your friend gets KSh 100 off their first order and you receive KSh 100 credit.
        </p>
        <p className="mt-2 font-display text-2xl font-extrabold tracking-wide text-brand">
          {code || "—"}
        </p>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => {
              void navigator.clipboard.writeText(referralLink(code));
              toast.success("Invite link copied");
            }}
            className="flex-1 rounded-xl bg-ink py-2.5 text-[12px] font-bold text-primary-foreground"
          >
            Copy invite link
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              `Get your laundry done by BrightRide. Use my code ${code} for KSh 100 off: ${referralLink(code)}`,
            )}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-xl border border-brand/30 py-2.5 text-center text-[12px] font-bold text-brand"
          >
            Share on WhatsApp
          </a>
        </div>
      </div>

      <div className="mx-4 mt-4 grid gap-2">
        <h2 className="text-[15px] font-bold">Points history</h2>
        {(data?.ledger ?? []).map((l) => (
          <div key={l.id} className="surface flex items-center justify-between p-3.5">
            <div>
              <p className="text-[13px] font-bold capitalize">{l.reason}</p>
              <p className="text-[11px] text-ink/50">
                {new Date(l.created_at).toLocaleDateString("en-KE", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
            <span className={`text-[13px] font-bold ${l.points < 0 ? "text-destructive" : "text-brand"}`}>
              {l.points > 0 ? "+" : ""}
              {l.points}
            </span>
          </div>
        ))}
        {data && data.ledger.length === 0 ? (
          <p className="px-1 text-[12px] text-ink/50">
            Place an order to start collecting points.
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
