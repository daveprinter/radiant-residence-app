import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Message = {
  id: string;
  customer_id: string;
  sender_id: string;
  from_staff: boolean;
  body: string | null;
  image_url: string | null;
  created_at: string;
};

export function Chat({
  customerId,
  senderId,
  asStaff,
}: {
  customerId: string;
  senderId: string;
  asStaff: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: true });
      if (active) setMessages((data ?? []) as Message[]);
    };
    void load();

    const channel = supabase
      .channel(`chat-${customerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `customer_id=eq.${customerId}`,
        },
        (payload) => {
          setMessages((m) =>
            m.some((x) => x.id === (payload.new as Message).id)
              ? m
              : [...m, payload.new as Message],
          );
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [customerId]);

  useEffect(() => {
    const paths = messages.map((m) => m.image_url).filter((p): p is string => !!p && !signed[p]);
    if (paths.length === 0) return;
    void (async () => {
      const { data } = await supabase.storage.from("chat").createSignedUrls(paths, 3600);
      if (!data) return;
      setSigned((prev) => {
        const next = { ...prev };
        data.forEach((d, i) => {
          if (d.signedUrl) next[paths[i]] = d.signedUrl;
        });
        return next;
      });
    })();
  }, [messages, signed]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (imagePath?: string) => {
    if (!text.trim() && !imagePath) return;
    setBusy(true);
    const { error } = await supabase.from("messages").insert({
      customer_id: customerId,
      sender_id: senderId,
      from_staff: asStaff,
      body: text.trim() || null,
      image_url: imagePath ?? null,
    });
    setBusy(false);
    if (error) {
      toast.error("Message not sent");
      return;
    }
    setText("");
  };

  const upload = async (file: File) => {
    setBusy(true);
    const path = `${customerId}/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from("chat").upload(path, file);
    setBusy(false);
    if (error) {
      toast.error("Image upload failed");
      return;
    }
    await send(path);
  };

  return (
    <div className="flex min-h-[60vh] flex-col">
      <div className="flex-1 space-y-2 px-4 pb-4">
        {messages.map((m) => {
          const mine = m.from_staff === asStaff;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-3 py-2 text-[13px] ${
                  mine ? "bg-brand text-primary-foreground" : "bg-card text-ink shadow-sm"
                }`}
              >
                {m.image_url && signed[m.image_url] ? (
                  <img
                    src={signed[m.image_url]}
                    alt="Shared attachment"
                    loading="lazy"
                    className="mb-1 max-h-56 rounded-xl object-cover"
                  />
                ) : null}
                {m.body ? <p>{m.body}</p> : null}
                <p className={`mt-0.5 text-[10px] ${mine ? "text-white/70" : "text-ink/40"}`}>
                  {new Date(m.created_at).toLocaleTimeString("en-KE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-20 mx-4 flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
        <button
          onClick={() => fileRef.current?.click()}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-lg"
          aria-label="Attach image"
        >
          📎
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void send();
          }}
          placeholder="Type a message…"
          className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink/35"
        />
        <button
          onClick={() => void send()}
          disabled={busy}
          className="rounded-xl bg-ink px-3.5 py-2 text-[13px] font-bold text-primary-foreground disabled:opacity-60"
        >
          Send
        </button>
      </div>
    </div>
  );
}
