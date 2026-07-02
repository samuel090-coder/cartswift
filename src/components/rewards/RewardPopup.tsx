import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Gift, Sparkles, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getSessionId, hasSeenPopup, markPopupSeen, setActiveClaim, getActiveClaim } from '@/lib/rewardSession';

const HIDDEN_ROUTES = ['/admin', '/reset-password', '/reward'];

export default function RewardPopup() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [claim, setClaim] = useState<any>(getActiveClaim());
  const [remaining, setRemaining] = useState<number>(48 * 3600);

  useEffect(() => {
    if (HIDDEN_ROUTES.some((p) => location.pathname.startsWith(p))) return;
    if (hasSeenPopup()) return;
    const t = setTimeout(async () => {
      setOpen(true);
      setLoading(true);
      const tryInvoke = async (attempt: number): Promise<any> => {
        try {
          const { data, error } = await supabase.functions.invoke('smart-rewards-generate', {
            body: { sessionId: getSessionId() },
          });
          if (error) throw error;
          return data;
        } catch (e) {
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 1500));
            return tryInvoke(attempt + 1);
          }
          throw e;
        }
      };
      try {
        const data = await tryInvoke(0);
        setClaim(data.claim);
        setActiveClaim(data.claim);
      } catch (e) {
        console.error('reward generate failed', e);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 15000);
    return () => clearTimeout(t);
  }, [location.pathname]);

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

  const dismiss = () => { markPopupSeen(); setOpen(false); };
  const claimNow = () => { markPopupSeen(); setOpen(false); navigate('/reward/claim'); };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-xl p-4 animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/10 p-6 shadow-[0_20px_80px_-20px_hsl(var(--primary)/0.6)] animate-scale-in">
        <button onClick={dismiss} className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-full bg-gradient-to-br from-primary to-accent p-2">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Exclusive Reward Unlocked</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Personalizing your reward…</p>
          </div>
        ) : p ? (
          <>
            <div className="mb-4 aspect-square overflow-hidden rounded-2xl bg-muted">
              {p.image_url ? (
                <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center"><Gift className="h-16 w-16 text-primary/40" /></div>
              )}
            </div>

            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground">{p.title}</h3>
              <span className="rounded-full bg-gradient-to-r from-primary to-accent px-3 py-1 text-xs font-bold text-primary-foreground">FREE</span>
            </div>

            <div className="mb-4 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary">$0</span>
              <span className="text-sm text-muted-foreground line-through">${p.original_price}</span>
              <span className="ml-auto rounded-md bg-muted px-2 py-0.5 text-xs capitalize">{p.rarity}</span>
            </div>

            <p className="mb-3 text-sm text-muted-foreground">{p.description}</p>

            <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs text-muted-foreground">
                You pay only the <b className="text-foreground">$5 shipping fee</b>. The product is 100% free. Limited time offer.
              </p>
            </div>

            <div className="mb-4 flex items-center justify-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-mono font-semibold text-foreground">{String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}</span>
              <span className="text-muted-foreground">left</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={dismiss}>Maybe Later</Button>
              <Button onClick={claimNow} className="bg-gradient-to-r from-primary to-accent hover:opacity-90">Claim My Reward</Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
