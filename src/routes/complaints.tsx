import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Guard } from "@/components/Guard";

const CATEGORIES = ["Cleaning quality", "Late delivery", "Missing item", "Damage", "Other"];

export const Route = createFileRoute("/complaints")({
  head: () => ({
    meta: [
      { title: "File a complaint — BrightRide Laundry" },
      {
        name: "description",
        content:
          "Tell BrightRide management about a cleaning issue and follow the status of your complaint.",
      },
      { property: "og:title", content: "File a complaint — BrightRide Laundry" },
      { property: "og:description", content: "Send an issue straight to BrightRide management." },
    ],
  }),
  component: () => (
    <Guard allow={["customer", "admin"]}>
      <Complaints />
    </Guard>
  ),
});

function Complaints() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [orderCodeValue, setOrderCodeValue] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["complaints", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("complaints")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return rows ?? [];
    },
  });

  const send = async () => {
    if (!user || !body.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("complaints").insert({
      user_id: user.id,
      category,
      body: body.trim(),
      order_code: orderCodeValue.trim() || null,
      status: "open",
    });
    setBusy(false);
    if (error) {
      toast.error("Could not send your complaint");
      return;
    }
    setBody("");
    setOrderCodeValue("");
    toast.success("Complaint sent to management");
    void qc.invalidateQueries({ queryKey: ["complaints", user.id] });
  };

  return (
    <AppShell>
      <PageHeader title="Complaints" subtitle="Send an issue to management" />

      <div className="surface mx-4 p-4">
        <p className="mb-2 text-[12px] font-semibold text-ink/50">What went wrong?</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-xl border px-3 py-1.5 text-[12px] font-bold ${
                category === c ? "border-brand bg-mint text-brand" : "border-border text-ink/60"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <input
          value={orderCodeValue}
          onChange={(e) => setOrderCodeValue(e.target.value)}
          placeholder="Order number (optional)"
          className="mb-2 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-[14px] outline-none focus:border-brand"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder="Describe the issue, e.g. the carpet was not cleaned thoroughly…"
          className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-[14px] outline-none focus:border-brand"
        />
        <button
          onClick={send}
          disabled={busy || !body.trim()}
          className="mt-3 w-full rounded-xl bg-ink py-3 text-[14px] font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send complaint to management"}
        </button>
      </div>

      <div className="mx-4 mt-4 grid gap-2">
        <h2 className="text-[15px] font-bold">Your complaints</h2>
        {(data ?? []).map((c) => (
          <div key={c.id} className="surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold">{c.category}</p>
              <span className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold capitalize text-brand">
                {c.status}
              </span>
            </div>
            <p className="mt-1 text-[12px] text-ink/60">{c.body}</p>
            {c.response ? (
              <p className="mt-2 rounded-xl bg-mint p-2.5 text-[12px] text-brand">
                <span className="font-bold">Management: </span>
                {c.response}
              </p>
            ) : null}
          </div>
        ))}
        {data && data.length === 0 ? (
          <p className="px-1 text-[12px] text-ink/50">No complaints filed. We like that.</p>
        ) : null}
      </div>
    </AppShell>
  );
}
