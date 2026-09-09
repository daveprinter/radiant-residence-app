export const WHATSAPP_NUMBER = "254701987338";
export const WHATSAPP_DISPLAY = "+254 701 987338";

export type ServiceOption = { label: string; price: number };

export type Service = {
  key: string;
  name: string;
  emoji: string;
  subtitle: string;
  basePrice: number;
  oldPrice?: number;
  options?: ServiceOption[];
  sizeInput?: boolean;
};

export const SERVICES: Service[] = [
  {
    key: "clothes",
    name: "Clothes",
    emoji: "👕",
    subtitle: "1 laundry basket · wash & fold",
    basePrice: 350,
  },
  {
    key: "carpet",
    name: "Carpet",
    emoji: "🧶",
    subtitle: "Deep clean per piece",
    basePrice: 150,
    oldPrice: 200,
    sizeInput: true,
  },
  {
    key: "duvet",
    name: "Duvet",
    emoji: "🛏️",
    subtitle: "Deep clean",
    basePrice: 500,
    options: [
      { label: "Single", price: 500 },
      { label: "Double", price: 700 },
      { label: "King", price: 900 },
    ],
  },
  {
    key: "sofa",
    name: "Sofa set",
    emoji: "🛋️",
    subtitle: "Choose seater",
    basePrice: 450,
    options: [
      { label: "1-seater", price: 450 },
      { label: "2-seater", price: 800 },
      { label: "3-seater", price: 1200 },
    ],
  },
  {
    key: "shoes",
    name: "Shoes",
    emoji: "👟",
    subtitle: "Per pair",
    basePrice: 300,
  },
  {
    key: "curtains",
    name: "Curtains",
    emoji: "🪟",
    subtitle: "Per panel",
    basePrice: 250,
  },
];

export type CartItem = {
  id: string;
  key: string;
  name: string;
  emoji: string;
  variant?: string;
  size?: string;
  quantity: number;
  unitPrice: number;
};

export const ksh = (n: number) => `KSh ${n.toLocaleString("en-KE")}`;

export const STAGES = [
  "queued",
  "collected",
  "washing",
  "drying",
  "ironing",
  "ready",
  "delivered",
] as const;

export function stageProgress(stage: string) {
  const i = STAGES.indexOf(stage as (typeof STAGES)[number]);
  if (i < 0) return 5;
  return Math.round(((i + 1) / STAGES.length) * 100);
}

export function buildWhatsAppMessage(opts: {
  name: string;
  phone: string;
  address?: string | null;
  code: string;
  items: CartItem[];
  total: number;
}) {
  const lines = [
    `*BrightRide Laundry — New Service Request*`,
    `Order: ${opts.code}`,
    `Customer: ${opts.name}`,
    `Phone: ${opts.phone}`,
    opts.address ? `Pickup: ${opts.address}` : null,
    ``,
    `*Items*`,
    ...opts.items.map(
      (i) =>
        `• ${i.name}${i.variant ? ` (${i.variant})` : ""}${i.size ? ` [${i.size}]` : ""} × ${i.quantity} — ${ksh(i.unitPrice * i.quantity)}`,
    ),
    ``,
    `*Total: ${ksh(opts.total)}*`,
    `Please confirm pickup time.`,
  ].filter(Boolean);
  return lines.join("\n");
}

export function whatsappLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function orderCode() {
  return `LW${Math.floor(1000 + Math.random() * 9000)}`;
}
