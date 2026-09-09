import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Guard } from "@/components/Guard";
import { PageHeader } from "@/components/AppShell";
import { Chat } from "@/components/Chat";
import { ksh, STAGES } from "@/lib/brightride";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Management panel — BrightRide Laundry" },
      {
        name: "description",
        content:
          "Approve laundry orders, move items through cleaning stages, answer complaints and chat with customers.",
      },
      { property: "og:title", content: "Management panel — BrightRide Laundry" },
      { property: "og:description", content: "Approve orders, update stages and answer customers." },
    ],
  }),
  component: () => (
    <Guard allow={["admin"]}>
      <Admin />
    </Guard>
  ),
});

type Tab = "orders" | "complaints" | "chat";

function Admin() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("orders");

  return (
    <div className="min-h-screen bg-background pb-16 text-ink">
      <PageHeader title="Management panel" subtitle="BrightRide operations" />

      <div className="mx-4 mb-3 flex gap-2">
        {(["orders", "complaints", "chat"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-xl px-3 py-2 text-[12px] font-bold capitalize ${
              tab === t ? "bg-ink text-primary-foreground" : "bg-card text-ink/60"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "orders" ? <AdminOrders /> : null}
      {tab === "complaints" ? <AdminComplaints /> : null}
      {tab === "chat" ? <AdminChat /> : null}

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

function AdminOrders() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-orders"],
    refetchInterval: 20000,
    queryFn: async () => {
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      const ids = (orders ?? []).map((o) => o.id);
      const { data: items } = ids.length
        ? await supabase.from("order_items").select("*").in("order_id", ids)
        : { data: [] };
      return { orders: orders ?? [], items: items ?? [] };
    },
  });

  const setStatus = async (id: string, status: string) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    toast.success(`Order ${status}`);
    void qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  const setStage = async (id: string, stage: string) => {
    await supabase.from("order_items").update({ stage }).eq("id", id);
    void qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  return (
    <div className="mx-4 grid gap-2">
      {(data?.orders ?? []).map((o) => (
        <div key={o.id} className="surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-bold">Order #{o.code}</p>
            <span className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold capitalize text-brand">
              {o.status}
            </span>
          </div>
          <p className="text-[11px] text-ink/50">
            {ksh(o.total)} · {o.pickup_address || "No address"}
          </p>

          <div className="mt-2 grid gap-2">
            {(data?.items ?? [])
              .filter((i) => i.order_id === o.id)
              .map((i) => (
                <div key={i.id} className="rounded-xl bg-muted p-2.5">
                  <p className="text-[12px] font-bold">
                    {i.emoji} {i.label} ×{i.quantity}{" "}
                    <span className="font-normal text-ink/50">{i.variant ?? ""}</span>
                  </p>
                  <select
                    value={i.stage}
                    onChange={(e) => void setStage(i.id, e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-border bg-card px-2 py-1.5 text-[12px] capitalize"
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => void setStatus(o.id, "approved")}
              className="flex-1 rounded-xl bg-ink py-2 text-[12px] font-bold text-primary-foreground"
            >
              Approve
            </button>
            <button
              onClick={() => void setStatus(o.id, "delivered")}
              className="flex-1 rounded-xl border border-brand/30 py-2 text-[12px] font-bold text-brand"
            >
              Mark delivered
            </button>
            <button
              onClick={() => void setStatus(o.id, "cancelled")}
              className="rounded-xl border border-destructive/30 px-3 py-2 text-[12px] font-bold text-destructive"
            >
              Cancel
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminComplaints() {
  const qc = useQueryClient();
  const [replies, setReplies] = useState<Record<string, string>>({});
  const { data } = useQuery({
    queryKey: ["admin-complaints"],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("complaints")
        .select("*")
        .order("created_at", { ascending: false });
      return rows ?? [];
    },
  });

  const respond = async (id: string) => {
    const response = replies[id]?.trim();
    if (!response) return;
    await supabase.from("complaints").update({ response, status: "resolved" }).eq("id", id);
    toast.success("Response sent");
    void qc.invalidateQueries({ queryKey: ["admin-complaints"] });
  };

  return (
    <div className="mx-4 grid gap-2">
      {(data ?? []).map((c) => (
        <div key={c.id} className="surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-bold">{c.category}</p>
            <span className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold capitalize text-brand">
              {c.status}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-ink/60">{c.body}</p>
          <textarea
            rows={2}
            value={replies[c.id] ?? c.response ?? ""}
            onChange={(e) => setReplies((r) => ({ ...r, [c.id]: e.target.value }))}
            placeholder="Reply to the customer…"
            className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-brand"
          />
          <button
            onClick={() => void respond(c.id)}
            className="mt-2 rounded-xl bg-ink px-3.5 py-2 text-[12px] font-bold text-primary-foreground"
          >
            Send response
          </button>
        </div>
      ))}
    </div>
  );
}

function AdminChat() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("profiles")
        .select("id,first_name,last_name,phone")
        .order("first_name");
      return rows ?? [];
    },
  });

  return (
    <div>
      <div className="mx-4 mb-3 flex gap-2 overflow-x-auto pb-1">
        {(data ?? []).map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className={`shrink-0 rounded-xl px-3 py-2 text-[12px] font-bold ${
              selected === p.id ? "bg-ink text-primary-foreground" : "bg-card text-ink/60"
            }`}
          >
            {p.first_name} {p.last_name}
          </button>
        ))}
      </div>
      {selected && user ? (
        <Chat customerId={selected} senderId={user.id} asStaff />
      ) : (
        <p className="mx-4 text-[12px] text-ink/50">Select a customer to open the conversation.</p>
      )}
    </div>
  );
}
