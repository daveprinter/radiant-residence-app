import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Role } from "@/lib/auth";
import { InstallPrompt } from "@/components/InstallPrompt";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or create an account — BrightRide Laundry" },
      {
        name: "description",
        content:
          "Create a BrightRide account as a customer or as a marketer partner, then sign in to order and track laundry services.",
      },
      { property: "og:title", content: "Sign in — BrightRide Laundry" },
      {
        property: "og:description",
        content: "Create a BrightRide account as a customer or marketer partner.",
      },
    ],
  }),
  component: AuthPage,
});

type Mode = "signup" | "signin";

function AuthPage() {
  const navigate = useNavigate();
  const { user, roles, loading: authLoading } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [mode, setMode] = useState<Mode>("signup");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    referredBy: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    if (roles.includes("admin")) void navigate({ to: "/admin" });
    else if (roles.includes("partner")) void navigate({ to: "/partner" });
    else void navigate({ to: "/dashboard" });
  }, [authLoading, user, roles, navigate]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!role) return;
    setBusy(true);
    try {
      const email = form.email.trim().toLowerCase();
      const { data: exists } = await supabase.rpc("email_registered", { _email: email });

      if (mode === "signup") {
        if (exists) {
          setError("This email already has a BrightRide account. Please sign in instead.");
          setMode("signin");
          return;
        }
        if (!form.firstName || !form.lastName || !form.phone) {
          setError("Please fill in your name and phone number.");
          return;
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password: form.password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (signUpError) throw signUpError;
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          setError("This email already has a BrightRide account. Please sign in instead.");
          setMode("signin");
          return;
        }
        const uid = data.user?.id;
        if (!uid) throw new Error("Account could not be created");

        const code = `${form.firstName.slice(0, 4).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;
        await supabase.from("profiles").insert({
          id: uid,
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          email,
          phone: form.phone.trim(),
          referral_code: code,
          referred_by: form.referredBy.trim() || null,
        });
        await supabase.from("user_roles").insert({ user_id: uid, role });
        toast.success("Welcome to BrightRide!");
      } else {
        if (!exists) {
          setError("No account found with this email. Create one to get started.");
          setMode("signup");
          return;
        }
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: form.password,
        });
        if (signInError) {
          setError("That password is not correct. Please try again.");
          return;
        }
        toast.success("Signed in");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-ink">
      <InstallPrompt />
      <div className="brand-gradient px-5 pb-8 pt-8 text-primary-foreground">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-foreground/70">
          Welcome to
        </p>
        <h1 className="font-display text-[28px] font-extrabold leading-tight">BrightRide</h1>
        <p className="text-[13px] text-primary-foreground/80">
          Laundry, carpets, duvets & sofas — picked up and delivered fresh.
        </p>
      </div>

      <div className="-mt-5 rounded-t-[26px] bg-background px-4 pb-16 pt-5">
        {!role ? (
          <>
            <h2 className="mb-1 font-display text-[18px] font-bold">Create your account</h2>
            <p className="mb-4 text-[13px] text-ink/50">Choose how you want to join BrightRide.</p>
            <div className="grid gap-3">
              <button
                onClick={() => setRole("customer")}
                className="surface pop-in flex items-center gap-3 p-4 text-left"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-mint text-2xl">
                  🧺
                </span>
                <span>
                  <span className="block text-[15px] font-bold">As a customer</span>
                  <span className="block text-[12px] text-ink/50">
                    Order cleaning, track progress, chat with the team
                  </span>
                </span>
              </button>
              <button
                onClick={() => setRole("partner")}
                className="surface pop-in flex items-center gap-3 p-4 text-left"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sun/20 text-2xl">
                  🤝
                </span>
                <span>
                  <span className="block text-[15px] font-bold">As a marketer / partner</span>
                  <span className="block text-[12px] text-ink/50">
                    Refer customers and earn commission
                  </span>
                </span>
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={submit} className="grid gap-3">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-display text-[18px] font-bold">
                {mode === "signup" ? "Create account" : "Sign in"}
              </h2>
              <button
                type="button"
                onClick={() => setRole(null)}
                className="text-[12px] font-semibold text-brand"
              >
                Change role
              </button>
            </div>
            <p className="-mt-2 text-[12px] text-ink/50">
              {role === "customer" ? "Customer account" : "Marketer / partner account"}
            </p>

            {mode === "signup" ? (
              <div className="grid grid-cols-2 gap-2">
                <Field
                  placeholder="First name"
                  value={form.firstName}
                  onChange={set("firstName")}
                />
                <Field placeholder="Last name" value={form.lastName} onChange={set("lastName")} />
              </div>
            ) : null}

            <Field
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={set("email")}
              required
            />
            {mode === "signup" ? (
              <>
                <Field
                  type="tel"
                  placeholder="Phone number e.g. 0712 345 678"
                  value={form.phone}
                  onChange={set("phone")}
                />
                {role === "customer" ? (
                  <Field
                    placeholder="Referral code (optional)"
                    value={form.referredBy}
                    onChange={set("referredBy")}
                  />
                ) : null}
              </>
            ) : null}
            <Field
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={set("password")}
              required
            />

            {error ? (
              <p className="rounded-xl bg-destructive/10 px-3 py-2 text-[12px] font-semibold text-destructive">
                {error}
              </p>
            ) : null}

            <button
              disabled={busy}
              className="mt-1 w-full rounded-xl bg-ink py-3 text-[14px] font-bold text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setError(null);
              }}
              className="text-[12px] font-semibold text-brand"
            >
              {mode === "signup"
                ? "Already have an account? Sign in"
                : "New here? Create an account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-border bg-card px-3.5 py-3 text-[14px] outline-none placeholder:text-ink/35 focus:border-brand"
    />
  );
}
