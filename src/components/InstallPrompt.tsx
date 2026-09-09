import { useEffect, useState } from "react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const t = setTimeout(() => setVisible(true), 1200);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      clearTimeout(t);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="brand-gradient flex items-center justify-between gap-2 px-4 py-2 text-[13px] text-primary-foreground">
      <span className="font-semibold">Install BrightRide app</span>
      <div className="flex items-center gap-2">
        {manual ? (
          <span className="text-[11px] opacity-90">
            Use your browser menu → “Add to Home screen”
          </span>
        ) : null}
        <button
          onClick={async () => {
            if (deferred) {
              await deferred.prompt();
              await deferred.userChoice;
              setVisible(false);
            } else {
              setManual(true);
            }
          }}
          className="rounded-full bg-card px-3 py-1 text-[12px] font-bold text-brand"
        >
          Install
        </button>
        <button
          onClick={() => setVisible(false)}
          aria-label="Dismiss"
          className="text-primary-foreground/70"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
