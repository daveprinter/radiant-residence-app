import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

const NAV = [
  { to: "/dashboard", label: "Home", icon: "🏠" },
  { to: "/orders", label: "Orders", icon: "📦" },
  { to: "/messages", label: "Chat", icon: "💬" },
  { to: "/complaints", label: "Complaints", icon: "⚠️" },
  { to: "/settings", label: "Profile", icon: "👤" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20 text-ink">
      {children}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-mint bg-card/95 px-2 py-2.5 backdrop-blur">
        {NAV.map((n) => {
          const active = pathname === n.to || pathname.startsWith(n.to + "/");
          return (
            <Link
              key={n.to}
              to={n.to}
              className={`flex flex-col items-center gap-0.5 ${active ? "text-brand" : "text-ink/40"}`}
            >
              <span className="text-lg">{n.icon}</span>
              <span className={`text-[10px] ${active ? "font-bold" : "font-semibold"}`}>
                {n.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
}: {
  title: string;
  subtitle?: string;
  back?: boolean | string;
}) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-3 px-4 pb-3 pt-5">
      {back ? (
        <button
          onClick={() => router.history.back()}
          aria-label="Go back"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-card text-ink shadow-sm"
        >
          ‹
        </button>
      ) : null}
      <div>
        <h1 className="font-display text-[22px] font-extrabold leading-tight">{title}</h1>
        {subtitle ? <p className="text-[12px] text-ink/50">{subtitle}</p> : null}
      </div>
    </div>
  );
}

