import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { ksh, pretty } from "@/lib/platform";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet & payments — BrightRide Laundry" },
      {
        name: "description",
        content:
          "Top up your BrightRide wallet, pay with M-Pesa, card or cash and review every laundry payment receipt.",
      },
      { property: "og:title", content: "Wallet & payments — BrightRide Laundry" },
      { property: "og:description", content: "Top up, pay and review your laundry payments." },
    ],
  }),
  component: () => (
    <Guard allow={["customer", "admin"]}>
      <Wallet />
    </Guard>
  ),
});

const METHODS = ["mpesa", "card", "cash"] as const;

function Wallet() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<(typeof METHODS)[number]>("mpesa");
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["wallet", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [tx, pay] = await Promise.all([
        supabase
          .from("wallet_transactions")
          .select("*")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("payments")
          .select("*")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false }),
      ]);
      return { tx: tx.data ?? [], payments: pay.data ?? [] };
    },
  });

  const balance = (data?.tx ?? []).reduce((s, t) => s + (t.amount ?? 0), 0);
  const pending = (data?.payments ?? [])
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + (p.amount ?? 0), 0);

  const topUp = async () => {
    const value = Number(amount);
    if (!user || !Number.isFinite(value) || value <= 0) {
      toast.error("Enter an amount to top up");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("payments").insert({
      user_id: user.id,
      method,
      amount: value,
      status: "pending",
      note: "Wallet top-up",
      reference: `TU${Math.floor(100000 + Math.random() * 900000)}`,
    });
    setBusy(false);
    if (error) {
      toast.error("Could not start the top-up");
      return;
    }
    setAmount("");
    toast.success("Top-up requested — management will confirm it");
    void qc.invalidateQueries({ queryKey: ["wallet", user.id] });
  };

  return (
    <AppShell>
      <PageHeader title="Wallet & payments" subtitle="Balance, top-ups and receipts" />

      <div className="brand-gradient mx-4 rounded-3xl p-4 text-primary-foreground">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
          Wallet balance
        </p>
        <p className="font-display text-3xl font-extrabold">{ksh(balance)}</p>
        <p className="mt-1 text-[12px] text-primary-foreground/70">
          {pending > 0 ? `${ksh(pending)} awaiting confirmation` : "No pending payments"}
        </p>
      </div>

      <div className="surface mx-4 mt-3 p-4">
        <h2 className="text-[15px] font-bold">Top up</h2>
        <div className="mt-2 flex gap-2">
          {METHODS.map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`flex-1 rounded-xl px-3 py-2 text-[12px] font-bold capitalize ${
                method === m ? "bg-ink text-primary-foreground" : "bg-muted text-ink/60"
              }`}
            >
              {m === "mpesa" ? "M-Pesa" : m}
            </button>
          ))}
        </div>
        <input
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="Amount in KSh"
          className="mt-2 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-[14px] outline-none focus:border-brand"
        />
        <button
          onClick={() => void topUp()}
          disabled={busy}
          className="mt-2 w-full rounded-xl bg-ink py-3 text-[14px] font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Sending…" : "Request top-up"}
        </button>
      </div>

      <div className="mx-4 mt-4 grid gap-2">
        <h2 className="text-[15px] font-bold">Payment history</h2>
        {(data?.payments ?? []).map((p) => (
          <div key={p.id} className="surface flex items-center justify-between p-3.5">
            <div>
              <p className="text-[13px] font-bold capitalize">
                {p.method === "mpesa" ? "M-Pesa" : p.method} · {pretty(p.status)}
              </p>
              <p className="text-[11px] text-ink/50">
                {new Date(p.created_at).toLocaleDateString("en-KE", {
                  day: "numeric",
                  month: "short",
                })}{" "}
                · {p.reference ?? "—"}
              </p>
            </div>
            <span className="text-[13px] font-bold">{ksh(p.amount)}</span>
          </div>
        ))}
        {data && data.payments.length === 0 ? (
          <p className="px-1 text-[12px] text-ink/50">No payments recorded yet.</p>
        ) : null}
      </div>

      <div className="mx-4 mt-4 grid gap-2">
        <h2 className="text-[15px] font-bold">Wallet activity</h2>
        {(data?.tx ?? []).map((t) => (
          <div key={t.id} className="surface flex items-center justify-between p-3.5">
            <div>
              <p className="text-[13px] font-bold capitalize">{pretty(t.reason)}</p>
              <p className="text-[11px] text-ink/50">{t.note ?? ""}</p>
            </div>
            <span className={`text-[13px] font-bold ${t.amount < 0 ? "text-destructive" : "text-brand"}`}>
              {t.amount < 0 ? "-" : "+"}
              {ksh(Math.abs(t.amount))}
            </span>
          </div>
        ))}
        {data && data.tx.length === 0 ? (
          <p className="px-1 text-[12px] text-ink/50">Your wallet is empty for now.</p>
        ) : null}
      </div>
    </AppShell>
  );
}
