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
import { motion } from 'framer-motion';
import { CreditCard, Lock } from 'lucide-react';
import { formatNaira, getPaystackAmountNgn, initializePaystackPayment, makePaymentReference } from '@/lib/paystack';

const Checkout = () => {
  const navigate = useNavigate();
  const { items, total, clearCart, getCurrencySymbol } = useCart();
  const [processing, setProcessing] = useState(false);
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
    console.log('Form submission started, validating form data...');
    
    // Comprehensive form validation
    const requiredFields = {
      fullName: 'Full Name',
      phoneNumber: 'Phone Number', 
      addressLine1: 'Address Line 1',
      city: 'City',
      state: 'State',
      postalCode: 'Postal Code',
    };

    // Check for missing required fields
    const missingFields = [];
    for (const [field, label] of Object.entries(requiredFields)) {
      if (!formData[field as keyof typeof formData]?.trim()) {
        missingFields.push(label);
      }
    }

    if (missingFields.length > 0) {
      console.error('Form validation failed - missing fields:', missingFields);
      toast({
        title: "Missing Required Information",
        description: `Please fill in: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    if (!items.length) return;

    setProcessing(true);
    try {
      const sessionId = getSessionId();
      const orderCurrency = items[0]?.currency || 'USD';
      const reference = makePaymentReference('cs_order');
      const paystackAmountNgn = getPaystackAmountNgn(total, orderCurrency);
      const orderItems = items.map(item => ({ title: item.title, quantity: item.quantity, price: item.price }));

      console.info('[Checkout] creating Paystack order', { reference, total, orderCurrency, paystackAmountNgn, itemCount: items.length });

      const { data: order, error: orderError } = await supabase
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
          payment_method: 'credit_card' as any,
          payment_reference: reference,
          total_amount: total,
          currency: orderCurrency,
          status: 'pending' as any,
        })
        .select('id, tracking_code')
        .single();

      if (orderError) throw new Error(`Failed to create order: ${orderError.message}`);

      const { error: itemsError } = await supabase.from('order_items').insert(items.map((item) => ({
        order_id: order.id,
        item_id: item.id,
        quantity: item.quantity,
        price_at_time: item.price,
      })));
      if (itemsError) throw new Error(`Failed to add items to order: ${itemsError.message}`);

      try {
        await supabase.functions.invoke('send-order-notification', {
          body: { orderId: order.id, customerName: formData.fullName, customerEmail: formData.email, totalAmount: total, paymentMethod: 'Paystack', items: orderItems },
        });
      } catch (notificationError) {
        console.warn('Order notification failed', notificationError);
      }

      const callback_url = `${window.location.origin}/payment/return?target=order&id=${encodeURIComponent(order.id)}&kind=order`;
      const payment = await initializePaystackPayment({
        email: formData.email,
        amount: paystackAmountNgn,
        currency: 'NGN',
        reference,
        callback_url,
        metadata: {
          kind: 'order',
          order_id: order.id,
          session_id: sessionId,
          original_amount: total,
          original_currency: orderCurrency,
          tracking_code: order.tracking_code,
        },
      });

      if (!payment.authorization_url) throw new Error('No Paystack authorization URL returned');
      clearCart();
      window.location.href = payment.authorization_url;
    } catch (error: any) {
      console.error('[Checkout] Paystack checkout failed', error);
      toast({
        title: "Payment could not start",
        description: error?.message || "Paystack initialization failed. Please try again.",
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (items.length === 0) {
    console.log('Checkout page: No items in cart, redirecting to cart page');
    navigate('/cart');
    return null;
  }

  const orderCurrency = items[0]?.currency || 'USD';
  const paystackAmountNgn = getPaystackAmountNgn(total, orderCurrency);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <AnimatedCartIcon />
            <h1 className="text-2xl font-bold">Checkout</h1>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
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

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Secure Payment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                        All orders are paid securely by Paystack. No screenshots, bank transfer, crypto, or gift card payment proof is collected.
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
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-12 h-12 object-cover rounded"
                            />
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
                          <span>{items.length > 0 ? getCurrencySymbol(items[0].currency) : '$'}{total.toFixed(2)}</span>
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
                          <span>{items.length > 0 ? getCurrencySymbol(items[0].currency) : '$'}{total.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
                        <div className="flex items-start gap-2 text-sm text-blue-900">
                          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                          <div>
                            <div className="font-semibold">Paystack secure checkout</div>
                            <div>Paystack charge amount: <b>{formatNaira(paystackAmountNgn)}</b></div>
                          </div>
                        </div>
                      </div>
                      
                      <Button type="submit" className="w-full" size="lg" disabled={processing}>
                        {processing ? 'Redirecting to Paystack…' : 'Pay securely with Paystack'}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
