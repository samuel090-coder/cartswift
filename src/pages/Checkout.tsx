import { useState } from 'react';
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
import { motion } from 'framer-motion';

const Checkout = () => {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCart();
  const [step, setStep] = useState<'details' | 'payment' | 'confirmation'>('details');
  const [orderData, setOrderData] = useState<any>(null);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
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
      const orderItems = items.map(item => ({
        order_id: order.id,
        item_id: item.id,
        quantity: item.quantity,
        price_at_time: item.price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Handle specific payment method data
      if (formData.paymentMethod === 'bank_transfer') {
        await supabase.from('bank_transfer_payments').insert({
          order_id: order.id,
          amount_usd: total,
        });
      } else if (formData.paymentMethod === 'crypto_eth') {
        await supabase.from('crypto_payments').insert({
          order_id: order.id,
          amount_usd: total,
        });
      }

      return order;
    },
    onSuccess: (order, paymentReference) => {
      const estimatedDelivery = new Date();
      estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);
      
      setOrderData({
        id: order.id,
        paymentMethod: formData.paymentMethod,
        total,
        estimatedDelivery: estimatedDelivery.toLocaleDateString(),
        paymentReference,
      });
      
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

  const handleFileUpload = async (file: File, type: string, orderId?: string): Promise<string> => {
    try {
      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${type}/${fileName}`;

      console.log('Uploading file to payment-proofs bucket:', filePath);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
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
      
      // Store payment proof information with the order ID if available
      const { error: proofError } = await supabase
        .from('payment_proofs')
        .insert({
          order_id: orderId || null,
          payment_method: formData.paymentMethod as any,
          proof_type: type,
          file_url: fileUrl,
          file_name: file.name,
          file_size: file.size,
        });

      if (proofError) {
        console.error('Payment proof error:', proofError);
      }
      
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

  const handlePaymentSuccess = (paymentReference?: string) => {
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
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      
                      <div className="border-t pt-4 space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>${total.toFixed(2)}</span>
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
                          <span>${total.toFixed(2)}</span>
                        </div>
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
                  onClick={() => setStep('details')}
                  className="mb-4"
                >
                  ← Back to Details
                </Button>
                <h2 className="text-xl font-semibold">Complete Your Payment</h2>
              </div>
              
              <PaymentMethod
                method={formData.paymentMethod}
                total={total}
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
          setStep('payment');
        }}
      />
    </div>
  );
};

export default Checkout;
