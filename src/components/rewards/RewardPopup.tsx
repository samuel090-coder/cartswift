import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Gift, X, Truck, Sparkles, RefreshCw, Lock, ArrowRight, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '@/integrations/supabase/client';
import { getSessionId, setActiveClaim } from '@/lib/rewardSession';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const HIDDEN_ROUTES = ['/admin', '/reset-password', '/reward', '/auth'];
const fmtNGN = (n: number) => `₦${Math.round(Number(n || 0)).toLocaleString('en-NG')}`;

type Box = {
  title: string; category: string; original_price_ngn: number; original_price: number;
  image_url: string; description: string; benefits: string[]; faq: any[]; rarity: string;
};

type Phase = 'loading' | 'boxes' | 'opening' | 'reveal';

const BOX_GRADIENTS = [
  'from-amber-400 via-yellow-500 to-amber-600',
  'from-fuchsia-500 via-purple-500 to-indigo-600',
  'from-rose-400 via-pink-500 to-red-500',
];
const BOX_GLOWS = ['shadow-amber-500/50', 'shadow-fuchsia-500/50', 'shadow-rose-500/50'];

export default function RewardPopup() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('loading');
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [refreshesLeft, setRefreshesLeft] = useState(3);
  const [locked, setLocked] = useState(false);
  const [chosenIdx, setChosenIdx] = useState<number | null>(null);
  const [committing, setCommitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const triggered = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadBoxes = async (action: 'initial' | 'refresh') => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke('smart-rewards-mystery', {
        body: { userId: user.id, action },
      });
      if (error) throw error;
      if (data?.existingClaim) {
        if (data.existingClaim.status === 'paid') { setOpen(false); return; }
        setActiveClaim(data.existingClaim);
        setOpen(false);
        navigate('/reward/claim');
        return;
      }
      setBoxes(data.boxes || []);
      setRefreshesLeft(data.refreshes_left ?? 0);
      setLocked(!!data.locked);
      setPhase('boxes');
    } catch (e: any) {
      console.error('mystery load failed', e);
      toast.error('Could not load your rewards. Try again.');
      setOpen(false);
    }
  };

  useEffect(() => {
    if (authLoading || !user) return;
    if (HIDDEN_ROUTES.some((p) => location.pathname.startsWith(p))) return;
    if (triggered.current === user.id) return;
    triggered.current = user.id;
    setOpen(true);
    setPhase('loading');
    loadBoxes('initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, location.pathname]);

  const fireCelebration = () => {
    const end = Date.now() + 2500;
    const colors = ['#d4af37', '#a855f7', '#f472b6', '#22d3ee', '#fde047'];
    const tick = () => {
      confetti({ particleCount: 6, angle: 60, spread: 80, origin: { x: 0, y: 0.9 }, colors });
      confetti({ particleCount: 6, angle: 120, spread: 80, origin: { x: 1, y: 0.9 }, colors });
      confetti({ particleCount: 4, startVelocity: 45, spread: 360, origin: { x: 0.5, y: 0.3 }, colors, scalar: 1.2 });
      if (Date.now() < end) requestAnimationFrame(tick);
    };
    tick();
  };

  const pickBox = (idx: number) => {
    if (phase !== 'boxes') return;
    setChosenIdx(idx);
    setPhase('opening');
    // Small burst on click
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.5 }, colors: ['#fde047', '#a855f7', '#f472b6'] });
    setTimeout(() => {
      setPhase('reveal');
      fireCelebration();
    }, 1300);
  };

  const doRefresh = async () => {
    if (locked || refreshesLeft <= 0 || refreshing) return;
    setRefreshing(true);
    setPhase('loading');
    await loadBoxes('refresh');
    setRefreshing(false);
  };

  const claimNow = async () => {
    if (chosenIdx == null || !user || committing) return;
    setCommitting(true);
    try {
      const chosen = boxes[chosenIdx];
      const { data, error } = await supabase.functions.invoke('smart-rewards-commit', {
        body: { userId: user.id, sessionId: getSessionId(), chosenReward: chosen },
      });
      if (error) throw error;
      if (data?.claim) {
        setActiveClaim(data.claim);
        setOpen(false);
        navigate('/reward/claim');
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Could not claim reward. Try again.');
      setCommitting(false);
    }
  };

  if (!open) return null;

  const chosen = chosenIdx != null ? boxes[chosenIdx] : null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-fade-in overflow-y-auto">
      {/* Floating particles background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="absolute block h-1.5 w-1.5 rounded-full bg-amber-300/40 animate-pulse"
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 53) % 100}%`,
              animationDelay: `${i * 0.15}s`,
              animationDuration: `${2 + (i % 3)}s`,
            }}
          />
        ))}
      </div>

      <div
        ref={containerRef}
        className="relative w-full max-w-md my-auto rounded-3xl border border-amber-500/40 bg-gradient-to-br from-[#171021] via-[#1a1030] to-[#0f0820] shadow-[0_20px_80px_-20px_rgba(168,85,247,0.6)] animate-scale-in overflow-hidden"
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute right-3 top-3 z-20 rounded-full bg-white/10 hover:bg-white/20 p-1.5 text-white/80"
        >
          <X className="h-4 w-4" />
        </button>

        {/* LOADING */}
        {phase === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-16 px-6">
            <div className="relative">
              <div className="h-14 w-14 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
              <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-amber-300 animate-pulse" />
            </div>
            <p className="text-sm text-white/70">Unlocking your mystery rewards…</p>
          </div>
        )}

        {/* BOXES */}
        {phase === 'boxes' && (
          <div className="p-5 sm:p-6">
            <div className="mb-4 text-center">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 mb-2">
                <Sparkles className="h-3 w-3 text-amber-300" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Exclusive Reward</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                Pick your mystery gift 🎁
              </h2>
              <p className="mt-1 text-xs text-white/60">
                Every box hides a premium reward. Choose wisely!
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-4">
              {boxes.map((_, i) => (
                <button
                  key={i}
                  onClick={() => pickBox(i)}
                  className={`group relative aspect-[3/4] rounded-2xl bg-gradient-to-br ${BOX_GRADIENTS[i % 3]} p-0.5 shadow-xl ${BOX_GLOWS[i % 3]} hover:scale-105 active:scale-95 transition-transform`}
                  style={{ animation: `float ${2 + i * 0.3}s ease-in-out infinite`, animationDelay: `${i * 0.15}s` }}
                >
                  <div className="relative h-full w-full rounded-[14px] bg-gradient-to-br from-black/70 via-black/50 to-black/70 flex flex-col items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25),_transparent_60%)]" />
                    {/* Ribbon */}
                    <div className={`absolute inset-x-0 top-1/2 h-2 bg-gradient-to-r ${BOX_GRADIENTS[i % 3]} opacity-90`} />
                    <div className={`absolute inset-y-0 left-1/2 w-2 -translate-x-1/2 bg-gradient-to-b ${BOX_GRADIENTS[i % 3]} opacity-90`} />
                    <Gift className="relative z-10 h-8 w-8 sm:h-10 sm:w-10 text-white drop-shadow-lg group-hover:rotate-6 transition-transform" />
                    <span className="relative z-10 mt-2 text-[10px] font-black text-white uppercase tracking-wider">Box {i + 1}</span>
                    <Sparkles className="absolute right-1 top-1 h-3 w-3 text-white/80 animate-pulse" />
                  </div>
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center text-[11px] text-white/70">
              🎉 100% free product · You only pay <span className="font-bold text-amber-300">{fmtNGN(10000)}</span> shipping
            </div>

            {!locked && refreshesLeft > 0 && (
              <button
                onClick={doRefresh}
                disabled={refreshing}
                className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-white/60 hover:text-white/90 py-2"
              >
                <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
                Don't like these? Show me another set ({refreshesLeft} left)
              </button>
            )}
            {locked && (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-amber-300/80">
                <Lock className="h-3 w-3" /> Final selection — no more refreshes
              </div>
            )}
          </div>
        )}

        {/* OPENING ANIMATION */}
        {phase === 'opening' && chosen && (
          <div className="p-6 flex flex-col items-center justify-center min-h-[420px]">
            <div className="relative">
              <div
                className={`h-40 w-40 rounded-3xl bg-gradient-to-br ${BOX_GRADIENTS[(chosenIdx ?? 0) % 3]} p-1 shadow-2xl`}
                style={{ animation: 'boxShake 0.4s ease-in-out 3, boxLift 1.3s ease-out forwards' }}
              >
                <div className="h-full w-full rounded-[22px] bg-black/70 flex items-center justify-center relative overflow-hidden">
                  <div className={`absolute inset-x-0 top-1/2 h-3 bg-gradient-to-r ${BOX_GRADIENTS[(chosenIdx ?? 0) % 3]}`} />
                  <div className={`absolute inset-y-0 left-1/2 w-3 -translate-x-1/2 bg-gradient-to-b ${BOX_GRADIENTS[(chosenIdx ?? 0) % 3]}`} />
                  <Gift className="relative z-10 h-16 w-16 text-white animate-pulse" />
                </div>
              </div>
              <div className="absolute inset-0 -m-6 rounded-full bg-amber-400/30 blur-2xl animate-pulse" />
            </div>
            <p className="mt-6 text-lg font-black text-amber-300 animate-pulse">Opening your gift…</p>
          </div>
        )}

        {/* REVEAL */}
        {phase === 'reveal' && chosen && (
          <div className="p-5 sm:p-6 animate-scale-in">
            <div className="mb-3 text-center">
              <h2 className="text-xl sm:text-2xl font-black text-amber-300 leading-tight">🎉 Congratulations!</h2>
              <p className="mt-1 text-sm font-bold text-white">You unlocked an</p>
              <p className="text-lg sm:text-xl font-black bg-gradient-to-r from-fuchsia-400 via-amber-300 to-pink-400 bg-clip-text text-transparent tracking-wide">
                EXCLUSIVE REWARD!
              </p>
            </div>

            <div className="relative mb-3 aspect-square rounded-2xl overflow-hidden border border-amber-500/40 bg-black/40">
              {chosen.image_url && (
                <img src={chosen.image_url} alt={chosen.title} className="h-full w-full object-cover animate-scale-in" />
              )}
              <div className="absolute left-2 top-2 rounded-full bg-amber-400 text-black text-[10px] font-black uppercase px-2 py-1 shadow-lg">Exclusive</div>
              <div className="absolute right-2 top-2 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white text-[10px] font-extrabold px-2 py-1 shadow-lg">100% FREE</div>
            </div>

            <div className="mb-3 rounded-2xl bg-white/5 border border-white/10 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-bold text-white truncate">{chosen.title}</h3>
                  <p className="mt-0.5 text-xs text-white/60 line-clamp-2">{chosen.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-white/50 line-through">{fmtNGN(chosen.original_price_ngn)}</div>
                  <div className="text-lg font-black text-amber-300 leading-none">FREE</div>
                </div>
              </div>
            </div>

            <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="rounded-full bg-purple-500/20 p-1.5 shrink-0">
                <Truck className="h-4 w-4 text-purple-300" />
              </div>
              <div className="min-w-0 text-xs text-white/80 leading-snug">
                Product is <span className="font-bold text-emerald-400">FREE</span> — pay only{' '}
                <span className="font-bold text-amber-300">{fmtNGN(10000)}</span> shipping.
              </div>
            </div>

            <button
              onClick={claimNow}
              disabled={committing}
              className="group relative w-full rounded-2xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 py-3.5 px-4 shadow-lg shadow-purple-500/30 hover:opacity-95 transition disabled:opacity-60"
            >
              <span className="flex items-center justify-center gap-2 text-white font-black text-sm tracking-wide">
                {committing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                {committing ? 'CLAIMING…' : 'CLAIM MY REWARD'}
                {!committing && <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />}
              </span>
            </button>

            {!locked && refreshesLeft > 0 && !committing && (
              <button
                onClick={() => { setChosenIdx(null); doRefresh(); }}
                className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs text-white/60 hover:text-white/90 py-2"
              >
                <RefreshCw className="h-3 w-3" />
                Don't like this gift? Show me another ({refreshesLeft} left)
              </button>
            )}
            {locked && (
              <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-amber-300/80">
                <Lock className="h-3 w-3" /> Final reward — cannot be changed
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes boxShake { 0%,100% { transform: rotate(0); } 25% { transform: rotate(-6deg); } 75% { transform: rotate(6deg); } }
        @keyframes boxLift { 0% { transform: scale(1) translateY(0); } 70% { transform: scale(1.15) translateY(-10px); } 100% { transform: scale(1.3) translateY(-30px); opacity: 0.2; } }
      `}</style>
    </div>
  );
}
