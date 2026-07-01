import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Sparkles, Truck, ShieldCheck, ChevronLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getActiveClaim } from '@/lib/rewardSession';

export default function RewardClaim() {
  const navigate = useNavigate();
  const claim = getActiveClaim<any>();
  const [agreed, setAgreed] = useState(false);

  if (!claim) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p className="mb-4">No active reward found.</p>
          <Button onClick={() => navigate('/')}>Back to home</Button>
        </div>
      </div>
    );
  }

  const p = claim.primary_reward;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="animate-fade-in">
            <div className="aspect-square overflow-hidden rounded-3xl border border-primary/20 bg-muted shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.5)]">
              {p.image_url ? <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" /> : <Gift className="h-24 w-24 m-auto" />}
            </div>
          </div>

          <div className="animate-fade-in">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Your Exclusive Reward</span>
            </div>
            <h1 className="mb-2 text-3xl font-bold">{p.title}</h1>
            <div className="mb-4 flex items-baseline gap-3">
              <span className="text-3xl font-bold text-primary">FREE</span>
              <span className="text-lg text-muted-foreground line-through">${p.original_price}</span>
              <span className="rounded-full border px-2 py-0.5 text-xs capitalize">{p.rarity}</span>
            </div>
            <p className="mb-6 text-muted-foreground">{p.description}</p>

            <div className="mb-6 space-y-2">
              {(p.benefits || []).map((b: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                  <span>{b}</span>
                </div>
              ))}
            </div>

            <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-sm">
                <Truck className="h-4 w-4 text-primary" />
                <span>Product free. You cover shipping <b>${claim.shipping_fee}</b>. Est. arrival 5–9 business days.</span>
              </div>
            </div>

            <div className="mb-4 rounded-xl border border-accent/30 bg-accent/5 p-4">
              <p className="text-sm">
                <b>Bonus:</b> after claiming this reward, our AI will unlock <b>3 perfectly-matched bonus rewards</b> exclusively for you — packaged and shipped together with this one for a seamless experience.
              </p>
            </div>

            <Accordion type="single" collapsible className="mb-6">
              {(p.faq || []).map((f: any, i: number) => (
                <AccordionItem key={i} value={`f${i}`}>
                  <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
              <AccordionItem value="rules">
                <AccordionTrigger className="text-left text-sm">Campaign Rules</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  One reward per visitor. Shipping fee is non-refundable. Reward reserved for 48 hours. Delivery times may vary by location. All prices shown are in USD.
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="mb-4 flex items-start gap-2">
              <Checkbox id="agree" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} />
              <label htmlFor="agree" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                I understand that the product is free, I am only paying the shipping fee, and I have read the campaign rules.
              </label>
            </div>

            <Button
              disabled={!agreed}
              onClick={() => navigate('/reward/checkout')}
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
              size="lg"
            >
              <ShieldCheck className="mr-2 h-4 w-4" /> Continue to Secure Checkout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
