import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Guard } from "@/components/Guard";
import { PageHeader } from "@/components/AppShell";
import { ksh } from "@/lib/brightride";

export const Route = createFileRoute("/partner")({
  head: () => ({
    meta: [
      { title: "Partner referrals & commission — BrightRide" },
      {
        name: "description",
        content:
          "Share your BrightRide referral code, track the customers you bring in and see the commission you have earned.",
      },
      { property: "og:title", content: "Partner referrals & commission — BrightRide" },
      { property: "og:description", content: "Track referrals and commission earned." },
    ],
  }),
  component: () => (
    <Guard allow={["partner", "admin"]}>
      <Partner />
    </Guard>
  ),
});

function Partner() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["referrals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("referrals")
        .select("*")
        .eq("partner_id", user!.id)
        .order("created_at", { ascending: false });
      return rows ?? [];
    },
  });

  const referrals = data ?? [];
  const earned = referrals.reduce((s, r) => s + (r.commission ?? 0), 0);
  const revenue = referrals.reduce((s, r) => s + (r.revenue ?? 0), 0);
  const code = profile?.referral_code ?? "—";

  return (
    <div className="min-h-screen bg-background pb-10 text-ink">
      <PageHeader title="Partner dashboard" subtitle="Refer customers, earn commission" />

      <div className="brand-gradient mx-4 rounded-3xl p-4 text-primary-foreground">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
          Your referral code
        </p>
        <p className="font-display text-3xl font-extrabold tracking-wide">{code}</p>
        <button
          onClick={() => {
            void navigator.clipboard.writeText(code);
            toast.success("Referral code copied");
          }}
          className="mt-3 rounded-xl bg-white/20 px-3.5 py-2 text-[13px] font-bold"
        >
          Copy code
        </button>
      </div>

      <div className="mx-4 mt-3 grid grid-cols-3 gap-2">
        <Stat label="Referrals" value={String(referrals.length)} />
        <Stat label="Revenue" value={ksh(revenue)} />
        <Stat label="Commission" value={ksh(earned)} />
      </div>

      <div className="mx-4 mt-4 grid gap-2">
        <h2 className="text-[15px] font-bold">Referred customers</h2>
        {referrals.map((r) => (
          <div key={r.id} className="surface flex items-center justify-between p-4">
            <div>
              <p className="text-[13px] font-bold">{r.customer_name}</p>
              <p className="text-[11px] text-ink/50 capitalize">{r.status}</p>
            </div>
            <span className="text-[13px] font-bold text-brand">{ksh(r.commission ?? 0)}</span>
          </div>
        ))}
        {referrals.length === 0 ? (
          <p className="px-1 text-[12px] text-ink/50">
            No referrals yet — share your code to start earning.
          </p>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface p-3">
      <p className="text-[11px] font-semibold text-ink/50">{label}</p>
      <p className="font-display text-[15px] font-extrabold">{value}</p>
    </div>
  );
}
