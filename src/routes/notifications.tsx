import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Guard } from "@/components/Guard";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — BrightRide Laundry" },
      {
        name: "description",
        content:
          "Pickup reminders, cleaning updates, payment confirmations and reward alerts from BrightRide Laundry.",
      },
      { property: "og:title", content: "Notifications — BrightRide Laundry" },
      { property: "og:description", content: "Order, payment and reward alerts in one place." },
    ],
  }),
  component: () => (
    <Guard allow={["customer", "partner", "admin"]}>
      <Notifications />
    </Guard>
  ),
});

function Notifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(60);
      return rows ?? [];
    },
  });

  const markAll = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    void qc.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  return (
    <AppShell>
      <PageHeader title="Notifications" subtitle="Everything happening on your account" />
      <div className="mx-4 mb-2 flex justify-end">
        <button onClick={() => void markAll()} className="text-[12px] font-bold text-brand">
          Mark all as read
        </button>
      </div>
      <div className="mx-4 grid gap-2">
        {(data ?? []).map((n) => (
          <div key={n.id} className={`surface p-4 ${n.read ? "opacity-60" : ""}`}>
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold">{n.title}</p>
              {!n.read ? <span className="size-2 rounded-full bg-brand" /> : null}
            </div>
            <p className="mt-1 text-[12px] text-ink/60">{n.body}</p>
            <p className="mt-1 text-[11px] text-ink/40">
              {new Date(n.created_at).toLocaleString("en-KE", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        ))}
        {data && data.length === 0 ? (
          <p className="px-1 text-[12px] text-ink/50">Nothing here yet.</p>
        ) : null}
      </div>
    </AppShell>
  );
}
