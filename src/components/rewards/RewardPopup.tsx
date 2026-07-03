import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Gift, X, Clock, Truck, ShieldCheck, PackageOpen, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getSessionId, setActiveClaim, getActiveClaim } from '@/lib/rewardSession';
import { useAuth } from '@/contexts/AuthContext';

const HIDDEN_ROUTES = ['/admin', '/reset-password', '/reward', '/auth'];
const SEEN_ACCOUNT_KEY = 'sr_seen_accounts';

const fmtNGN = (n: number) => `₦${Math.round(Number(n || 0)).toLocaleString('en-NG')}`;

function markAccountSeen(userId: string) {
  try {
    const raw = localStorage.getItem(SEEN_ACCOUNT_KEY);
    const set = new Set(raw ? JSON.parse(raw) : []);
    set.add(userId);
    localStorage.setItem(SEEN_ACCOUNT_KEY, JSON.stringify([...set]));
  } catch {}
}

export default function RewardPopup() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [claim, setClaim] = useState<any>(null);
  const [remaining, setRemaining] = useState(48 * 3600);
  const balloonsFired = useRef(false);
  const triggered = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    if (HIDDEN_ROUTES.some((p) => location.pathname.startsWith(p))) return;
    if (triggered.current === user.id) return;
    triggered.current = user.id;

    (async () => {
      setLoading(true);
      setOpen(true);
      try {
        // Server-side check: one reward per account
        const { data: existing } = await supabase
          .from('reward_claims')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing) {
          if (existing.status === 'paid') { setOpen(false); return; }
          setClaim(existing);
          setActiveClaim(existing);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke('smart-rewards-generate', {
          body: { sessionId: getSessionId(), userId: user.id },
        });
        if (error) throw error;
        setClaim(data.claim);
        setActiveClaim(data.claim);
      } catch (e) {
        console.error('reward generate failed', e);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading, location.pathname]);

  // Balloons + confetti when popup is shown
  useEffect(() => {
    if (!open || !claim || balloonsFired.current) return;
    balloonsFired.current = true;
    const end = Date.now() + 2200;
    const tick = () => {
      confetti({ particleCount: 5, angle: 60, spread: 70, origin: { x: 0, y: 0.9 }, colors: ['#d4af37','#a855f7','#f472b6','#22d3ee'] });
      confetti({ particleCount: 5, angle: 120, spread: 70, origin: { x: 1, y: 0.9 }, colors: ['#d4af37','#a855f7','#f472b6','#22d3ee'] });
      if (Date.now() < end) requestAnimationFrame(tick);
    };
    tick();
  }, [open, claim]);

  useEffect(() => {
    if (!claim?.expires_at) return;
    const iv = setInterval(() => {
      const diff = Math.max(0, Math.floor((new Date(claim.expires_at).getTime() - Date.now()) / 1000));
      setRemaining(diff);
    }, 1000);
    return () => clearInterval(iv);
  }, [claim]);

  if (!open) return null;

  const p = claim?.primary_reward;
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;

  const dismiss = () => {
    if (user) markAccountSeen(user.id);
    setOpen(false);
  };
  const claimNow = () => {
    if (user) markAccountSeen(user.id);
    setOpen(false);
    navigate('/reward/claim');
  };

  const originalNgn = Number(p?.original_price_ngn ?? p?.original_price ?? 0);
  const shipping = Number(claim?.shipping_fee ?? 10000);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md my-auto rounded-3xl border border-amber-500/40 bg-gradient-to-br from-[#171021] via-[#1a1030] to-[#0f0820] shadow-[0_20px_80px_-20px_rgba(168,85,247,0.6)] animate-scale-in overflow-hidden">
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-full bg-white/10 hover:bg-white/20 p-1.5 text-white/80"
        >
          <X className="h-4 w-4" />
        </button>

        {loading || !p ? (
          <div className="flex flex-col items-center gap-3 py-16 px-6">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
            <p className="text-sm text-white/70">Unlocking your exclusive reward…</p>
          </div>
        ) : (
          <div className="p-5 sm:p-6">
            {/* Header */}
            <div className="mb-3 text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-amber-400 leading-tight">
                🎉 Congratulations!
              </h2>
              <p className="mt-1 text-base sm:text-lg font-bold text-white leading-snug">
                You've unlocked an
              </p>
              <p className="text-lg sm:text-xl font-extrabold bg-gradient-to-r from-fuchsia-400 to-purple-400 bg-clip-text text-transparent tracking-wide">
                EXCLUSIVE REWARD!
              </p>
            </div>

            {/* Product hero */}
            <div className="relative mb-4 aspect-square rounded-2xl overflow-hidden border border-amber-500/30 bg-black/40">
              {p.image_url && (
                <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" />
              )}
              <div className="absolute left-2 top-2 rounded-full bg-amber-400 text-black text-[10px] font-black uppercase px-2 py-1 shadow-lg">
                Exclusive Reward
              </div>
              <div className="absolute right-2 top-2 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white text-[10px] font-extrabold px-2 py-1 shadow-lg">
                100% FREE
              </div>
            </div>

            {/* Title + price */}
            <div className="mb-3 rounded-2xl bg-white/5 border border-white/10 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-bold text-white truncate">{p.title}</h3>
                  <p className="mt-0.5 text-xs text-white/60 line-clamp-2">{p.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-white/50 line-through">{fmtNGN(originalNgn)}</div>
                  <div className="text-lg font-black text-amber-400 leading-none">FREE</div>
                </div>
              </div>
            </div>

            {/* Countdown */}
            <div className="mb-3 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-3">
              <p className="text-center text-[11px] text-white/70 mb-2">Offer expires in:</p>
              <div className="flex items-center justify-center gap-2">
                {[
                  { v: h, l: 'HRS' },
                  { v: m, l: 'MIN' },
                  { v: s, l: 'SEC' },
                ].map((x, i) => (
                  <div key={i} className="min-w-[52px] rounded-xl bg-black/40 border border-purple-500/30 px-2 py-1.5 text-center">
                    <div className="text-xl font-black text-purple-300 leading-none font-mono">
                      {String(x.v).padStart(2, '0')}
                    </div>
                    <div className="mt-0.5 text-[9px] font-bold text-white/50 tracking-wider">{x.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping */}
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="rounded-full bg-purple-500/20 p-1.5 shrink-0">
                <Truck className="h-4 w-4 text-purple-300" />
              </div>
              <div className="min-w-0 text-xs text-white/80 leading-snug">
                This product is <span className="font-bold text-emerald-400">FREE!</span> You only pay{' '}
                <span className="font-bold text-amber-400">{fmtNGN(shipping)}</span> for shipping.
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={claimNow}
              className="group relative w-full rounded-2xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 py-3.5 px-4 shadow-lg shadow-purple-500/30 hover:opacity-95 transition"
            >
              <span className="flex items-center justify-center gap-2 text-white font-black text-sm tracking-wide">
                <Gift className="h-4 w-4" />
                CLAIM MY REWARD
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>
            <button onClick={dismiss} className="mt-2 w-full text-center text-xs text-white/50 hover:text-white/70">
              Maybe Later
            </button>

            {/* Trust row */}
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-3 text-[10px] text-white/60">
              <div className="flex items-center gap-1"><Clock className="h-3 w-3 text-amber-400" /><span>Limited time</span></div>
              <div className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-amber-400" /><span>48-hr exclusive</span></div>
              <div className="flex items-center gap-1"><PackageOpen className="h-3 w-3 text-amber-400" /><span>Shipping only</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
