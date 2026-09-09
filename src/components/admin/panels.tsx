import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ksh, loadSettings, logAudit, notify, num, pretty, str } from "@/lib/platform";

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface p-3">
      <p className="text-[11px] font-semibold text-ink/50">{label}</p>
      <p className="font-display text-[15px] font-extrabold">{value}</p>
    </div>
  );
}

const input =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-brand";
const primary = "rounded-xl bg-ink px-3.5 py-2 text-[12px] font-bold text-primary-foreground";

/* ---------------- Customers ---------------- */

export function AdminCustomers() {
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["admin-customers-full"],
    queryFn: async () => {
      const [profiles, orders, roles] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("orders").select("user_id,total,status"),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      return {
        profiles: profiles.data ?? [],
        orders: orders.data ?? [],
        roles: roles.data ?? [],
      };
    },
  });

  const rows = (data?.profiles ?? []).filter((p) =>
    `${p.first_name} ${p.last_name} ${p.email} ${p.phone}`.toLowerCase().includes(q.toLowerCase()),
  );

  const addPoints = async (userId: string) => {
    await supabase
      .from("loyalty_ledger")
      .insert({ user_id: userId, points: 50, reason: "goodwill bonus" });
    await notify(userId, "Bonus points", "Management added 50 loyalty points to your account.", "reward");
    toast.success("50 points added");
  };

  const credit = async (userId: string) => {
    await supabase
      .from("wallet_transactions")
      .insert({ user_id: userId, amount: 100, reason: "goodwill", note: "Added by management" });
    await notify(userId, "Wallet credit", "KSh 100 was added to your wallet.", "wallet");
    toast.success("KSh 100 credited");
  };

  return (
    <div className="mx-4 grid gap-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, phone or email"
        className={input}
      />
      {rows.map((p) => {
        const mine = (data?.orders ?? []).filter((o) => o.user_id === p.id);
        const spent = mine.reduce((s, o) => s + (o.total ?? 0), 0);
        const roles = (data?.roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role);
        return (
          <div key={p.id} className="surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold">
                {p.first_name} {p.last_name}
              </p>
              <span className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold text-brand">
                {roles.join(", ") || "customer"}
              </span>
            </div>
            <p className="text-[11px] text-ink/50">
              {p.phone} · {p.email}
            </p>
            <p className="mt-1 text-[12px] font-semibold">
              {mine.length} orders · {ksh(spent)} spent
            </p>
            {p.referred_by ? (
              <p className="text-[11px] text-ink/50">Referred by {p.referred_by}</p>
            ) : null}
            <div className="mt-2 flex gap-2">
              <button onClick={() => void addPoints(p.id)} className={primary}>
                +50 points
              </button>
              <button
                onClick={() => void credit(p.id)}
                className="rounded-xl border border-brand/30 px-3.5 py-2 text-[12px] font-bold text-brand"
              >
                +KSh 100 wallet
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Services ---------------- */

export function AdminServices() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState({ name: "", category: "Clothes", price: "", emoji: "🧺" });

  const { data } = useQuery({
    queryKey: ["admin-services"],
    queryFn: async () => {
      const { data: rows } = await supabase.from("services").select("*").order("sort_order");
      return rows ?? [];
    },
  });

  const update = async (id: string, patch: { active?: boolean; base_price?: number }) => {
    await supabase.from("services").update(patch).eq("id", id);
    void qc.invalidateQueries({ queryKey: ["admin-services"] });
  };

  const create = async () => {
    const price = Number(draft.price);
    if (!draft.name.trim() || !Number.isFinite(price)) {
      toast.error("Add a name and a price");
      return;
    }
    const { error } = await supabase.from("services").insert({
      key: draft.name.trim().toLowerCase().replace(/\s+/g, "-"),
      name: draft.name.trim(),
      category: draft.category,
      emoji: draft.emoji || "🧺",
      base_price: price,
      sort_order: (data?.length ?? 0) + 1,
    });
    if (error) {
      toast.error("Could not add that service");
      return;
    }
    setDraft({ name: "", category: "Clothes", price: "", emoji: "🧺" });
    toast.success("Service added");
    void qc.invalidateQueries({ queryKey: ["admin-services"] });
  };

  return (
    <div className="mx-4 grid gap-2">
      <div className="surface p-4">
        <h3 className="text-[14px] font-bold">Add a service</h3>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Name"
            className={input}
          />
          <input
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            placeholder="Category"
            className={input}
          />
          <input
            value={draft.emoji}
            onChange={(e) => setDraft({ ...draft, emoji: e.target.value })}
            placeholder="Emoji"
            className={input}
          />
          <input
            value={draft.price}
            onChange={(e) => setDraft({ ...draft, price: e.target.value.replace(/[^0-9]/g, "") })}
            placeholder="Price"
            className={input}
          />
        </div>
        <button onClick={() => void create()} className={`${primary} mt-2`}>
          Add service
        </button>
      </div>

      {(data ?? []).map((s) => (
        <div key={s.id} className="surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-bold">
              {s.emoji} {s.name}
            </p>
            <button
              onClick={() => void update(s.id, { active: !s.active })}
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                s.active ? "bg-mint text-brand" : "bg-muted text-ink/50"
              }`}
            >
              {s.active ? "Active" : "Hidden"}
            </button>
          </div>
          <p className="text-[11px] text-ink/50">
            {s.category} · {s.subtitle}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <input
              defaultValue={String(s.base_price)}
              onBlur={(e) => void update(s.id, { base_price: Number(e.target.value) || 0 })}
              className={input}
            />
            <span className="text-[11px] text-ink/50">KSh</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Finance ---------------- */

export function AdminFinance() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-finance"],
    queryFn: async () => {
      const [orders, payments, referrals, withdrawals] = await Promise.all([
        supabase.from("orders").select("total,discount,delivery_fee,status,payment_status"),
        supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(40),
        supabase.from("referrals").select("commission"),
        supabase.from("withdrawals").select("amount,status"),
      ]);
      return {
        orders: orders.data ?? [],
        payments: payments.data ?? [],
        referrals: referrals.data ?? [],
        withdrawals: withdrawals.data ?? [],
      };
    },
  });

  const orders = data?.orders ?? [];
  const gross = orders.reduce((s, o) => s + (o.total ?? 0), 0);
  const discounts = orders.reduce((s, o) => s + (o.discount ?? 0), 0);
  const deliveryIncome = orders.reduce((s, o) => s + (o.delivery_fee ?? 0), 0);
  const outstanding = orders
    .filter((o) => o.payment_status !== "paid" && o.status !== "cancelled")
    .reduce((s, o) => s + (o.total ?? 0), 0);
  const commissions = (data?.referrals ?? []).reduce((s, r) => s + (r.commission ?? 0), 0);
  const payouts = (data?.withdrawals ?? [])
    .filter((w) => w.status === "paid")
    .reduce((s, w) => s + (w.amount ?? 0), 0);

  const confirm = async (id: string, userId: string, amount: number) => {
    await supabase.from("payments").update({ status: "confirmed" }).eq("id", id);
    await supabase
      .from("wallet_transactions")
      .insert({ user_id: userId, amount, reason: "topup", note: "Confirmed by management" });
    await notify(userId, "Payment confirmed", `${ksh(amount)} was added to your wallet.`, "wallet");
    toast.success("Payment confirmed");
    void qc.invalidateQueries({ queryKey: ["admin-finance"] });
  };

  return (
    <div className="mx-4 grid gap-2">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Gross revenue" value={ksh(gross)} />
        <Stat label="Discounts given" value={ksh(discounts)} />
        <Stat label="Delivery income" value={ksh(deliveryIncome)} />
        <Stat label="Outstanding" value={ksh(outstanding)} />
        <Stat label="Commission owed" value={ksh(commissions - payouts)} />
        <Stat label="Net" value={ksh(gross - commissions)} />
      </div>

      <h3 className="mt-2 text-[14px] font-bold">Recent payments</h3>
      {(data?.payments ?? []).map((p) => (
        <div key={p.id} className="surface flex items-center justify-between p-3.5">
          <div>
            <p className="text-[13px] font-bold capitalize">
              {p.method === "mpesa" ? "M-Pesa" : p.method} · {pretty(p.status)}
            </p>
            <p className="text-[11px] text-ink/50">{p.reference ?? "—"}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold">{ksh(p.amount)}</span>
            {p.status === "pending" ? (
              <button onClick={() => void confirm(p.id, p.user_id, p.amount)} className={primary}>
                Confirm
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Partners ---------------- */

export function AdminPartners() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-partners"],
    queryFn: async () => {
      const [withdrawals, referrals, profiles] = await Promise.all([
        supabase.from("withdrawals").select("*").order("created_at", { ascending: false }),
        supabase.from("referrals").select("*"),
        supabase.from("profiles").select("id,first_name,last_name,phone,referral_code"),
      ]);
      return {
        withdrawals: withdrawals.data ?? [],
        referrals: referrals.data ?? [],
        profiles: profiles.data ?? [],
      };
    },
  });

  const setStatus = async (id: string, partnerId: string, status: string) => {
    await supabase.from("withdrawals").update({ status }).eq("id", id);
    await notify(partnerId, "Withdrawal update", `Your payout request was ${status}.`, "payout");
    toast.success(`Withdrawal ${status}`);
    void qc.invalidateQueries({ queryKey: ["admin-partners"] });
  };

  const nameOf = (id: string) => {
    const p = (data?.profiles ?? []).find((x) => x.id === id);
    return p ? `${p.first_name} ${p.last_name}` : "Partner";
  };

  return (
    <div className="mx-4 grid gap-2">
      <h3 className="text-[14px] font-bold">Withdrawal requests</h3>
      {(data?.withdrawals ?? []).map((w) => (
        <div key={w.id} className="surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-bold">{nameOf(w.partner_id)}</p>
            <span className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold capitalize text-brand">
              {pretty(w.status)}
            </span>
          </div>
          <p className="text-[12px] text-ink/60">
            {ksh(w.amount)} to {w.destination || "—"}
          </p>
          {w.status === "pending" ? (
            <div className="mt-2 flex gap-2">
              <button onClick={() => void setStatus(w.id, w.partner_id, "paid")} className={primary}>
                Mark paid
              </button>
              <button
                onClick={() => void setStatus(w.id, w.partner_id, "rejected")}
                className="rounded-xl border border-destructive/30 px-3.5 py-2 text-[12px] font-bold text-destructive"
              >
                Reject
              </button>
            </div>
          ) : null}
        </div>
      ))}

      <h3 className="mt-3 text-[14px] font-bold">Partner performance</h3>
      {Object.entries(
        (data?.referrals ?? []).reduce<Record<string, { count: number; commission: number }>>(
          (acc, r) => {
            const cur = acc[r.partner_id] ?? { count: 0, commission: 0 };
            acc[r.partner_id] = {
              count: cur.count + 1,
              commission: cur.commission + (r.commission ?? 0),
            };
            return acc;
          },
          {},
        ),
      ).map(([id, v]) => (
        <div key={id} className="surface flex items-center justify-between p-3.5">
          <div>
            <p className="text-[13px] font-bold">{nameOf(id)}</p>
            <p className="text-[11px] text-ink/50">{v.count} referrals</p>
          </div>
          <span className="text-[13px] font-bold text-brand">{ksh(v.commission)}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Promotions ---------------- */

export function AdminPromotions() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState({ code: "", description: "", kind: "fixed", amount: "", min: "" });
  const [material, setMaterial] = useState({ title: "", kind: "poster", url: "" });

  const { data } = useQuery({
    queryKey: ["admin-promos"],
    queryFn: async () => {
      const [coupons, materials] = await Promise.all([
        supabase.from("coupons").select("*").order("created_at", { ascending: false }),
        supabase.from("marketing_materials").select("*").order("created_at", { ascending: false }),
      ]);
      return { coupons: coupons.data ?? [], materials: materials.data ?? [] };
    },
  });

  const createCoupon = async () => {
    const amount = Number(draft.amount);
    if (!draft.code.trim() || !Number.isFinite(amount)) {
      toast.error("Add a code and an amount");
      return;
    }
    const { error } = await supabase.from("coupons").insert({
      code: draft.code.trim().toUpperCase(),
      description: draft.description.trim(),
      kind: draft.kind,
      amount,
      min_order: Number(draft.min) || 0,
    });
    if (error) {
      toast.error("Could not create the coupon");
      return;
    }
    setDraft({ code: "", description: "", kind: "fixed", amount: "", min: "" });
    toast.success("Coupon created");
    void qc.invalidateQueries({ queryKey: ["admin-promos"] });
  };

  const addMaterial = async () => {
    if (!material.title.trim()) return;
    await supabase.from("marketing_materials").insert({
      title: material.title.trim(),
      kind: material.kind,
      url: material.url.trim(),
    });
    setMaterial({ title: "", kind: "poster", url: "" });
    toast.success("Material published to partners");
    void qc.invalidateQueries({ queryKey: ["admin-promos"] });
  };

  return (
    <div className="mx-4 grid gap-2">
      <div className="surface p-4">
        <h3 className="text-[14px] font-bold">Create a coupon</h3>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            value={draft.code}
            onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
            placeholder="CODE"
            className={input}
          />
          <select
            value={draft.kind}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
            className={input}
          >
            <option value="fixed">KSh off</option>
            <option value="percent">% off</option>
          </select>
          <input
            value={draft.amount}
            onChange={(e) => setDraft({ ...draft, amount: e.target.value.replace(/[^0-9]/g, "") })}
            placeholder="Amount"
            className={input}
          />
          <input
            value={draft.min}
            onChange={(e) => setDraft({ ...draft, min: e.target.value.replace(/[^0-9]/g, "") })}
            placeholder="Minimum order"
            className={input}
          />
        </div>
        <input
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          placeholder="Description shown to customers"
          className={`${input} mt-2`}
        />
        <button onClick={() => void createCoupon()} className={`${primary} mt-2`}>
          Create coupon
        </button>
      </div>

      {(data?.coupons ?? []).map((c) => (
        <div key={c.id} className="surface flex items-center justify-between p-3.5">
          <div>
            <p className="text-[13px] font-bold">{c.code}</p>
            <p className="text-[11px] text-ink/50">
              {c.kind === "percent" ? `${c.amount}%` : ksh(c.amount)} off · used {c.used_count}
            </p>
          </div>
          <button
            onClick={async () => {
              await supabase.from("coupons").update({ active: !c.active }).eq("id", c.id);
              void qc.invalidateQueries({ queryKey: ["admin-promos"] });
            }}
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              c.active ? "bg-mint text-brand" : "bg-muted text-ink/50"
            }`}
          >
            {c.active ? "Active" : "Off"}
          </button>
        </div>
      ))}

      <div className="surface mt-3 p-4">
        <h3 className="text-[14px] font-bold">Marketing material for partners</h3>
        <input
          value={material.title}
          onChange={(e) => setMaterial({ ...material, title: e.target.value })}
          placeholder="Title"
          className={`${input} mt-2`}
        />
        <input
          value={material.url}
          onChange={(e) => setMaterial({ ...material, url: e.target.value })}
          placeholder="Link to poster, flyer or video"
          className={`${input} mt-2`}
        />
        <button onClick={() => void addMaterial()} className={`${primary} mt-2`}>
          Publish
        </button>
      </div>
      {(data?.materials ?? []).map((m) => (
        <div key={m.id} className="surface flex items-center justify-between p-3.5">
          <p className="text-[13px] font-bold">{m.title}</p>
          <span className="text-[11px] capitalize text-ink/50">{m.kind}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Reviews ---------------- */

export function AdminReviews() {
  const { data } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false });
      return rows ?? [];
    },
  });

  const rows = data ?? [];
  const avg = rows.length ? rows.reduce((s, r) => s + r.overall, 0) / rows.length : 0;

  return (
    <div className="mx-4 grid gap-2">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Average rating" value={`${avg.toFixed(1)} ⭐`} />
        <Stat label="Reviews" value={String(rows.length)} />
      </div>
      {rows.map((r) => (
        <div
          key={r.id}
          className={`surface p-4 ${r.overall <= 2 ? "border border-destructive/40" : ""}`}
        >
          <p className="text-[13px] font-bold">
            {"⭐".repeat(r.overall)}{" "}
            {r.overall <= 2 ? (
              <span className="text-[11px] font-bold text-destructive">needs attention</span>
            ) : null}
          </p>
          <p className="text-[11px] text-ink/50">
            Quality {r.quality} · Delivery {r.delivery} · Service {r.service}
          </p>
          {r.comment ? <p className="mt-1 text-[12px] text-ink/60">{r.comment}</p> : null}
        </div>
      ))}
    </div>
  );
}

/* ---------------- Settings ---------------- */

export function AdminSettings() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-settings"], queryFn: loadSettings });
  const [form, setForm] = useState<Record<string, string>>({});

  const business = data?.["business"] ?? {};
  const delivery = data?.["delivery"] ?? {};
  const loyalty = data?.["loyalty"] ?? {};
  const commission = data?.["commission"] ?? {};

  const field = (key: string, fallback: string) => form[key] ?? fallback;

  const save = async () => {
    if (!user) return;
    const updates: Array<{ key: string; value: Record<string, string | number> }> = [
      {
        key: "business",
        value: {
          name: field("name", str(business["name"], "")),
          phone: field("phone", str(business["phone"], "")),
          email: field("email", str(business["email"], "")),
          address: field("address", str(business["address"], "")),
          currency: "KSh",
          tax_percent: Number(field("tax", String(num(business["tax_percent"], 0)))) || 0,
        },
      },
      {
        key: "delivery",
        value: {
          fee: Number(field("fee", String(num(delivery["fee"], 150)))) || 0,
          free_above: Number(field("free_above", String(num(delivery["free_above"], 3000)))) || 0,
        },
      },
      {
        key: "loyalty",
        value: {
          points_per_100: Number(field("pp", String(num(loyalty["points_per_100"], 1)))) || 0,
          ksh_per_point: Number(field("kpp", String(num(loyalty["ksh_per_point"], 0.5)))) || 0,
        },
      },
      {
        key: "commission",
        value: {
          percent: Number(field("percent", String(num(commission["percent"], 10)))) || 0,
          min_withdrawal:
            Number(field("minw", String(num(commission["min_withdrawal"], 1000)))) || 0,
        },
      },
    ];
    for (const u of updates) {
      await supabase.from("app_settings").upsert({ key: u.key, value: u.value }, { onConflict: "key" });
    }
    await logAudit(
      user.id,
      `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || "Admin",
      "settings.update",
      "Updated business settings",
    );
    toast.success("Settings saved");
    void qc.invalidateQueries({ queryKey: ["admin-settings"] });
  };

  const Field = ({ k, label, fallback }: { k: string; label: string; fallback: string }) => (
    <label className="block">
      <span className="text-[11px] font-semibold text-ink/50">{label}</span>
      <input
        defaultValue={fallback}
        onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
        className={`${input} mt-1`}
      />
    </label>
  );

  return (
    <div className="mx-4 grid gap-2">
      <div className="surface grid gap-2 p-4">
        <h3 className="text-[14px] font-bold">Business</h3>
        <Field k="name" label="Business name" fallback={str(business["name"], "")} />
        <Field k="phone" label="Phone" fallback={str(business["phone"], "")} />
        <Field k="email" label="Email" fallback={str(business["email"], "")} />
        <Field k="address" label="Location" fallback={str(business["address"], "")} />
        <Field k="tax" label="Tax %" fallback={String(num(business["tax_percent"], 0))} />
      </div>
      <div className="surface grid gap-2 p-4">
        <h3 className="text-[14px] font-bold">Delivery</h3>
        <Field k="fee" label="Delivery fee" fallback={String(num(delivery["fee"], 150))} />
        <Field
          k="free_above"
          label="Free delivery above"
          fallback={String(num(delivery["free_above"], 3000))}
        />
      </div>
      <div className="surface grid gap-2 p-4">
        <h3 className="text-[14px] font-bold">Loyalty</h3>
        <Field
          k="pp"
          label="Points per KSh 100"
          fallback={String(num(loyalty["points_per_100"], 1))}
        />
        <Field
          k="kpp"
          label="KSh value per point"
          fallback={String(num(loyalty["ksh_per_point"], 0.5))}
        />
      </div>
      <div className="surface grid gap-2 p-4">
        <h3 className="text-[14px] font-bold">Partner commission</h3>
        <Field k="percent" label="Commission %" fallback={String(num(commission["percent"], 10))} />
        <Field
          k="minw"
          label="Minimum withdrawal"
          fallback={String(num(commission["min_withdrawal"], 1000))}
        />
      </div>
      <button onClick={() => void save()} className={primary}>
        Save settings
      </button>
    </div>
  );
}

/* ---------------- Audit ---------------- */

export function AdminAudit() {
  const { data } = useQuery({
    queryKey: ["admin-audit"],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      return rows ?? [];
    },
  });

  return (
    <div className="mx-4 grid gap-2">
      {(data ?? []).map((l) => (
        <div key={l.id} className="surface p-3.5">
          <p className="text-[13px] font-bold">{l.actor_name || "Someone"}</p>
          <p className="text-[12px] text-ink/60">{l.detail}</p>
          <p className="text-[11px] text-ink/40">
            {pretty(l.action)} ·{" "}
            {new Date(l.created_at).toLocaleString("en-KE", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      ))}
      {data && data.length === 0 ? (
        <p className="px-1 text-[12px] text-ink/50">No activity recorded yet.</p>
      ) : null}
    </div>
  );
}
