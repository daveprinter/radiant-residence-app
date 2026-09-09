import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Guard } from "@/components/Guard";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "My profile & location — BrightRide Laundry" },
      {
        name: "description",
        content:
          "Update your BrightRide contact details and set the pickup and delivery location we should use.",
      },
      { property: "og:title", content: "My profile & location — BrightRide Laundry" },
      {
        property: "og:description",
        content: "Manage your details and pickup location for BrightRide.",
      },
    ],
  }),
  component: () => (
    <Guard allow={["customer", "partner", "admin"]}>
      <Settings />
    </Guard>
  ),
});

function Settings() {
  const { user, profile, refresh, signOut } = useAuth();
  const navigate = useNavigate();
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAddress(profile?.address ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  const save = async (extra: Record<string, unknown> = {}) => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ address: address.trim() || null, phone: phone.trim(), ...extra })
      .eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error("Could not save your details");
      return;
    }
    await refresh();
    toast.success("Saved");
  };

  const useCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Location is not available on this device");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void save({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        toast.success("Location updated");
      },
      () => toast.error("Location permission was denied"),
    );
  };

  return (
    <AppShell>
      <PageHeader title="My profile" subtitle="Details, location and account" />

      <div className="surface mx-4 p-4">
        <p className="text-[15px] font-bold">
          {profile?.first_name} {profile?.last_name}
        </p>
        <p className="text-[12px] text-ink/50">{profile?.email}</p>
      </div>

      <div className="surface mx-4 mt-3 p-4">
        <h2 className="mb-2 text-[14px] font-bold">My location</h2>
        <p className="mb-2 text-[12px] text-ink/50">
          {profile?.latitude && profile?.longitude
            ? `Pinned at ${profile.latitude.toFixed(4)}, ${profile.longitude.toFixed(4)}`
            : "No live location pinned yet"}
        </p>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Pickup & delivery address"
          className="mb-2 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-[14px] outline-none focus:border-brand"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number"
          className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-[14px] outline-none focus:border-brand"
        />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => void save()}
            disabled={busy}
            className="rounded-xl bg-ink py-2.5 text-[13px] font-bold text-primary-foreground disabled:opacity-60"
          >
            Save details
          </button>
          <button
            onClick={useCurrentLocation}
            className="rounded-xl border border-brand/30 py-2.5 text-[13px] font-bold text-brand"
          >
            Use my location
          </button>
        </div>
      </div>

      <button
        onClick={async () => {
          await signOut();
          void navigate({ to: "/auth" });
        }}
        className="mx-4 mt-4 w-[calc(100%-2rem)] rounded-xl border border-destructive/30 py-3 text-[13px] font-bold text-destructive"
      >
        Sign out
      </button>
    </AppShell>
  );
}
