import { supabase } from "@/integrations/supabase/client";

export const ksh = (n: number) => `KSh ${Math.round(n).toLocaleString("en-KE")}`;

export type SettingsMap = Record<string, Record<string, unknown>>;

export function num(v: unknown, fallback: number) {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export function str(v: unknown, fallback: string) {
  return typeof v === "string" && v.length ? v : fallback;
}

export async function loadSettings(): Promise<SettingsMap> {
  const { data } = await supabase.from("app_settings").select("key,value");
  const map: SettingsMap = {};
  for (const row of data ?? []) {
    map[row.key] = (row.value ?? {}) as Record<string, unknown>;
  }
  return map;
}

export const COMPLAINT_CATEGORIES = [
  "Missing item",
  "Damaged item",
  "Wrong item",
  "Poor cleaning",
  "Late delivery",
  "Wrong price",
  "Delivery problem",
  "Staff behaviour",
  "Other",
] as const;

export const ORDER_STATUSES = [
  "pending",
  "approved",
  "pickup_scheduled",
  "collected",
  "processing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export const DELIVERY_STATUSES = [
  "unassigned",
  "assigned",
  "picked_up",
  "on_route",
  "delivered",
  "failed",
] as const;

export const DELIVERY_MODES = [
  { value: "pickup", label: "Pickup only" },
  { value: "dropoff", label: "I'll drop off" },
  { value: "pickup_delivery", label: "Pickup + delivery" },
] as const;

export const LOYALTY_TIERS = [
  { name: "Bronze", min: 0 },
  { name: "Silver", min: 200 },
  { name: "Gold", min: 600 },
  { name: "VIP", min: 1500 },
] as const;

export function loyaltyTier(points: number) {
  let current: { name: string; min: number } = LOYALTY_TIERS[0];
  for (const t of LOYALTY_TIERS) if (points >= t.min) current = t;
  const next = LOYALTY_TIERS.find((t) => t.min > points);
  return { name: current.name, next: next?.name ?? null, nextAt: next?.min ?? null };
}

export const PARTNER_LEVELS = [
  { name: "Starter", min: 0 },
  { name: "Bronze", min: 5 },
  { name: "Silver", min: 20 },
  { name: "Gold", min: 50 },
  { name: "Platinum", min: 100 },
] as const;

export function partnerLevel(referrals: number) {
  let current = PARTNER_LEVELS[0];
  for (const l of PARTNER_LEVELS) if (referrals >= l.min) current = l;
  const next = PARTNER_LEVELS.find((l) => l.min > referrals);
  return { name: current.name, next: next?.name ?? null, nextAt: next?.min ?? null };
}

export function couponDiscount(
  coupon: { kind: string; amount: number; min_order: number; max_discount: number | null },
  subtotal: number,
) {
  if (subtotal < coupon.min_order) return 0;
  const raw =
    coupon.kind === "percent" ? Math.round((subtotal * coupon.amount) / 100) : coupon.amount;
  const capped = coupon.max_discount ? Math.min(raw, coupon.max_discount) : raw;
  return Math.min(capped, subtotal);
}

export async function notify(userId: string, title: string, body: string, kind = "info") {
  await supabase.from("notifications").insert({ user_id: userId, title, body, kind });
}

export async function logAudit(
  actorId: string,
  actorName: string,
  action: string,
  detail: string,
) {
  await supabase
    .from("audit_logs")
    .insert({ actor_id: actorId, actor_name: actorName, action, detail });
}

export async function walletBalance(userId: string) {
  const { data } = await supabase.from("wallet_transactions").select("amount").eq("user_id", userId);
  return (data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
}

export function referralLink(code: string) {
  if (typeof window === "undefined") return `/auth?ref=${code}`;
  return `${window.location.origin}/auth?ref=${code}`;
}

export function pretty(value: string) {
  return value.replace(/_/g, " ");
}
