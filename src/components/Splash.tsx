export function Splash({ label = "Freshening things up…" }: { label?: string }) {
  return (
    <div className="brand-gradient fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 text-primary-foreground">
      <div className="relative grid size-36 place-items-center rounded-[2rem] bg-white/12">
        <div className="drum-spin grid size-24 place-items-center rounded-full border-4 border-white/40 border-t-aqua">
          <span className="text-3xl">🧺</span>
        </div>
        <span className="bubble absolute bottom-6 left-6 text-xl">🫧</span>
        <span className="bubble absolute bottom-4 right-8 text-base [animation-delay:0.8s]">🫧</span>
        <span className="bubble absolute bottom-8 left-1/2 text-lg [animation-delay:1.6s]">🫧</span>
      </div>
      <div className="text-center">
        <p className="font-display text-2xl font-extrabold tracking-tight">BrightRide</p>
        <p className="text-[13px] font-semibold uppercase tracking-[0.28em] text-primary-foreground/70">
          Laundry Services
        </p>
        <p className="mt-3 text-[13px] text-primary-foreground/80">{label}</p>
      </div>
    </div>
  );
}
