import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Gift, ChevronLeft, PackageCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getActiveClaim } from '@/lib/rewardSession';

export default function RewardBonus() {
  const navigate = useNavigate();
  const claim = getActiveClaim<any>();
  const [bundle, setBundle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!claim?.id) { navigate('/'); return; }
      try {
        const { data, error } = await supabase.functions.invoke('smart-rewards-bonus', { body: { claimId: claim.id } });
        if (error) throw error;
        setBundle(data.bundle);
      } catch (e) {
        console.error(e);
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">AI is curating your bonus rewards…</p>
      </div>
    );
  }

  if (!bundle) return null;

  const items = bundle.bonus_items || [];
  const total = items.reduce((s: number, i: any) => s + Number(i.discount_price || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-accent/5">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <button onClick={() => navigate('/')} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Skip for now
        </button>

        <div className="mb-6 text-center animate-fade-in">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">AI-Curated</span>
          </div>
          <h1 className="mb-2 text-3xl font-bold">Your Exclusive Bonus Rewards Have Been Unlocked</h1>
          <p className="text-muted-foreground">3 premium items handpicked to perfectly complement your <b>{claim.primary_reward.title}</b>.</p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          {items.map((it: any, i: number) => (
            <div key={i} className="rounded-2xl border bg-card p-4 shadow-lg animate-scale-in hover-scale">
              <div className="mb-3 aspect-square overflow-hidden rounded-xl bg-muted">
                {it.image_url ? <img src={it.image_url} alt={it.title} className="h-full w-full object-cover" /> : <Gift className="h-16 w-16 m-auto opacity-40" />}
              </div>
              <div className="mb-1 flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm">{it.title}</h3>
                <span className="text-[10px] uppercase rounded bg-primary/10 text-primary px-1.5 py-0.5">{it.rarity || 'rare'}</span>
              </div>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="text-lg font-bold text-primary">${Number(it.discount_price).toFixed(2)}</span>
                <span className="text-xs text-muted-foreground line-through">${Number(it.original_price).toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{it.reason}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5 mb-4">
          <div className="flex gap-3">
            <PackageCheck className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div className="text-sm">
              <b>Ship everything together.</b> If you add these bonus rewards now, we'll package all your items in a single shipment for faster delivery and simpler tracking. Additional cost <b>${total.toFixed(2)}</b> — no extra shipping.
            </div>
          </div>
        </div>

        <Button
          onClick={() => navigate('/reward/bonus/checkout')}
          size="lg"
          className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
        >
          Purchase All Rewards Together — ${total.toFixed(2)}
        </Button>
      </div>
    </div>
  );
}
