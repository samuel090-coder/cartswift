import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ShoppingBag, X, CreditCard, Wallet, Truck, Check,
  Package, MapPin, Phone, Mail, User, AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import PaymentMethod from '@/components/PaymentMethod';

interface StatusPurchaseModalProps {
  product: {
    id: string;
    type: 'seller_product' | 'item';
    title: string;
    price: number;
    currency: string;
    image: string | null;
  };
  statusId: string;
  sellerId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'shipping' | 'payment' | 'success';

const StatusPurchaseModal = ({ product, statusId, sellerId, onClose, onSuccess }: StatusPurchaseModalProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('shipping');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('wallet');
  const [walletBalance, setWalletBalance] = useState(0);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const pendingProofRef = useRef<{ url: string; name: string; size: number; type: string } | null>(null);

  const [shippingInfo, setShippingInfo] = useState({
    fullName: '', email: '', phone: '', address: '',
    city: '', state: '', country: '', postalCode: '',
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from('wallets' as any)
      .select('balance, bonus_balance')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) setWalletBalance((data.balance || 0) + (data.bonus_balance || 0));
      });
  }, [user]);

  // Upload proof handler — same signature as Checkout uses
  const handleFileUpload = async (file: File, type: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `${type}/${fileName}`;
    const { error } = await supabase.storage.from('payment-proofs').upload(filePath, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(filePath);
    pendingProofRef.current = {
      url: urlData.publicUrl,
      name: file.name,
      size: file.size,
      type,
    };
    return urlData.publicUrl;
  };

  const completePurchase = async (paymentReference?: string, _giftCardData?: any, proofUrl?: string) => {
    if (!user) {
      toast.error('Please log in to purchase');
      return;
    }
    setIsProcessing(true);
    try {
      const commissionRate = 0.05;
      const commissionAmount = product.price * commissionRate;

      // Create a real order so it shows in /orders + has tracking_code
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          session_id: user.id,
          email: shippingInfo.email,
          full_name: shippingInfo.fullName,
          phone_number: shippingInfo.phone,
          address_line1: shippingInfo.address,
          city: shippingInfo.city,
          state: shippingInfo.state,
          postal_code: shippingInfo.postalCode || '00000',
          country: shippingInfo.country,
          payment_method: paymentMethod as any,
          payment_reference: paymentReference || null,
          total_amount: product.price,
          currency: product.currency || 'USD',
          status: paymentMethod === 'wallet' || paymentMethod === 'credit_card' ? 'processing' : 'pending',
        })
        .select('id, tracking_code')
        .single();
      if (orderErr) throw orderErr;

      // order_items if it's a regular item
      if (product.type === 'item') {
        await supabase.from('order_items').insert({
          order_id: order.id,
          item_id: product.id,
          quantity: 1,
          price_at_time: product.price,
        });
      }

      // Status purchase tie-in (seller commissioning)
      await supabase.from('status_purchases' as any).insert({
        status_id: statusId,
        buyer_id: user.id,
        seller_id: sellerId,
        product_id: product.type === 'seller_product' ? product.id : null,
        item_id: product.type === 'item' ? product.id : null,
        amount: product.price,
        commission_amount: commissionAmount,
        payment_method: paymentMethod,
        shipping_address: shippingInfo,
        status: 'pending',
      });

      // Wallet deduct
      if (paymentMethod === 'wallet') {
        const { data: wallet }: any = await supabase
          .from('wallets' as any).select('id, balance, bonus_balance').eq('user_id', user.id).maybeSingle();
        if (wallet) {
          let remaining = product.price;
          let newBal = wallet.balance || 0;
          let newBonus = wallet.bonus_balance || 0;
          if (newBonus >= remaining) { newBonus -= remaining; remaining = 0; }
          else { remaining -= newBonus; newBonus = 0; newBal -= remaining; }
          await supabase.from('wallets' as any).update({ balance: newBal, bonus_balance: newBonus }).eq('id', wallet.id);
        }
      }

      // Attach proof if uploaded
      const proof = pendingProofRef.current;
      if (proof) {
        await supabase.from('payment_proofs').insert({
          order_id: order.id,
          payment_method: paymentMethod as any,
          proof_type: proof.type,
          file_url: proof.url,
          file_name: proof.name,
          file_size: proof.size,
        });
      }

      // Email notify (best-effort)
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'order_received',
            userEmail: shippingInfo.email,
            data: {
              orderId: order.id,
              trackingCode: order.tracking_code,
              total: product.price,
              currency: product.currency,
              items: [{ title: product.title, quantity: 1, price: product.price }],
              shipping: shippingInfo,
            },
          },
        });
      } catch (e) { console.warn('email failed', e); }

      // Notify the seller that they earned a commission from their tagged status
      try {
        const { data: seller } = await supabase
          .from('profiles').select('email, full_name').eq('id', sellerId).maybeSingle();
        const { data: buyer } = await supabase
          .from('profiles').select('full_name').eq('id', user.id).maybeSingle();
        if ((seller as any)?.email) {
          await supabase.functions.invoke('send-email', {
            body: {
              type: 'status_purchase',
              userEmail: (seller as any).email,
              data: {
                buyerName: buyer?.full_name || shippingInfo.fullName || 'A buyer',
                productTitle: product.title,
                amount: commissionAmount,
                currency: product.currency,
              },
            },
          });
        }
      } catch (e) { console.warn('seller email failed', e); }

      setTrackingCode(order.tracking_code);
      setStep('success');
      toast.success('Order placed! 🎉');
      setTimeout(() => onSuccess(), 2500);
    } catch (e: any) {
      console.error('Purchase error', e);
      toast.error(e.message || 'Failed to place order');
    } finally {
      setIsProcessing(false);
    }
  };

  const canContinueShipping = () =>
    shippingInfo.fullName && shippingInfo.email && shippingInfo.address &&
    shippingInfo.city && shippingInfo.country;

  const handleWalletPay = () => {
    if (walletBalance < product.price) {
      toast.error('Insufficient wallet balance');
      return;
    }
    completePurchase();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/95 flex flex-col"
      onClick={(e) => e.target === e.currentTarget && step !== 'success' && onClose()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <h2 className="text-white font-semibold">Quick Purchase</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10">
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Product summary */}
      <div className="px-4 py-3 bg-white/5">
        <div className="flex items-center gap-3">
          {product.image ? (
            <img src={product.image} alt={product.title} className="w-16 h-16 rounded-xl object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center">
              <Package className="w-8 h-8 text-white/40" />
            </div>
          )}
          <div className="flex-1">
            <p className="text-white font-medium">{product.title}</p>
            <p className="text-primary text-lg font-bold">{product.currency} {product.price.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {step === 'shipping' && (
            <motion.div key="shipping" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="w-5 h-5 text-primary" />
                <h3 className="text-white font-semibold">Shipping Information</h3>
              </div>
              <div>
                <Label className="text-white/60 text-xs">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input value={shippingInfo.fullName} onChange={(e) => setShippingInfo({ ...shippingInfo, fullName: e.target.value })} placeholder="John Doe" className="pl-10 bg-white/10 border-white/20 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white/60 text-xs">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input type="email" value={shippingInfo.email} onChange={(e) => setShippingInfo({ ...shippingInfo, email: e.target.value })} placeholder="email@example.com" className="pl-10 bg-white/10 border-white/20 text-white text-sm" />
                  </div>
                </div>
                <div>
                  <Label className="text-white/60 text-xs">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input value={shippingInfo.phone} onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })} placeholder="+1234567890" className="pl-10 bg-white/10 border-white/20 text-white text-sm" />
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-white/60 text-xs">Address *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-white/40" />
                  <Textarea value={shippingInfo.address} onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })} placeholder="Street address" className="pl-10 bg-white/10 border-white/20 text-white min-h-[80px]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input value={shippingInfo.city} onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })} placeholder="City *" className="bg-white/10 border-white/20 text-white" />
                <Input value={shippingInfo.state} onChange={(e) => setShippingInfo({ ...shippingInfo, state: e.target.value })} placeholder="State" className="bg-white/10 border-white/20 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input value={shippingInfo.country} onChange={(e) => setShippingInfo({ ...shippingInfo, country: e.target.value })} placeholder="Country *" className="bg-white/10 border-white/20 text-white" />
                <Input value={shippingInfo.postalCode} onChange={(e) => setShippingInfo({ ...shippingInfo, postalCode: e.target.value })} placeholder="Postal code" className="bg-white/10 border-white/20 text-white" />
              </div>
            </motion.div>
          )}

          {step === 'payment' && (
            <motion.div key="payment" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <h3 className="text-white font-semibold">Payment Method</h3>
              </div>

              <div>
                <Label className="text-white/60 text-xs mb-2 block">Choose method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wallet">💼 Wallet (${walletBalance.toFixed(2)})</SelectItem>
                    <SelectItem value="bank_transfer">🏦 Bank Transfer</SelectItem>
                    <SelectItem value="crypto_eth">₿ Cryptocurrency</SelectItem>
                    <SelectItem value="paypal">🅿️ PayPal</SelectItem>
                    <SelectItem value="gift_card">🎁 Gift Card</SelectItem>
                    <SelectItem value="credit_card">💳 Credit/Debit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === 'wallet' ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                    <Wallet className="w-6 h-6 text-primary" />
                    <div className="flex-1">
                      <p className="text-white font-medium">Wallet Balance</p>
                      <p className="text-white/60 text-sm">${walletBalance.toFixed(2)} available</p>
                    </div>
                  </div>
                  {walletBalance < product.price && (
                    <div className="p-3 rounded-lg bg-red-500/20 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <p className="text-red-400 text-sm">Insufficient balance — choose another method</p>
                    </div>
                  )}
                  <Button onClick={handleWalletPay} disabled={walletBalance < product.price || isProcessing} className="w-full">
                    {isProcessing ? 'Processing…' : `Pay ${product.currency} ${product.price.toFixed(2)}`}
                  </Button>
                </div>
              ) : (
                <div className="bg-white rounded-xl p-2 text-foreground">
                  {/* Same payment renderer used in main checkout — admin's settings + proof rules apply */}
                  <PaymentMethod
                    method={paymentMethod}
                    total={product.price}
                    currency={product.currency}
                    onPaymentSuccess={(ref, gc, proofUrl) => completePurchase(ref, gc, proofUrl)}
                    onFileUpload={handleFileUpload}
                  />
                </div>
              )}
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-12">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
                <Check className="w-12 h-12 text-green-500" />
              </motion.div>
              <h3 className="text-white text-2xl font-bold mb-2">Order Placed!</h3>
              {trackingCode && (
                <div className="bg-white/10 rounded-xl px-4 py-3 my-2 text-center">
                  <p className="text-white/60 text-xs uppercase">Your tracking code</p>
                  <p className="text-primary font-mono text-xl font-bold tracking-wider">{trackingCode}</p>
                  <a href={`/track?code=${trackingCode}`} className="text-primary text-sm underline">Track this order →</a>
                </div>
              )}
              <p className="text-white/60 text-center text-sm">An email with all details has been sent to {shippingInfo.email}.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      {step !== 'success' && (
        <div className="p-4 border-t border-white/10 flex gap-3">
          {step === 'payment' && (
            <Button variant="outline" onClick={() => setStep('shipping')} className="flex-1 border-white/20 text-white hover:bg-white/10">
              Back
            </Button>
          )}
          {step === 'shipping' && (
            <Button onClick={() => setStep('payment')} disabled={!canContinueShipping()} className="flex-1 bg-primary hover:bg-primary/90">
              Continue to Payment
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default StatusPurchaseModal;
