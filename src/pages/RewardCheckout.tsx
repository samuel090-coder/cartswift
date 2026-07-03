import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getActiveClaim, setActiveClaim } from '@/lib/rewardSession';

const fmtNGN = (n: number) => `₦${Math.round(Number(n || 0)).toLocaleString('en-NG')}`;

export default function RewardCheckout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const claim = getActiveClaim<any>();
  const [f, setF] = useState({
    full_name: '',
    email: user?.email || '',
    phone: '',
    state: '', city: '', address: '', postal_code: '', instructions: '',
  });
  const [processing, setProcessing] = useState(false);

  if (!claim) { navigate('/'); return null; }
  const p = claim.primary_reward;
  const total = Number(claim.shipping_fee || 10000);

  const update = (k: string, v: string) => setF({ ...f, [k]: v });

  const pay = async () => {
    if (!f.full_name || !f.email || !f.phone || !f.address || !f.city || !f.state) {
      toast.error('Please fill all required fields');
      return;
    }
    setProcessing(true);
    try {
      // Persist delivery details first so webhook / return flow have them
      await supabase.from('reward_claims').update({ delivery: f }).eq('id', claim.id);
      setActiveClaim({ ...claim, delivery: f });

      const reference = `rw_${claim.id.replace(/-/g,'').slice(0,10)}_${Date.now()}`;
      const callback_url = `${window.location.origin}/reward/celebration?ref=${encodeURIComponent(reference)}&claim=${encodeURIComponent(claim.id)}`;

      const { data, error } = await supabase.functions.invoke('paystack-initialize', {
        body: {
          email: f.email,
          amount: total,
          currency: 'NGN',
          reference,
          callback_url,
          metadata: { claim_id: claim.id, user_id: user?.id, kind: 'primary_reward' },
        },
      });
      if (error) throw new Error(error.message || 'Init failed');
      if (!data?.authorization_url) throw new Error(data?.error || 'No authorization URL returned');
      window.location.href = data.authorization_url;
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Payment failed');
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="mb-6 text-2xl font-bold">Delivery & Payment</h1>

        <div className="grid gap-6 md:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border bg-card p-5 space-y-3">
            <h2 className="mb-2 font-semibold">Delivery details</h2>
            {[
              ['full_name', 'Full name *'], ['email', 'Email *'], ['phone', 'Phone *'],
              ['state', 'State/Region *'], ['city', 'City *'],
              ['address', 'Delivery address *'], ['postal_code', 'Postal code'],
            ].map(([k, l]) => (
              <div key={k}>
                <Label htmlFor={k}>{l}</Label>
                <Input id={k} value={(f as any)[k]} onChange={(e) => update(k, e.target.value)} />
              </div>
            ))}
            <div>
              <Label htmlFor="instructions">Delivery instructions</Label>
              <Textarea id="instructions" rows={2} value={f.instructions} onChange={(e) => update('instructions', e.target.value)} />
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5 h-fit">
            <h2 className="mb-3 font-semibold">Order summary</h2>
            <div className="mb-3 flex items-center gap-3">
              {p.image_url && <img src={p.image_url} className="h-14 w-14 rounded-lg object-cover" />}
              <div className="text-sm min-w-0">
                <div className="font-semibold truncate">{p.title}</div>
                <div className="text-xs text-muted-foreground">Reward · FREE product</div>
              </div>
            </div>
            <div className="space-y-1 text-sm border-t pt-3">
              <div className="flex justify-between"><span className="text-muted-foreground">Product</span><span>FREE</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{fmtNGN(total)}</span></div>
              <div className="flex justify-between font-bold pt-2 border-t mt-2"><span>Total</span><span>{fmtNGN(total)}</span></div>
            </div>
            <Button disabled={processing} onClick={pay} className="mt-4 w-full bg-gradient-to-r from-primary to-accent">
              <Lock className="mr-2 h-4 w-4" /> {processing ? 'Redirecting…' : `Pay ${fmtNGN(total)}`}
            </Button>
            <p className="mt-2 text-[11px] text-muted-foreground text-center">Secure payment via Paystack</p>
          </div>
        </div>
      </div>
    </div>
  );
}
