import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";

const DURATION = 7200; // ms – matches the animation timeline in index.css

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), DURATION);
    const t2 = setTimeout(onFinish, DURATION + 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background overflow-hidden transition-opacity duration-500 ${leaving ? "opacity-0" : "opacity-100"}`}
      role="status"
      aria-label="Loading CartSwift"
    >
      <div className="absolute inset-0 splash-glow pointer-events-none" />

      <div className="relative flex items-center gap-2 mb-6 animate-fade-in">
        <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/40 flex items-center justify-center">
          <ShoppingCart className="h-5 w-5 text-primary" />
        </div>
        <span className="text-2xl font-bold tracking-tight text-foreground">
          Cart<span className="text-primary">Swift</span>
        </span>
      </div>

      <svg viewBox="0 0 400 200" className="relative w-full max-w-md px-4" aria-hidden>
        {/* sky stars */}
        {[30, 90, 160, 220, 330, 370].map((x, i) => (
          <circle key={x} cx={x} cy={20 + (i % 3) * 14} r="1.2" className="splash-star fill-foreground/60" style={{ animationDelay: `${i * 0.3}s` }} />
        ))}
        {/* moon */}
        <circle cx="350" cy="30" r="10" className="fill-accent/70" />

        {/* house */}
        <g>
          <rect x="290" y="105" width="80" height="55" rx="3" className="fill-card stroke-border" strokeWidth="1.5" />
          <polygon points="282,108 330,72 378,108" className="fill-primary/80" />
          <rect x="320" y="128" width="20" height="32" rx="2" className="fill-muted" />
          <circle cx="336" cy="145" r="1.5" className="fill-accent" />
          <rect x="298" y="118" width="15" height="13" rx="1.5" className="fill-accent/80 splash-window" />
          <rect x="347" y="118" width="15" height="13" rx="1.5" className="fill-accent/80 splash-window" />
        </g>

        {/* street */}
        <rect x="0" y="160" width="400" height="40" className="fill-muted" />
        <g className="splash-road">
          {Array.from({ length: 12 }).map((_, i) => (
            <rect key={i} x={i * 40} y="178" width="20" height="3" rx="1.5" className="fill-foreground/40" />
          ))}
        </g>

        {/* packages dropped at the door */}
        <g className="splash-drop">
          <rect x="300" y="146" width="14" height="14" rx="1.5" className="fill-accent" />
          <rect x="306" y="146" width="2" height="14" className="fill-background/40" />
          <rect x="304" y="136" width="10" height="10" rx="1.5" className="fill-primary" />
        </g>

        {/* driver */}
        <g className="splash-driver">
          <circle cx="0" cy="-26" r="4" className="fill-foreground" />
          <rect x="-4" y="-21" width="8" height="12" rx="2" className="fill-primary" />
          <rect x="-4" y="-9" width="3" height="9" rx="1" className="fill-foreground splash-leg-a" />
          <rect x="1" y="-9" width="3" height="9" rx="1" className="fill-foreground splash-leg-b" />
          <g className="splash-carry">
            <rect x="4" y="-22" width="12" height="11" rx="1.5" className="fill-accent" />
            <rect x="6" y="-31" width="8" height="8" rx="1.5" className="fill-primary" />
          </g>
        </g>

        {/* bus */}
        <g className="splash-bus">
          <rect x="0" y="0" width="110" height="42" rx="7" className="fill-primary" />
          <rect x="0" y="30" width="110" height="5" className="fill-accent" />
          {[8, 30, 52].map((x) => (
            <rect key={x} x={x} y="7" width="18" height="14" rx="2" className="fill-background/80" />
          ))}
          <rect x="78" y="7" width="14" height="25" rx="2" className="fill-background/60 splash-door" />
          <rect x="95" y="7" width="12" height="14" rx="2" className="fill-background/80" />
          <circle cx="108" cy="27" r="2.5" className="fill-accent splash-headlight" />
          <g className="splash-wheel" style={{ transformOrigin: "24px 44px" }}>
            <circle cx="24" cy="44" r="8" className="fill-foreground" />
            <rect x="22.5" y="37" width="3" height="14" className="fill-muted" />
          </g>
          <g className="splash-wheel" style={{ transformOrigin: "88px 44px" }}>
            <circle cx="88" cy="44" r="8" className="fill-foreground" />
            <rect x="86.5" y="37" width="3" height="14" className="fill-muted" />
          </g>
        </g>
      </svg>

      <p className="relative mt-6 text-sm text-muted-foreground splash-caption">
        Delivering happiness to your door…
      </p>
      <div className="relative mt-4 h-1 w-48 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary splash-progress" />
      </div>
    </div>
  );
};

export default SplashScreen;
