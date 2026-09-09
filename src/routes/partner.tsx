import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Guard } from "@/components/Guard";
import { PageHeader } from "@/components/AppShell";
import {
  ksh,
  loadSettings,
  num,
  partnerLevel,
  PARTNER_LEVELS,
  referralLink,
  pretty,
} from "@/lib/platform";

export const Route = createFileRoute("/partner")({
  head: () => ({
    meta: [
      { title: "Partner dashboard — BrightRide referrals & commission" },
      {
        name: "description",
        content:
          "Share your BrightRide referral link, follow your referrals and commission, request payouts and download marketing materials.",
      },
      { property: "og:title", content: "Partner dashboard — BrightRide referrals & commission" },
      {
        property: "og:description",
        content: "Referrals, commission, payouts and marketing materials.",
      },
    ],
  }),
  component: () => (
    <Guard allow={["partner", "admin"]}>
      <Partner />
    </Guard>
  ),
});

type Tab = "overview" | "analytics" | "customers" | "payouts" | "materials";
const TABS: Tab[] = ["overview", "analytics", "customers", "payouts", "materials"];

function Partner() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");

  const { data } = useQuery({
    queryKey: ["partner", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [referrals, withdrawals, materials, settings] = await Promise.all([
        supabase
          .from("referrals")
          .select("*")
          .eq("partner_id", user!.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("withdrawals")
          .select("*")
          .eq("partner_id", user!.id)
          .order("created_at", { ascending: false }),
        supabase.from("marketing_materials").select("*").order("created_at", { ascending: false }),
        loadSettings(),
      ]);
      return {
        referrals: referrals.data ?? [],
        withdrawals: withdrawals.data ?? [],
        materials: materials.data ?? [],
        settings,
      };
    },
  });

  const referrals = data?.referrals ?? [];
  const withdrawals = data?.withdrawals ?? [];
  const earned = referrals.reduce((s, r) => s + (r.commission ?? 0), 0);
  const revenue = referrals.reduce((s, r) => s + (r.revenue ?? 0), 0);
  const active = referrals.filter((r) => r.status === "active").length;
  const paidOut = withdrawals
    .filter((w) => w.status === "paid")
    .reduce((s, w) => s + (w.amount ?? 0), 0);
  const pendingOut = withdrawals
    .filter((w) => w.status === "pending")
    .reduce((s, w) => s + (w.amount ?? 0), 0);
  const available = Math.max(0, earned - paidOut - pendingOut);
  const level = partnerLevel(referrals.length);
  const rate = num(data?.settings["commission"]?.["percent"], 10);
  const minWithdrawal = num(data?.settings["commission"]?.["min_withdrawal"], 1000);
  const code = profile?.referral_code ?? "";
  const target = 50;

  const monthly = referrals.reduce<Record<string, { count: number; revenue: number }>>(
    (acc, r) => {
      const key = new Date(r.created_at).toLocaleDateString("en-KE", {
        month: "short",
        year: "2-digit",
      });
      const cur = acc[key] ?? { count: 0, revenue: 0 };
      acc[key] = { count: cur.count + 1, revenue: cur.revenue + (r.revenue ?? 0) };
      return acc;
    },
    {},
  );
  const months = Object.entries(monthly).slice(-6);
  const peak = Math.max(1, ...months.map(([, m]) => m.revenue));

  const requestWithdrawal = async () => {
    const value = Number(amount);
    if (!user || !Number.isFinite(value) || value <= 0) return;
    if (value < minWithdrawal) {
      toast.error(`Minimum withdrawal is ${ksh(minWithdrawal)}`);
      return;
    }
    if (value > available) {
      toast.error("That is more than your available balance");
      return;
    }
    const { error } = await supabase.from("withdrawals").insert({
      partner_id: user.id,
      amount: value,
      destination: destination.trim() || profile?.phone || "",
    });
    if (error) {
      toast.error("Could not send the request");
      return;
    }
    setAmount("");
    toast.success("Withdrawal requested");
    void qc.invalidateQueries({ queryKey: ["partner", user.id] });
  };

  return (
    <div className="min-h-screen bg-background pb-10 text-ink">
      <PageHeader title="Partner dashboard" subtitle={`${level.name} partner · ${rate}% commission`} />

      <div className="mx-4 mb-3 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-xl px-3 py-2 text-[12px] font-bold capitalize ${
              tab === t ? "bg-ink text-primary-foreground" : "bg-card text-ink/60"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <>
          <div className="brand-gradient mx-4 rounded-3xl p-4 text-primary-foreground">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
              Your referral link
            </p>
            <p className="font-display text-2xl font-extrabold tracking-wide">{code || "—"}</p>
            <p className="mt-1 break-all text-[11px] text-primary-foreground/70">
              {referralLink(code)}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(referralLink(code));
                  toast.success("Referral link copied");
                }}
                className="rounded-xl bg-white/20 px-3.5 py-2 text-[13px] font-bold"
              >
                Copy link
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Get your laundry done by BrightRide. Sign up with my link: ${referralLink(code)}`,
                )}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-white/20 px-3.5 py-2 text-[13px] font-bold"
              >
                Share on WhatsApp
              </a>
            </div>
          </div>

          <div className="mx-4 mt-3 grid grid-cols-3 gap-2">
            <Stat label="Referrals" value={String(referrals.length)} />
            <Stat label="Active" value={String(active)} />
            <Stat label="Revenue" value={ksh(revenue)} />
            <Stat label="Commission" value={ksh(earned)} />
            <Stat label="Pending" value={ksh(pendingOut)} />
            <Stat label="Paid" value={ksh(paidOut)} />
          </div>

          <div className="surface mx-4 mt-3 p-4">
            <h2 className="text-[14px] font-bold">Partner level</h2>
            <p className="mt-1 text-[12px] text-ink/60">
              {level.name}
              {level.nextAt ? ` · ${level.nextAt - referrals.length} more to reach ${level.next}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PARTNER_LEVELS.map((l) => (
                <span
                  key={l.name}
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    referrals.length >= l.min ? "bg-mint text-brand" : "bg-muted text-ink/40"
                  }`}
                >
                  {l.name} · {l.min}
                </span>
              ))}
            </div>
          </div>

          <div className="surface mx-4 mt-3 p-4">
            <h2 className="text-[14px] font-bold">Monthly target</h2>
            <p className="mt-1 text-[12px] text-ink/60">
              {referrals.length} / {target} customers · KSh 2,000 bonus at {target}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${Math.min(100, (referrals.length / target) * 100)}%` }}
              />
            </div>
          </div>
        </>
      ) : null}

      {tab === "analytics" ? (
        <div className="surface mx-4 p-4">
          <h2 className="text-[14px] font-bold">Revenue generated</h2>
          {months.length === 0 ? (
            <p className="mt-2 text-[12px] text-ink/50">No referral activity yet.</p>
          ) : (
            <div className="mt-3 flex h-32 items-end gap-2">
              {months.map(([label, m]) => (
                <div key={label} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-lg bg-brand"
                    style={{ height: `${Math.max(6, (m.revenue / peak) * 100)}%` }}
                  />
                  <span className="text-[10px] text-ink/50">{label}</span>
                  <span className="text-[10px] font-bold">{m.count}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Stat
              label="Conversion"
              value={`${referrals.length ? Math.round((active / referrals.length) * 100) : 0}%`}
            />
            <Stat
              label="Revenue / customer"
              value={ksh(referrals.length ? revenue / referrals.length : 0)}
            />
          </div>
        </div>
      ) : null}

      {tab === "customers" ? (
        <div className="mx-4 grid gap-2">
          {referrals.map((r) => (
            <div key={r.id} className="surface flex items-center justify-between p-4">
              <div>
                <p className="text-[13px] font-bold">{r.customer_name}</p>
                <p className="text-[11px] capitalize text-ink/50">
                  {new Date(r.created_at).toLocaleDateString("en-KE", {
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  · {r.status} · {ksh(r.revenue ?? 0)}
                </p>
              </div>
              <span className="text-[13px] font-bold text-brand">{ksh(r.commission ?? 0)}</span>
            </div>
          ))}
          {referrals.length === 0 ? (
            <p className="px-1 text-[12px] text-ink/50">
              No referrals yet — share your link to start earning.
            </p>
          ) : null}
        </div>
      ) : null}

      {tab === "payouts" ? (
        <>
          <div className="surface mx-4 p-4">
            <h2 className="text-[14px] font-bold">Request a payout</h2>
            <p className="mt-1 text-[12px] text-ink/60">
              Available {ksh(available)} · minimum {ksh(minWithdrawal)}
            </p>
            <input
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Amount in KSh"
              className="mt-2 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-[14px] outline-none focus:border-brand"
            />
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={`M-Pesa number (${profile?.phone || "07…"})`}
              className="mt-2 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-[14px] outline-none focus:border-brand"
            />
            <button
              onClick={() => void requestWithdrawal()}
              className="mt-2 w-full rounded-xl bg-ink py-3 text-[14px] font-bold text-primary-foreground"
            >
              Request withdrawal
            </button>
          </div>

          <div className="mx-4 mt-3 grid gap-2">
            {withdrawals.map((w) => (
              <div key={w.id} className="surface flex items-center justify-between p-3.5">
                <div>
                  <p className="text-[13px] font-bold">{ksh(w.amount)}</p>
                  <p className="text-[11px] capitalize text-ink/50">
                    {pretty(w.status)} ·{" "}
                    {new Date(w.created_at).toLocaleDateString("en-KE", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <span className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold capitalize text-brand">
                  {w.method}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {tab === "materials" ? (
        <div className="mx-4 grid gap-2">
          {(data?.materials ?? []).map((m) => (
            <div key={m.id} className="surface p-4">
              <p className="text-[13px] font-bold">{m.title}</p>
              <p className="text-[11px] capitalize text-ink/50">{m.kind}</p>
              {m.body ? <p className="mt-1 text-[12px] text-ink/60">{m.body}</p> : null}
              {m.url ? (
                <a
                  href={m.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block rounded-xl bg-ink px-3.5 py-2 text-[12px] font-bold text-primary-foreground"
                >
                  Open / download
                </a>
              ) : null}
            </div>
          ))}
          {data && data.materials.length === 0 ? (
            <p className="px-1 text-[12px] text-ink/50">
              Management has not uploaded any materials yet.
            </p>
          ) : null}
        </div>
      ) : null}

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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface p-3">
      <p className="text-[11px] font-semibold text-ink/50">{label}</p>
      <p className="font-display text-[15px] font-extrabold">{value}</p>
    </div>
  );
}
