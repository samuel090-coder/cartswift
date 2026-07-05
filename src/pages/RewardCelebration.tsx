import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { CheckCircle2, Sparkles, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getActiveClaim, setActiveClaim } from '@/lib/rewardSession';
import { verifyPaystackPayment } from '@/lib/paystack';

export default function RewardCelebration() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [claim, setClaim] = useState<any>(getActiveClaim());

  useEffect(() => {
    const ref = params.get('reference') || params.get('ref') || params.get('trxref');
    const claimId = params.get('claim');
    (async () => {
      if (!ref) { setStatus('success'); return; } // came from direct nav
      try {
        const data = await verifyPaystackPayment({ reference: ref, target: 'claim', id: claimId });
        if (data?.error) throw new Error(data.error);
        // refresh claim
        if (claimId) {
          const { data: c } = await supabase.from('reward_claims').select('*').eq('id', claimId).maybeSingle();
          if (c) { setClaim(c); setActiveClaim(c); }
        }
        setStatus('success');
      } catch (e) {
        console.error(e);
        setStatus('failed');
      }
    })();
  }, []);

  useEffect(() => {
    if (status !== 'success') return;
    const end = Date.now() + 2500;
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#a855f7','#22d3ee','#f472b6','#d4af37'] });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#a855f7','#22d3ee','#f472b6','#d4af37'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
    const t = setTimeout(() => navigate('/reward/bonus'), 4500);
    return () => clearTimeout(t);
  }, [status, navigate]);

  const orderNo = (claim?.id || '').slice(0, 8).toUpperCase();
  const eta = new Date(Date.now() + 7 * 86400000).toDateString();

  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Verifying your payment…</p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border p-8 text-center">
          <XCircle className="mx-auto mb-3 h-12 w-12 text-destructive" />
          <h1 className="text-xl font-bold mb-2">Payment couldn't be verified</h1>
          <p className="text-sm text-muted-foreground mb-4">If you were charged, we'll confirm shortly via webhook. You can also check your rewards.</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate('/rewards')}>My Rewards</Button>
            <Button onClick={() => navigate('/reward/checkout')}>Try again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-background via-primary/5 to-accent/10">
      <div className="w-full max-w-lg rounded-3xl border border-primary/30 bg-card p-8 text-center shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.5)] animate-scale-in">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
          <CheckCircle2 className="h-10 w-10 text-primary-foreground" />
        </div>
        <h1 className="mb-2 text-3xl font-bold">Payment confirmed! 🎉</h1>
        <p className="mb-6 text-muted-foreground">Your reward is on its way. We're preparing something even more exciting next…</p>

        <div className="mb-6 rounded-xl border bg-muted/30 p-4 text-sm space-y-1 text-left">
          <div className="flex justify-between"><span className="text-muted-foreground">Order #</span><span className="font-mono font-bold">{orderNo}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Reward</span><span className="truncate max-w-[60%] text-right">{claim?.primary_reward?.title}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Estimated arrival</span><span>{eta}</span></div>
        </div>

        <div className="mb-4 flex items-center justify-center gap-2 text-sm text-primary animate-pulse">
          <Sparkles className="h-4 w-4" /> Unlocking your bonus rewards…
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/rewards')} className="flex-1">My Rewards</Button>
          <Button onClick={() => navigate('/reward/bonus')} className="flex-1 bg-gradient-to-r from-primary to-accent">Continue</Button>
        </div>
      </div>
    </div>
  );
}
