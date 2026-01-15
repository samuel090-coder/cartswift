import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ShoppingBag, X, CreditCard, Wallet, Truck, Check, 
  Package, MapPin, Phone, Mail, User, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

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

const StatusPurchaseModal = ({ 
  product, 
  statusId, 
  sellerId, 
  onClose, 
  onSuccess 
}: StatusPurchaseModalProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'shipping' | 'payment' | 'confirm' | 'success'>('shipping');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'card'>('wallet');
  
  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: ''
  });

  // Check wallet balance
  const [walletBalance, setWalletBalance] = useState(0);
  
  useState(() => {
    if (user) {
      supabase
        .from('wallets')
        .select('balance, bonus_balance')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setWalletBalance((data.balance || 0) + (data.bonus_balance || 0));
          }
        });
    }
  });

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please log in to purchase');
      return;
    }

    setIsProcessing(true);

    try {
      const commissionRate = 0.05; // 5% commission
      const commissionAmount = product.price * commissionRate;

      // Create purchase record
      const { error: purchaseError } = await supabase
        .from('status_purchases')
        .insert({
          status_id: statusId,
          buyer_id: user.id,
          seller_id: sellerId,
          product_id: product.type === 'seller_product' ? product.id : null,
          item_id: product.type === 'item' ? product.id : null,
          amount: product.price,
          commission_amount: commissionAmount,
          payment_method: paymentMethod,
          shipping_address: shippingInfo,
          status: 'pending'
        });

      if (purchaseError) throw purchaseError;

      // If using wallet, deduct balance
      if (paymentMethod === 'wallet') {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('id, balance, bonus_balance')
          .eq('user_id', user.id)
          .maybeSingle();

        if (wallet) {
          let remainingAmount = product.price;
          let newBalance = wallet.balance || 0;
          let newBonusBalance = wallet.bonus_balance || 0;

          // First deduct from bonus balance
          if (newBonusBalance >= remainingAmount) {
            newBonusBalance -= remainingAmount;
            remainingAmount = 0;
          } else {
            remainingAmount -= newBonusBalance;
            newBonusBalance = 0;
            newBalance -= remainingAmount;
          }

          await supabase
            .from('wallets')
            .update({ balance: newBalance, bonus_balance: newBonusBalance })
            .eq('id', wallet.id);
        }
      }

      setStep('success');
      toast.success('Purchase completed! 🎉');
      
      setTimeout(() => {
        onSuccess();
      }, 2000);

    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error.message || 'Failed to complete purchase');
    } finally {
      setIsProcessing(false);
    }
  };

  const canProceed = () => {
    if (step === 'shipping') {
      return shippingInfo.fullName && shippingInfo.email && shippingInfo.address && 
             shippingInfo.city && shippingInfo.country;
    }
    if (step === 'payment') {
      if (paymentMethod === 'wallet') {
        return walletBalance >= product.price;
      }
      return true;
    }
    return true;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/95 flex flex-col"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <h2 className="text-white font-semibold">Quick Purchase</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Product Preview */}
      <div className="px-4 py-3 bg-white/5">
        <div className="flex items-center gap-3">
          {product.image ? (
            <img 
              src={product.image} 
              alt={product.title}
              className="w-16 h-16 rounded-xl object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center">
              <Package className="w-8 h-8 text-white/40" />
            </div>
          )}
          <div className="flex-1">
            <p className="text-white font-medium">{product.title}</p>
            <p className="text-primary text-lg font-bold">
              {product.currency} {product.price.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          {['shipping', 'payment', 'confirm'].map((s, idx) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === s ? 'bg-primary text-white' :
                ['shipping', 'payment', 'confirm'].indexOf(step) > idx 
                  ? 'bg-green-500 text-white' 
                  : 'bg-white/10 text-white/40'
              }`}>
                {['shipping', 'payment', 'confirm'].indexOf(step) > idx ? (
                  <Check className="w-4 h-4" />
                ) : idx + 1}
              </div>
              {idx < 2 && (
                <div className={`w-12 h-0.5 ${
                  ['shipping', 'payment', 'confirm'].indexOf(step) > idx 
                    ? 'bg-green-500' 
                    : 'bg-white/10'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {/* Shipping Step */}
          {step === 'shipping' && (
            <motion.div
              key="shipping"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-5 h-5 text-primary" />
                <h3 className="text-white font-semibold">Shipping Information</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-white/60 text-xs">Full Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      value={shippingInfo.fullName}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, fullName: e.target.value })}
                      placeholder="John Doe"
                      className="pl-10 bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-white/60 text-xs">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <Input
                        type="email"
                        value={shippingInfo.email}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, email: e.target.value })}
                        placeholder="email@example.com"
                        className="pl-10 bg-white/10 border-white/20 text-white text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-white/60 text-xs">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <Input
                        value={shippingInfo.phone}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                        placeholder="+1234567890"
                        className="pl-10 bg-white/10 border-white/20 text-white text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-white/60 text-xs">Address *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-white/40" />
                    <Textarea
                      value={shippingInfo.address}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                      placeholder="Street address, apartment, etc."
                      className="pl-10 bg-white/10 border-white/20 text-white min-h-[80px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-white/60 text-xs">City *</Label>
                    <Input
                      value={shippingInfo.city}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                      placeholder="City"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white/60 text-xs">State</Label>
                    <Input
                      value={shippingInfo.state}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, state: e.target.value })}
                      placeholder="State/Province"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-white/60 text-xs">Country *</Label>
                    <Input
                      value={shippingInfo.country}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, country: e.target.value })}
                      placeholder="Country"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white/60 text-xs">Postal Code</Label>
                    <Input
                      value={shippingInfo.postalCode}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, postalCode: e.target.value })}
                      placeholder="12345"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Payment Step */}
          {step === 'payment' && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-primary" />
                <h3 className="text-white font-semibold">Payment Method</h3>
              </div>

              <div className="space-y-3">
                {/* Wallet Option */}
                <button
                  onClick={() => setPaymentMethod('wallet')}
                  className={`w-full p-4 rounded-xl border ${
                    paymentMethod === 'wallet' 
                      ? 'border-primary bg-primary/20' 
                      : 'border-white/20 bg-white/5'
                  } text-left transition-all`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-white font-medium">Wallet Balance</p>
                        <p className="text-white/60 text-sm">${walletBalance.toFixed(2)} available</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      paymentMethod === 'wallet' 
                        ? 'border-primary bg-primary' 
                        : 'border-white/40'
                    } flex items-center justify-center`}>
                      {paymentMethod === 'wallet' && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </div>
                  {paymentMethod === 'wallet' && walletBalance < product.price && (
                    <div className="mt-3 p-2 rounded-lg bg-red-500/20 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <p className="text-red-400 text-sm">Insufficient balance</p>
                    </div>
                  )}
                </button>

                {/* Card Option */}
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`w-full p-4 rounded-xl border ${
                    paymentMethod === 'card' 
                      ? 'border-primary bg-primary/20' 
                      : 'border-white/20 bg-white/5'
                  } text-left transition-all`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">Credit/Debit Card</p>
                        <p className="text-white/60 text-sm">Pay securely with card</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      paymentMethod === 'card' 
                        ? 'border-primary bg-primary' 
                        : 'border-white/40'
                    } flex items-center justify-center`}>
                      {paymentMethod === 'card' && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {/* Confirm Step */}
          {step === 'confirm' && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 mb-4">
                <Check className="w-5 h-5 text-primary" />
                <h3 className="text-white font-semibold">Confirm Order</h3>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Subtotal</span>
                  <span className="text-white">{product.currency} {product.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Shipping</span>
                  <span className="text-green-400">Free</span>
                </div>
                <div className="border-t border-white/10 pt-3 flex justify-between">
                  <span className="text-white font-semibold">Total</span>
                  <span className="text-primary font-bold text-lg">
                    {product.currency} {product.price.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white/60 text-xs mb-2">Shipping to:</p>
                <p className="text-white font-medium">{shippingInfo.fullName}</p>
                <p className="text-white/80 text-sm">{shippingInfo.address}</p>
                <p className="text-white/80 text-sm">
                  {shippingInfo.city}, {shippingInfo.state} {shippingInfo.postalCode}
                </p>
                <p className="text-white/80 text-sm">{shippingInfo.country}</p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white/60 text-xs mb-2">Payment method:</p>
                <p className="text-white font-medium">
                  {paymentMethod === 'wallet' ? 'Wallet Balance' : 'Credit/Debit Card'}
                </p>
              </div>
            </motion.div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mb-6"
              >
                <Check className="w-12 h-12 text-green-500" />
              </motion.div>
              <h3 className="text-white text-2xl font-bold mb-2">Order Placed!</h3>
              <p className="text-white/60 text-center">
                Your order has been placed successfully. The seller will be notified.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      {step !== 'success' && (
        <div className="p-4 border-t border-white/10 flex gap-3">
          {step !== 'shipping' && (
            <Button
              variant="outline"
              onClick={() => {
                if (step === 'payment') setStep('shipping');
                if (step === 'confirm') setStep('payment');
              }}
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              Back
            </Button>
          )}
          <Button
            onClick={() => {
              if (step === 'shipping') setStep('payment');
              else if (step === 'payment') setStep('confirm');
              else if (step === 'confirm') handleSubmit();
            }}
            disabled={!canProceed() || isProcessing}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            {isProcessing ? (
              <span className="animate-pulse">Processing...</span>
            ) : step === 'confirm' ? (
              `Pay ${product.currency} ${product.price.toFixed(2)}`
            ) : (
              'Continue'
            )}
          </Button>
        </div>
      )}
    </motion.div>
  );
};

export default StatusPurchaseModal;
