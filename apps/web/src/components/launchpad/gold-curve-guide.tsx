import { cn } from "@xauconnect/ui";

const BEATS = [
  { title: "Create", body: "You sign once. The token and the pool appear together." },
  { title: "Trade", body: "Anyone can buy or sell immediately. No waiting list." },
  { title: "Fill", body: "The pool fills to exactly 10 SOL or 750 USDC." },
  { title: "Lock", body: "Meteora moves it into DAMM v2. The liquidity stays locked." },
] as const;

const STEP_COPY = [
  "Pick Meteora. Every Gold Curve token uses one of six shared recipes, so the rules are the same for every launch and can be checked on Solana.",
  "Name the token. Supply stays at 1,000,000,000. After you sign, the name, picture, and supply are frozen. Nobody can mint more.",
  "Pick the shape of the price and whether buyers pay in SOL or USDC. The recipe is already published. You are not inventing a new one.",
  "Your wallet signs one Meteora transaction. When it confirms, the token is on Discover and people can buy it.",
] as const;

export function GoldCurveGuide({
  step,
  preset,
  quote,
}: {
  step: number;
  preset: "fair" | "shield" | "distribute";
  quote: "sol" | "usdc";
}) {
  const fill = quote === "sol" ? "10 SOL" : "750 USDC";
  const activeBeat = step <= 1 ? 0 : step === 2 ? 2 : 3;
  const presetLine =
    preset === "shield"
      ? "Shield starts the fee at 50% and lets it fall to 1% over 10 minutes. The token page shows that clock."
      : preset === "distribute"
        ? "Distribute has three parts: a fast start, a deep middle, and a steep last mile. The fee stays at 1%."
        : "Fair is one even price path. The fee stays at 1% from the first buy to the last.";

  return (
    <div className="mb-5 rounded-2xl bg-gold/10 p-3 ring-1 ring-gold/25 sm:p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-gold-deep">How this launch works</p>
      <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {BEATS.map((beat, i) => (
          <li
            key={beat.title}
            className={cn(
              "rounded-xl px-2.5 py-2",
              i === activeBeat ? "bg-white/80 text-ink shadow-sm" : "text-ink-muted",
            )}
          >
            <p className="text-[11px] font-bold uppercase tracking-wide">
              {i + 1} {beat.title}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug">{i === 2 ? `The pool fills to exactly ${fill}.` : beat.body}</p>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{STEP_COPY[step] ?? STEP_COPY[0]}</p>
      {step === 2 && (
        <div className="mt-3 grid gap-3 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:items-center">
          <CurveSketch preset={preset} />
          <p className="text-xs leading-relaxed text-ink-muted">
            {presetLine} Buyers pay in {quote === "sol" ? "SOL" : "USDC"}. Graduation is exactly {fill}, which is the amount Meteora’s keepers already watch.
          </p>
        </div>
      )}
    </div>
  );
}

function CurveSketch({ preset }: { preset: "fair" | "shield" | "distribute" }) {
  if (preset === "distribute") {
    return (
      <svg viewBox="0 0 120 72" className="h-16 w-full" aria-hidden>
        <rect x="8" y="28" width="28" height="36" rx="4" fill="#ffaa00" opacity="0.55" />
        <rect x="44" y="10" width="28" height="54" rx="4" fill="#ffaa00" />
        <rect x="80" y="22" width="28" height="42" rx="4" fill="#ff4d8d" />
      </svg>
    );
  }
  if (preset === "shield") {
    return (
      <svg viewBox="0 0 120 72" className="h-16 w-full" aria-hidden>
        <path d="M8 18 C 28 18, 36 58, 112 58" fill="none" stroke="#ffaa00" strokeWidth="4" />
        <text x="8" y="14" fill="#15171c" fontSize="10" fontWeight="700">50%</text>
        <text x="86" y="54" fill="#15171c" fontSize="10" fontWeight="700">1%</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 72" className="h-16 w-full" aria-hidden>
      <path d="M8 62 C 40 60, 70 28, 112 10" fill="none" stroke="#ffaa00" strokeWidth="4" />
    </svg>
  );
}
