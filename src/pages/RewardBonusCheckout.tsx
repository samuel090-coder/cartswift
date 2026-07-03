import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Lock, User, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getActiveClaim, loadPaystack, clearActiveClaim } from '@/lib/rewardSession';

export default function RewardBonusCheckout() {
  const navigate = useNavigate();
  const claim = getActiveClaim<any>();
  const [bundle, setBundle] = useState<any>(null);
  const [step, setStep] = useState<'address' | 'recipient' | 'pay'>('address');
  const [mode, setMode] = useState<'self' | 'gift'>('self');
  const [recipient, setRecipient] = useState({ relationship: 'Family Member', name: '', phone: '', state: '', city: '', address: '', message: '', instructions: '' });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    (async () => {
      if (!claim?.id) { navigate('/'); return; }
      const { data } = await supabase.from('reward_bonus_bundles').select('*').eq('claim_id', claim.id).maybeSingle();
      setBundle(data);
    })();
  }, []);

  if (!bundle) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;

  const total = Number(bundle.amount_paid || 0);

  const pay = async () => {
    if (mode === 'gift' && (!recipient.name || !recipient.phone || !recipient.address)) {
      toast.error('Please fill recipient details'); return;
    }
    setProcessing(true);
    try {
      const email = claim?.delivery?.email || 'buyer@example.com';
      const reference = `rwb_${bundle.id.replace(/-/g,'').slice(0,10)}_${Date.now()}`;
      const callback_url = `${window.location.origin}/reward/celebration?ref=${encodeURIComponent(reference)}&claim=${encodeURIComponent(claim.id)}`;
      // Persist recipient details before redirect
      await supabase.from('reward_bonus_bundles').update({
        recipient_type: mode,
        recipient: mode === 'gift' ? recipient : claim.delivery,
      }).eq('id', bundle.id);

      const { data, error } = await supabase.functions.invoke('paystack-initialize', {
        body: {
          email,
          amount: total,
          currency: 'NGN',
          reference,
          callback_url,
          metadata: { bundle_id: bundle.id, claim_id: claim.id, kind: 'bonus' },
        },
      });
      if (error) throw new Error(error.message || 'Init failed');
      if (!data?.authorization_url) throw new Error(data?.error || 'No authorization URL returned');
      clearActiveClaim();
      window.location.href = data.authorization_url;
    } catch (e: any) {
      toast.error(e.message || 'Failed');
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        {step === 'address' && (
          <div className="animate-fade-in">
            <h1 className="mb-4 text-2xl font-bold">Where should we send these?</h1>
            <div className="grid gap-4 md:grid-cols-2">
              <button onClick={() => { setMode('self'); setStep('pay'); }} className="rounded-2xl border-2 border-primary/20 bg-card p-6 text-left hover:border-primary hover-scale">
                <User className="h-8 w-8 mb-3 text-primary" />
                <div className="font-bold mb-1">Use Existing Address</div>
                <div className="text-sm text-muted-foreground">Ship to the same address as your first reward.</div>
              </button>
              <button onClick={() => { setMode('gift'); setStep('recipient'); }} className="rounded-2xl border-2 border-accent/20 bg-card p-6 text-left hover:border-accent hover-scale">
                <Gift className="h-8 w-8 mb-3 text-accent" />
                <div className="font-bold mb-1">Send To Someone Else</div>
                <div className="text-sm text-muted-foreground">Gift these rewards to a friend or family member.</div>
              </button>
            </div>
          </div>
        )}

        {step === 'recipient' && (
          <div className="rounded-2xl border bg-card p-5 space-y-3 animate-fade-in">
            <h2 className="font-semibold">Recipient details</h2>
            <div>
              <Label>Relationship</Label>
              <Select value={recipient.relationship} onValueChange={(v) => setRecipient({ ...recipient, relationship: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Family Member','Friend','Partner','Work Colleague','Parent','Child','Relative','Other'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {[['name','Recipient name *'],['phone','Phone *'],['state','State *'],['city','City *'],['address','Address *']].map(([k,l]) => (
              <div key={k}>
                <Label>{l}</Label>
                <Input value={(recipient as any)[k]} onChange={(e) => setRecipient({ ...recipient, [k]: e.target.value })} />
              </div>
            ))}
            <div>
              <Label>Gift message (optional)</Label>
              <Textarea rows={2} value={recipient.message} onChange={(e) => setRecipient({ ...recipient, message: e.target.value })} />
            </div>
            <div>
              <Label>Delivery instructions</Label>
              <Textarea rows={2} value={recipient.instructions} onChange={(e) => setRecipient({ ...recipient, instructions: e.target.value })} />
            </div>
            <Button className="w-full" onClick={() => setStep('pay')}>Continue</Button>
          </div>
        )}

        {step === 'pay' && (
          <div className="rounded-2xl border bg-card p-5 animate-fade-in">
            <h2 className="mb-3 font-semibold">Order summary</h2>
            {(bundle.bonus_items || []).map((it: any, i: number) => (
              <div key={i} className="flex items-center justify-between border-b py-2 text-sm">
                <div className="flex items-center gap-2">
                  {it.image_url && <img src={it.image_url} className="h-10 w-10 rounded object-cover" />}
                  <span>{it.title}</span>
                </div>
                <span className="font-semibold">${Number(it.discount_price).toFixed(2)}</span>
              </div>
            ))}
            <div className="mt-3 flex justify-between font-bold"><span>Total</span><span>${total.toFixed(2)}</span></div>
            <div className="mt-2 text-xs text-muted-foreground">Ships with your first reward — no extra shipping fee.</div>
            <Button onClick={pay} disabled={processing} className="mt-4 w-full bg-gradient-to-r from-primary to-accent" size="lg">
              <Lock className="mr-2 h-4 w-4" /> {processing ? 'Processing…' : `Pay $${total.toFixed(2)} Securely`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
