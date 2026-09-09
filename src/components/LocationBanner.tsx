import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export function LocationBanner() {
  const { user, profile, refresh } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [asked, setAsked] = useState(false);

  useEffect(() => {
    if (!user || asked) return;
    if (profile?.latitude != null) return;
    setAsked(true);
  }, [user, profile, asked]);

  if (!user || dismissed || profile?.latitude != null) return null;

  const allow = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Location is not available on this device");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await supabase
          .from("profiles")
          .update({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
          .eq("id", user.id);
        await refresh();
        toast.success("Location saved for pickup & delivery");
      },
      () => toast.error("We could not read your location"),
    );
  };

  return (
    <div className="flex items-center gap-2 border-b border-mint bg-card px-4 py-2 text-[13px]">
      <span className="text-aqua">◉</span>
      <span className="font-medium text-ink/70">
        BrightRide wants to use your location for pickup &amp; delivery
      </span>
      <span className="ml-auto flex shrink-0 gap-2">
        <button onClick={() => setDismissed(true)} className="font-semibold text-ink/50">
          Not now
        </button>
        <button onClick={allow} className="font-bold text-brand">
          Allow
        </button>
      </span>
    </div>
  );
}
