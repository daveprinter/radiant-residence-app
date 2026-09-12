import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Role } from "@/lib/auth";
import { InstallPrompt } from "@/components/InstallPrompt";
import { Splash } from "@/components/Splash";
import cleaningVideo from "@/assets/auth-cleaning-v2.mp4.asset.json";
import cleaningFallback from "@/assets/auth-cleaning-fallback-v2.jpg";

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
  const { user, roles, loading: authLoading, refresh } = useAuth();
  const accountSetupStarted = useRef(false);
  const [showSplash, setShowSplash] = useState(true);
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
  const [step, setStep] = useState<"form" | "verify">("form");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => window.clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 1800);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) setForm((f) => (f.referredBy ? f : { ...f, referredBy: ref.trim().toUpperCase() }));
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    if (roles.includes("admin")) {
      void navigate({ to: "/admin" });
      return;
    }
    if (roles.includes("staff")) {
      void navigate({ to: "/staff" });
      return;
    }
    if (roles.includes("rider")) {
      void navigate({ to: "/rider" });
      return;
    }
    if (roles.includes("partner")) {
      void navigate({ to: "/partner" });
      return;
    }
    if (roles.includes("customer")) {
      void navigate({ to: "/dashboard" });
      return;
    }

    if (accountSetupStarted.current) return;
    const savedRole = user.user_metadata["account_role"];
    const initialRole =
      savedRole === "customer" || savedRole === "partner"
        ? savedRole
        : role === "customer" || role === "partner"
          ? role
          : null;
    if (!initialRole) {
      setError("Choose customer or marketer / partner, then sign in again.");
      return;
    }

    accountSetupStarted.current = true;
    setBusy(true);
    void (async () => {
      const metadata = user.user_metadata;
      const profileResult = await supabase.from("profiles").insert({
        id: user.id,
        first_name: typeof metadata["first_name"] === "string" ? metadata["first_name"] : "",
        last_name: typeof metadata["last_name"] === "string" ? metadata["last_name"] : "",
        email: user.email ?? "",
        phone: typeof metadata["phone"] === "string" ? metadata["phone"] : "",
        referral_code:
          typeof metadata["referral_code"] === "string" ? metadata["referral_code"] : null,
        referred_by:
          typeof metadata["referred_by"] === "string" ? metadata["referred_by"] : null,
      });
      if (profileResult.error && profileResult.error.code !== "23505") throw profileResult.error;

      const roleResult = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: initialRole });
      if (roleResult.error && roleResult.error.code !== "23505") throw roleResult.error;
      await refresh();
      void navigate({ to: initialRole === "partner" ? "/partner" : "/dashboard" });
    })()
      .catch((setupError: unknown) => {
        accountSetupStarted.current = false;
        setError(
          setupError instanceof Error ? setupError.message : "Your account setup could not finish.",
        );
      })
      .finally(() => setBusy(false));
  }, [authLoading, user, roles, role, navigate, refresh]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!role) return;
    if (form.password.length < 6) {
      setError("Your password must be at least 6 characters.");
      return;
    }
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
        const referralCode = `${form.firstName.slice(0, 4).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password: form.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: {
              account_role: role,
              first_name: form.firstName.trim(),
              last_name: form.lastName.trim(),
              phone: form.phone.trim(),
              referral_code: referralCode,
              referred_by: form.referredBy.trim() || null,
            },
          },
        });
        if (signUpError) throw signUpError;
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          setError("This email already has a BrightRide account. Please sign in instead.");
          setMode("signin");
          return;
        }
        if (!data.user?.id) throw new Error("Account could not be created");

        if (data.session) {
          toast.success("Welcome to BrightRide!");
        } else {
          setCode("");
          setCooldown(60);
          setStep("verify");
          toast.success("We sent a 6-digit code to your email");
        }
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
          if (signInError.message.toLowerCase().includes("not confirmed")) {
            await supabase.auth.resend({ type: "signup", email });
            setCode("");
            setCooldown(60);
            setStep("verify");
            setError(null);
            toast.success("We sent a 6-digit code to your email");
            return;
          }
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

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const token = code.replace(/\D/g, "");
    if (token.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setBusy(true);
    try {
      const email = form.email.trim().toLowerCase();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "signup",
      });
      if (verifyError) {
        const retry = await supabase.auth.verifyOtp({ email, token, type: "email" });
        if (retry.error) {
          setError("That code is wrong or has expired. Request a new one.");
          return;
        }
      }
      setStep("form");
      toast.success("Email verified");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async () => {
    if (cooldown > 0) return;
    setError(null);
    setBusy(true);
    const email = form.email.trim().toLowerCase();
    const { error: resendError } = await supabase.auth.resend({ type: "signup", email });
    setBusy(false);
    if (resendError) {
      setError("We could not send a new code right now. Please try again shortly.");
      return;
    }
    setCooldown(60);
    toast.success("A new code is on its way");
  };

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-background text-ink">
      {showSplash ? <Splash /> : null}
      <img
        src={cleaningFallback}
        alt="Brown and blue towels beside a laundry basket"
        width={1080}
        height={1920}
        className="pointer-events-none fixed inset-0 z-0 size-full object-cover"
      />
      <video
        src={cleaningVideo.url}
        poster={cleaningFallback}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 size-full object-cover"
      />
      <div className="pointer-events-none fixed inset-0 z-0 bg-ink/10" />
      <InstallPrompt />
      <div className="relative z-10 mx-auto max-w-md px-5 pb-6 pt-10 text-primary-foreground drop-shadow-lg">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-foreground/70">
          Welcome to
        </p>
        <h1 className="font-display text-[28px] font-extrabold leading-tight">BrightRide</h1>
        <p className="text-[13px] text-primary-foreground/80">
          Laundry, carpets, duvets & sofas — picked up and delivered fresh.
        </p>
      </div>

      <div className="relative z-10 mx-4 mb-8 max-w-md rounded-2xl border border-card/70 bg-background/60 px-4 pb-5 pt-5 shadow-2xl backdrop-blur-md sm:mx-auto">
        {step === "verify" ? (
          <form onSubmit={verifyCode} className="grid gap-3">
            <h2 className="font-display text-[18px] font-bold">Enter your 6-digit code</h2>
            <p className="-mt-1 text-[12px] text-ink/50">
              We emailed a code to {form.email.trim().toLowerCase()}. It expires in 10 minutes.
            </p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••••"
              className="w-full rounded-xl border border-border bg-card px-3.5 py-3 text-center text-[22px] font-bold tracking-[0.45em] outline-none placeholder:text-ink/25 focus:border-brand"
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
              {busy ? "Please wait…" : "Verify and continue"}
            </button>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => void resendCode()}
                disabled={busy || cooldown > 0}
                className="text-[12px] font-semibold text-brand disabled:opacity-50"
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("form");
                  setError(null);
                }}
                className="text-[12px] font-semibold text-ink/50"
              >
                Back
              </button>
            </div>
          </form>
        ) : !role ? (
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
