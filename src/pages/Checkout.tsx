import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCart } from '@/contexts/CartContext';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import PaymentMethod from '@/components/PaymentMethod';
import PaymentConfirmation from '@/components/PaymentConfirmation';
import AnimatedCartIcon from '@/components/AnimatedCartIcon';
import PaymentProcessingPopup from '@/components/PaymentProcessingPopup';
import OrderPreviewAnimation from '@/components/OrderPreviewAnimation';
import { motion } from 'framer-motion';

type PendingPaymentProof = {
  proof_type: string;
  file_url: string;
  file_name: string;
  file_size: number;
};

const Checkout = () => {
  const navigate = useNavigate();
  const { items, total, clearCart, getCurrencySymbol } = useCart();
  const [step, setStep] = useState<'details' | 'preview' | 'payment' | 'confirmation'>('details');
  const [orderData, setOrderData] = useState<any>(null);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [targetCurrency, setTargetCurrency] = useState('');
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const pendingProofsRef = useRef<PendingPaymentProof[]>([]);
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
    paymentMethod: '',
  });

  const getSessionId = () => {
    let sessionId = localStorage.getItem('cartswift-session');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substr(2, 9);
      localStorage.setItem('cartswift-session', sessionId);
    }
    return sessionId;
  };

  const fetchExchangeRate = async (from: string, to: string) => {
    if (!to || to === 'none' || from === to) {
      setExchangeRate(null);
      return;
    }
    
    setIsLoadingRate(true);
    try {
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);
      const data = await response.json();
      setExchangeRate(data.rates[to]);
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      toast({
        title: "Exchange Rate Error",
        description: "Could not fetch current exchange rates. Showing original price.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRate(false);
    }
  };

  const orderMutation = useMutation({
    mutationFn: async (paymentReference?: string) => {
      const sessionId = getSessionId();

      // Create order
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
          delivery_instructions: formData.deliveryInstructions || null,
          payment_method: formData.paymentMethod as any,
          payment_reference: paymentReference || null,
          total_amount: total,
          status: formData.paymentMethod === 'credit_card' ? 'processing' : 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        item_id: item.id,
        quantity: item.quantity,
        price_at_time: item.price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Link uploaded payment proofs to the created order
      if (pendingProofsRef.current.length > 0) {
        const proofRows = pendingProofsRef.current.map((p) => ({
          order_id: order.id,
          payment_method: formData.paymentMethod as any,
          proof_type: p.proof_type,
          file_url: p.file_url,
          file_name: p.file_name,
          file_size: p.file_size,
        }));

        const { error: proofError } = await supabase
          .from('payment_proofs')
          .insert(proofRows);

        if (proofError) {
          console.error('Payment proof insert error:', proofError);
        }

        pendingProofsRef.current = [];
      }

      // Handle specific payment method data
      if (formData.paymentMethod === 'bank_transfer') {
        console.log('Creating bank transfer payment record for order:', order.id);
        await supabase.from('bank_transfer_payments').insert({
          order_id: order.id,
          amount_usd: total,
          currency: items[0]?.currency || 'USD',
        });
      } else if (formData.paymentMethod === 'crypto_eth') {
        console.log('Creating crypto payment record for order:', order.id);
        await supabase.from('crypto_payments').insert({
          order_id: order.id,
          amount_usd: total,
          currency: items[0]?.currency || 'USD',
        });
      } else if (formData.paymentMethod === 'gift_card') {
        console.log('Creating gift card payment record for order:', order.id);
        // Check if we have gift card data to update
        const giftCardDataFromState = orderData?.giftCardData;
        if (giftCardDataFromState) {
          const { error: giftCardError } = await supabase.from('gift_card_payments').insert({
            order_id: order.id,
            brand: giftCardDataFromState.brand === 'other' ? giftCardDataFromState.customBrand : giftCardDataFromState.brand,
            estimated_value: parseFloat(giftCardDataFromState.estimatedValue),
            card_code: giftCardDataFromState.cardCode || null,
            additional_notes: giftCardDataFromState.notes || null,
          });
          if (giftCardError) {
            console.error('Gift card payment creation error:', giftCardError);
          } else {
            console.log('Gift card payment successfully created for order:', order.id);
          }
        } else {
          // Fallback - create a pending record
          const { error: giftCardError } = await supabase.from('gift_card_payments').insert({
            order_id: order.id,
            brand: 'pending',
            estimated_value: total,
          });
          if (giftCardError) {
            console.error('Gift card payment creation error:', giftCardError);
          }
        }
      }

      return order;
    },
    onSuccess: async (order, paymentReference) => {
      const estimatedDelivery = new Date();
      estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);
      
      setOrderData({
        id: order.id,
        paymentMethod: formData.paymentMethod,
        total,
        estimatedDelivery: estimatedDelivery.toLocaleDateString(),
        paymentReference,
      });
      
      // Send notification to admin
      try {
        const orderItems = items.map(item => ({
          title: item.title,
          quantity: item.quantity,
          price: item.price
        }));

        await supabase.functions.invoke('send-order-notification', {
          body: {
            orderId: order.id,
            customerName: formData.fullName,
            customerEmail: formData.email,
            totalAmount: total,
            paymentMethod: formData.paymentMethod,
            items: orderItems
          }
        });
        console.log('Admin notification sent successfully');
      } catch (notificationError) {
        console.error('Failed to send admin notification:', notificationError);
        // Don't fail the order if notification fails
      }
      
      setStep('confirmation');
      clearCart();
      
      if (formData.paymentMethod === 'credit_card') {
        toast({
          title: "Order placed successfully!",
          description: "You will receive a confirmation email shortly.",
        });
      } else {
        toast({
          title: "Order submitted for review!",
          description: "We'll confirm your payment within 30 minutes to 2 hours.",
        });
      }
    },
    onError: (error) => {
      console.error('Order error:', error);
      toast({
        title: "Order failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (file: File, type: string, _orderId?: string): Promise<string> => {
    try {
      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${type}/${fileName}`;

      console.log('Uploading file to payment-proofs bucket:', filePath);

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath);

      const fileUrl = urlData.publicUrl;
      console.log('File uploaded successfully, URL:', fileUrl);

      // Save temporarily; we will attach these proofs to the order after the order is created
      pendingProofsRef.current = [
        ...pendingProofsRef.current,
        {
          proof_type: type,
          file_url: fileUrl,
          file_name: file.name,
          file_size: file.size,
        },
      ];

      return fileUrl;
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
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
      paymentMethod: 'Payment Method'
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

    console.log('Form validation passed, showing payment popup...');
    try {
      setShowPaymentPopup(true);
    } catch (error) {
      console.error('Error showing payment popup:', error);
      toast({
        title: "Checkout Error",
        description: "Something went wrong during checkout. Please try again or contact support.",
        variant: "destructive",
      });
    }
  };

  const handlePaymentSuccess = (paymentReference?: string, giftCardData?: any) => {
    console.log('Payment success handler called with:', { paymentReference, giftCardData });
    if (giftCardData) {
      // Store gift card data for processing after order creation
      setOrderData({ ...orderData, giftCardData });
    }
    orderMutation.mutate(paymentReference);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (items.length === 0) {
    console.log('Checkout page: No items in cart, redirecting to cart page');
    navigate('/cart');
    return null;
  }

  console.log('Checkout page loaded with items:', items);

  if (step === 'confirmation' && orderData) {
    return (
      <PaymentConfirmation
        orderData={orderData}
        onContinueShopping={() => navigate('/')}
      />
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
          
          {step === 'details' && (
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
                      <CardTitle>Payment Method</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Select onValueChange={(value) => handleInputChange('paymentMethod', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="credit_card">Credit/Debit Card (Paystack)</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="gift_card">Gift Card</SelectItem>
                          <SelectItem value="crypto_eth">Cryptocurrency (ETH)</SelectItem>
                        </SelectContent>
                      </Select>
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
                      
                      {/* Currency Converter */}
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
                        <label className="block text-sm font-medium mb-2">
                          Convert to Your Currency
                        </label>
                        <Select 
                          value={targetCurrency} 
                          onValueChange={(value) => {
                            setTargetCurrency(value);
                            if (value && value !== 'none' && items.length > 0) {
                              fetchExchangeRate(items[0].currency || 'USD', value);
                            } else {
                              setExchangeRate(null);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select your local currency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No conversion</SelectItem>
                            <SelectItem value="USD">USD - US Dollar</SelectItem>
                            <SelectItem value="NGN">NGN - Nigerian Naira</SelectItem>
                            <SelectItem value="EUR">EUR - Euro</SelectItem>
                            <SelectItem value="GBP">GBP - British Pound</SelectItem>
                            <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                            <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                            <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                            <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                            <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {isLoadingRate && (
                          <p className="text-sm text-blue-600 mt-2">Fetching exchange rate...</p>
                        )}
                        
                        {exchangeRate && targetCurrency && items.length > 0 && (
                          <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                            <p className="text-sm text-gray-600 mb-1">
                              Original Total: {getCurrencySymbol(items[0].currency)}{total.toFixed(2)} {items[0].currency}
                            </p>
                            <p className="text-lg font-bold text-blue-600">
                              You'll pay approximately: {getCurrencySymbol(targetCurrency)}{(total * exchangeRate).toFixed(2)} {targetCurrency}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Rate: 1 {items[0].currency} = {exchangeRate.toFixed(4)} {targetCurrency}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <Button type="submit" className="w-full" size="lg">
                        Checkout
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </form>
            </motion.div>
          )}

          {step === 'preview' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <OrderPreviewAnimation
                items={items.map(item => ({
                  id: item.id,
                  title: item.title,
                  price: item.price,
                  quantity: item.quantity,
                  images: item.image ? [item.image] : undefined,
                  currency: item.currency
                }))}
                onProceedToPayment={() => setStep('payment')}
                getCurrencySymbol={getCurrencySymbol}
              />
            </motion.div>
          )}

          {step === 'payment' && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl mx-auto"
            >
              <div className="mb-6">
                <Button 
                  variant="outline" 
                  onClick={() => setStep('preview')}
                  className="mb-4"
                >
                  ← Back to Preview
                </Button>
                <h2 className="text-xl font-semibold">Complete Your Payment</h2>
              </div>
              
              <PaymentMethod
                method={formData.paymentMethod}
                total={total}
                currency={items[0]?.currency || 'USD'}
                onPaymentSuccess={handlePaymentSuccess}
                onFileUpload={handleFileUpload}
              />
              
              {orderMutation.isPending && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white p-6 rounded-lg text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p>Processing your order...</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
      
      <PaymentProcessingPopup 
        show={showPaymentPopup}
        onComplete={() => {
          setShowPaymentPopup(false);
          setStep('preview');
        }}
      />
    </div>
  );
};

export default Checkout;
