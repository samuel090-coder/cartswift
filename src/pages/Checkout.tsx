import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import AnimatedCartIcon from '@/components/AnimatedCartIcon';
import PaymentMethod from '@/components/PaymentMethod';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronLeft, ShieldCheck } from 'lucide-react';
import { MANUAL_PAYMENT_METHODS, getCurrencySymbol, recordPaymentProof, uploadPaymentProof } from '@/lib/manualPayment';

const Checkout = () => {
  const navigate = useNavigate();
  const { items, total, clearCart, getCurrencySymbol } = useCart();
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'details' | 'payment' | 'done'>('details');
  const [method, setMethod] = useState<'bank_transfer' | 'crypto_eth' | 'gift_card'>('bank_transfer');
  const [order, setOrder] = useState<{ id: string; tracking_code: string } | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phoneNumber: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    deliveryInstructions: '',
  });

  const getSessionId = () => {
    let sessionId = localStorage.getItem('cartswift-session');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substr(2, 9);
      localStorage.setItem('cartswift-session', sessionId);
    }
    return sessionId;
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const requiredFields: Record<string, string> = {
      fullName: 'Full Name',
      phoneNumber: 'Phone Number',
      addressLine1: 'Address Line 1',
      city: 'City',
      state: 'State',
      postalCode: 'Postal Code',
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([field]) => !formData[field as keyof typeof formData]?.trim())
      .map(([, label]) => label);

    if (missingFields.length > 0) {
      toast({
        title: 'Missing Required Information',
        description: `Please fill in: ${missingFields.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    if (!items.length) return;

    setProcessing(true);
    try {
      const sessionId = getSessionId();
      const orderCurrency = items[0]?.currency || 'USD';

      const { data: createdOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          session_id: sessionId,
          email: formData.email,
          full_name: formData.fullName,
          phone_number: formData.phoneNumber,
          address_line1: formData.addressLine1,
          address_line2: formData.addressLine2 || null,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postalCode,
          country: 'US',
          delivery_instructions: formData.deliveryInstructions || null,
          payment_method: method as any,
          total_amount: total,
          currency: orderCurrency,
          status: 'pending' as any,
        })
        .select('id, tracking_code')
        .single();

      if (orderError) throw new Error(`Failed to create order: ${orderError.message}`);

      const { error: itemsError } = await supabase.from('order_items').insert(
        items.map((item) => ({
          order_id: createdOrder.id,
          item_id: item.id,
          quantity: item.quantity,
          price_at_time: item.price,
        }))
      );
      if (itemsError) throw new Error(`Failed to add items to order: ${itemsError.message}`);

      setOrder(createdOrder);
      setStep('payment');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error('[Checkout] order creation failed', error);
      toast({
        title: 'Could not create order',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentSuccess = async (reference?: string, giftCardData?: any, proofUrl?: string) => {
    if (!order) return;
    setProcessing(true);
    try {
      if (proofUrl) {
        await recordPaymentProof({
          orderId: order.id,
          paymentMethod: method,
          proofType: method === 'bank_transfer' ? 'bank_receipt' : method === 'crypto_eth' ? 'crypto_screenshot' : 'gift_card_image',
          fileUrl: proofUrl,
        });
      }

      await supabase
        .from('orders')
        .update({
          payment_method: method as any,
          payment_reference: reference || null,
          gift_card_data: giftCardData || null,
        } as any)
        .eq('id', order.id);

      try {
        await supabase.functions.invoke('send-order-notification', {
          body: {
            orderId: order.id,
            customerName: formData.fullName,
            customerEmail: formData.email,
            totalAmount: total,
            paymentMethod: method,
            items: items.map((item) => ({ title: item.title, quantity: item.quantity, price: item.price })),
          },
        });
      } catch (notificationError) {
        console.warn('Order notification failed', notificationError);
      }

      clearCart();
      setStep('done');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error('[Checkout] payment submission failed', error);
      toast({
        title: 'Submission failed',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (items.length === 0 && step === 'details') {
    navigate('/cart');
    return null;
  }

  const orderCurrency = items[0]?.currency || 'USD';

  if (step === 'done' && order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Payment Submitted!</h1>
            <p className="text-muted-foreground mb-6">
              Your proof of payment has been received. We'll confirm your payment within 30 minutes to 2 hours and your order will be processed.
            </p>
            <Card className="mb-6">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-1">Your tracking code</p>
                <p className="text-2xl font-mono font-bold tracking-widest">{order.tracking_code}</p>
              </CardContent>
            </Card>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate('/track')}>Track Order</Button>
              <Button onClick={() => navigate('/')}>Continue Shopping</Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <AnimatedCartIcon />
            <h1 className="text-2xl font-bold">Checkout</h1>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            {step === 'details' && (
              <form onSubmit={handleDetailsSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Contact & Shipping Information */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          placeholder="your@email.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="fullName">Full Name *</Label>
                        <Input
                          id="fullName"
                          required
                          value={formData.fullName}
                          onChange={(e) => handleInputChange('fullName', e.target.value)}
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phoneNumber">Phone Number *</Label>
                        <Input
                          id="phoneNumber"
                          required
                          value={formData.phoneNumber}
                          onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Shipping Address</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="addressLine1">Address Line 1 *</Label>
                        <Input
                          id="addressLine1"
                          required
                          value={formData.addressLine1}
                          onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                          placeholder="123 Main St"
                        />
                      </div>
                      <div>
                        <Label htmlFor="addressLine2">Address Line 2</Label>
                        <Input
                          id="addressLine2"
                          value={formData.addressLine2}
                          onChange={(e) => handleInputChange('addressLine2', e.target.value)}
                          placeholder="Apt, suite, etc."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="city">City *</Label>
                          <Input
                            id="city"
                            required
                            value={formData.city}
                            onChange={(e) => handleInputChange('city', e.target.value)}
                            placeholder="New York"
                          />
                        </div>
                        <div>
                          <Label htmlFor="state">State *</Label>
                          <Input
                            id="state"
                            required
                            value={formData.state}
                            onChange={(e) => handleInputChange('state', e.target.value)}
                            placeholder="NY"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="postalCode">Postal Code *</Label>
                        <Input
                          id="postalCode"
                          required
                          value={formData.postalCode}
                          onChange={(e) => handleInputChange('postalCode', e.target.value)}
                          placeholder="10001"
                        />
                      </div>
                      <div>
                        <Label htmlFor="deliveryInstructions">Delivery Instructions</Label>
                        <Textarea
                          id="deliveryInstructions"
                          value={formData.deliveryInstructions}
                          onChange={(e) => handleInputChange('deliveryInstructions', e.target.value)}
                          placeholder="Leave at front door, etc."
                          rows={3}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Order Summary */}
                <div>
                  <Card className="sticky top-4">
                    <CardHeader>
                      <CardTitle>Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {items.map((item) => (
                        <div key={item.id} className="flex justify-between items-center">
                          <div className="flex items-center space-x-3">
                            <img src={item.image} alt={item.title} className="w-12 h-12 object-cover rounded" />
                            <div>
                              <p className="font-medium text-sm">{item.title}</p>
                              <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                            </div>
                          </div>
                          <span className="font-medium">
                            {getCurrencySymbol(item.currency)}{(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}

                      <div className="border-t pt-4 space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>{getCurrencySymbol(orderCurrency)}{total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Shipping</span>
                          <span className="text-green-600">Free</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Est. Delivery</span>
                          <span className="text-sm text-gray-600">7 days</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg border-t pt-2">
                          <span>Total</span>
                          <span>{getCurrencySymbol(orderCurrency)}{total.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                          <div className="font-semibold">Flexible payment options</div>
                          <div>Pay by bank transfer, cryptocurrency, or gift card on the next step.</div>
                        </div>
                      </div>

                      <Button type="submit" className="w-full" size="lg" disabled={processing}>
                        {processing ? 'Creating order…' : 'Continue to Payment'}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </form>
            )}

            {step === 'payment' && order && (
              <div className="max-w-2xl mx-auto space-y-6">
                <button
                  onClick={() => setStep('details')}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" /> Back to details
                </button>

                <Card>
                  <CardHeader>
                    <CardTitle>Choose Payment Method</CardTitle>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>

                <PaymentMethod
                  method={method}
                  total={total}
                  currency={orderCurrency}
                  onPaymentSuccess={handlePaymentSuccess}
                  onFileUpload={async (file, type) => uploadPaymentProof(file, type)}
                />

                <p className="text-xs text-center text-muted-foreground">
                  Order total: <b>{getCurrencySymbol(orderCurrency)}{total.toFixed(2)}</b> · Tracking code: <span className="font-mono">{order.tracking_code}</span>
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
