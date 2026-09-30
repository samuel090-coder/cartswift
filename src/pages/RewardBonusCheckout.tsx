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
import { getActiveClaim, clearActiveClaim } from '@/lib/rewardSession';
import PaymentMethod from '@/components/PaymentMethod';
import { MANUAL_PAYMENT_METHODS, recordPaymentProof, uploadPaymentProof } from '@/lib/manualPayment';

export default function RewardBonusCheckout() {
  const navigate = useNavigate();
  const claim = getActiveClaim<any>();
  const [bundle, setBundle] = useState<any>(null);
  const [step, setStep] = useState<'address' | 'recipient' | 'pay'>('address');
  const [mode, setMode] = useState<'self' | 'gift'>('self');
  const [recipient, setRecipient] = useState({ relationship: 'Family Member', name: '', phone: '', state: '', city: '', address: '', message: '', instructions: '' });
  const [processing, setProcessing] = useState(false);
  const [method, setMethod] = useState<'bank_transfer' | 'crypto_eth' | 'gift_card'>('bank_transfer');

  useEffect(() => {
    (async () => {
      if (!claim?.id) { navigate('/'); return; }
      const { data } = await supabase.from('reward_bonus_bundles').select('*').eq('claim_id', claim.id).maybeSingle();
      setBundle(data);
    })();
  }, []);

  if (!bundle) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;

  const total = Number(bundle.amount_paid || 0);

  const handlePaymentSuccess = async (reference?: string, giftCardData?: any, proofUrl?: string) => {
    if (mode === 'gift' && (!recipient.name || !recipient.phone || !recipient.address)) {
      toast.error('Please fill recipient details'); return;
    }
    setProcessing(true);
    try {
      if (proofUrl) {
        await recordPaymentProof({
          paymentMethod: method,
          proofType: method === 'bank_transfer' ? 'bank_receipt' : method === 'crypto_eth' ? 'crypto_screenshot' : 'gift_card_image',
          fileUrl: proofUrl,
        });
      }

      await supabase.from('reward_bonus_bundles').update({
        recipient_type: mode,
        recipient: mode === 'gift' ? { ...recipient, payment_method: method, gift_card_data: giftCardData || null, proof_url: proofUrl || null } : { ...claim.delivery, payment_method: method, gift_card_data: giftCardData || null, proof_url: proofUrl || null },
        status: 'payment_submitted',
        payment_reference: reference || null,
      }).eq('id', bundle.id);

      clearActiveClaim();
      toast.success('Payment submitted! We will confirm it shortly.');
      navigate('/rewards');
    } catch (e: any) {
      console.error('[RewardBonusCheckout] payment submission failed', e);
      toast.error(e.message || 'Submission failed. Please try again.');
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

            <div className="mt-4">
              <h3 className="mb-3 text-sm font-semibold">Choose Payment Method</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {MANUAL_PAYMENT_METHODS.map((m) => {
                  const Icon = m.icon;
                  const active = method === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id)}
                      className={`rounded-xl border-2 p-3 text-left transition-all ${
                        active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <Icon className={`h-5 w-5 mb-1 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="font-semibold text-xs">{m.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4">
              <PaymentMethod
                method={method}
                total={total}
                currency="USD"
                onPaymentSuccess={handlePaymentSuccess}
                onFileUpload={async (file, type) => uploadPaymentProof(file, type)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
