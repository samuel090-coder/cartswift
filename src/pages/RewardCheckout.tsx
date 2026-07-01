import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getActiveClaim, setActiveClaim, loadPaystack } from '@/lib/rewardSession';

export default function RewardCheckout() {
  const navigate = useNavigate();
  const claim = getActiveClaim<any>();
  const [f, setF] = useState({
    full_name: '', email: '', phone: '',
    state: '', city: '', address: '', postal_code: '', instructions: '',
  });
  const [processing, setProcessing] = useState(false);

  if (!claim) { navigate('/'); return null; }
  const p = claim.primary_reward;
  const total = Number(claim.shipping_fee || 5);

  const update = (k: string, v: string) => setF({ ...f, [k]: v });

  const pay = async () => {
    if (!f.full_name || !f.email || !f.phone || !f.address || !f.city || !f.state) {
      toast.error('Please fill all required fields');
      return;
    }
    setProcessing(true);
    try {
      const reference = `rw_${claim.id}_${Date.now()}`;
      const { data, error } = await supabase.functions.invoke('paystack-initialize', {
        body: {
          email: f.email,
          amount: total,
          reference,
          metadata: { claim_id: claim.id, kind: 'primary_reward' },
        },
      });
      if (error || !data?.access_code) throw new Error(data?.error || 'Init failed');

      const Paystack = await loadPaystack();
      const handler = Paystack.setup({
        key: 'pk_test_placeholder', // not used with access_code path
        email: f.email,
        amount: Math.round(total * 1600 * 100),
        currency: 'NGN',
        ref: reference,
        access_code: data.access_code,
        callback: async (res: any) => {
          const verify = await supabase.functions.invoke('paystack-verify', {
            body: { reference: res.reference, target: 'claim', id: claim.id, delivery: f },
          });
          if (verify.error) { toast.error('Verification failed'); return; }
          const updated = { ...claim, status: 'paid', delivery: f };
          setActiveClaim(updated);
          navigate('/reward/celebration');
        },
        onClose: () => { setProcessing(false); toast('Payment cancelled'); },
      });
      handler.openIframe();
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
              <div className="text-sm">
                <div className="font-medium">{p.title}</div>
                <div className="text-muted-foreground">Value <s>${p.original_price}</s> → <b className="text-primary">FREE</b></div>
              </div>
            </div>
            <div className="border-t py-2 text-sm space-y-1">
              <div className="flex justify-between"><span>Product</span><span className="text-primary">$0.00</span></div>
              <div className="flex justify-between"><span>Shipping fee</span><span>${total.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold pt-1 border-t"><span>Total</span><span>${total.toFixed(2)}</span></div>
            </div>
            <Button onClick={pay} disabled={processing} className="mt-4 w-full bg-gradient-to-r from-primary to-accent" size="lg">
              <Lock className="mr-2 h-4 w-4" /> {processing ? 'Processing…' : 'Pay Securely'}
            </Button>
            <p className="mt-2 text-xs text-muted-foreground text-center">Secured by Paystack · 256-bit SSL</p>
          </div>
        </div>
      </div>
    </div>
  );
}
