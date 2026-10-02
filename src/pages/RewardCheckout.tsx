import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getActiveClaim, setActiveClaim } from '@/lib/rewardSession';
import PaymentMethod from '@/components/PaymentMethod';
import { MANUAL_PAYMENT_METHODS, recordPaymentProof, uploadPaymentProof } from '@/lib/manualPayment';

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
  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [method, setMethod] = useState<'bank_transfer' | 'crypto_eth' | 'gift_card'>('bank_transfer');

  if (!claim) { navigate('/'); return null; }
  const p = claim.primary_reward;
  const total = Number(claim.shipping_fee || 10000);

  const update = (k: string, v: string) => setF({ ...f, [k]: v });

  const continueToPayment = async () => {
    if (!f.full_name || !f.email || !f.phone || !f.address || !f.city || !f.state) {
      toast.error('Please fill all required fields');
      return;
    }
    setProcessing(true);
    try {
      await supabase.from('reward_claims').update({ delivery: f }).eq('id', claim.id);
      setActiveClaim({ ...claim, delivery: f });
      setStep('payment');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Could not save delivery details. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentSuccess = async (reference?: string, giftCardData?: any, proofUrl?: string) => {
    setProcessing(true);
    try {
      if (proofUrl) {
        await recordPaymentProof({
          paymentMethod: method,
          proofType: method === 'bank_transfer' ? 'bank_receipt' : method === 'crypto_eth' ? 'crypto_screenshot' : 'gift_card_image',
          fileUrl: proofUrl,
        });
      }

      await supabase.from('reward_claims').update({
        delivery: { ...f, payment_method: method, gift_card_data: giftCardData || null, proof_url: proofUrl || null },
        status: 'payment_submitted',
        payment_reference: reference || null,
        amount_paid: total,
        currency: 'NGN',
      }).eq('id', claim.id);

      setActiveClaim({ ...claim, delivery: f, status: 'payment_submitted' });
      toast.success('Payment submitted! We will confirm it shortly and ship your reward.');
      navigate('/rewards');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Submission failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <button onClick={() => (step === 'payment' ? setStep('details') : navigate(-1))} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="mb-6 text-2xl font-bold">Delivery & Payment</h1>

        {step === 'details' && (
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
              <Button disabled={processing} onClick={continueToPayment} className="mt-4 w-full bg-gradient-to-r from-primary to-accent">
                <ShieldCheck className="mr-2 h-4 w-4" /> {processing ? 'Saving…' : 'Continue to Payment'}
              </Button>
            </div>
          </div>
        )}

        {step === 'payment' && (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-5">
              <h2 className="mb-3 font-semibold">Choose Payment Method</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {MANUAL_PAYMENT_METHODS.map((m) => {
                  const Icon = m.icon;
                  const active = method === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id)}
                      className={`rounded-xl border-2 p-4 text-left transition-all ${
                        active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <Icon className={`h-6 w-6 mb-2 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="font-semibold text-sm">{m.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{m.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <PaymentMethod
              method={method}
              total={total}
              currency="NGN"
              onPaymentSuccess={handlePaymentSuccess}
              onFileUpload={async (file, type) => uploadPaymentProof(file, type)}
            />

            <p className="text-xs text-center text-muted-foreground">
              Shipping fee: <b>{fmtNGN(total)}</b> · Your reward ships after payment confirmation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
