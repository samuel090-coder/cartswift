import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getActiveClaim } from '@/lib/rewardSession';

export default function RewardCelebration() {
  const navigate = useNavigate();
  const claim = getActiveClaim<any>();

  useEffect(() => {
    const end = Date.now() + 2500;
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#a855f7','#22d3ee','#f472b6'] });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#a855f7','#22d3ee','#f472b6'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
    const t = setTimeout(() => navigate('/reward/bonus'), 4200);
    return () => clearTimeout(t);
  }, [navigate]);

  const orderNo = (claim?.id || '').slice(0, 8).toUpperCase();
  const eta = new Date(Date.now() + 7 * 86400000).toDateString();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-background via-primary/5 to-accent/10">
      <div className="w-full max-w-lg rounded-3xl border border-primary/30 bg-card p-8 text-center shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.5)] animate-scale-in">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
          <CheckCircle2 className="h-10 w-10 text-primary-foreground" />
        </div>
        <h1 className="mb-2 text-3xl font-bold">Payment confirmed! 🎉</h1>
        <p className="mb-6 text-muted-foreground">Your reward is on its way. We're preparing something even more exciting for you next…</p>

        <div className="mb-6 rounded-xl border bg-muted/30 p-4 text-sm space-y-1 text-left">
          <div className="flex justify-between"><span className="text-muted-foreground">Order #</span><span className="font-mono font-bold">{orderNo}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Reward</span><span>{claim?.primary_reward?.title}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Estimated arrival</span><span>{eta}</span></div>
        </div>

        <div className="mb-4 flex items-center justify-center gap-2 text-sm text-primary animate-pulse">
          <Sparkles className="h-4 w-4" /> Unlocking your bonus rewards…
        </div>

        <Button onClick={() => navigate('/reward/bonus')} className="w-full bg-gradient-to-r from-primary to-accent">
          Continue
        </Button>
      </div>
    </div>
  );
}
