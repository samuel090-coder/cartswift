import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { toast } from '@/hooks/use-toast';
import { CreditCard, Download, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatNaira, getPaystackAmountNgn, initializePaystackPayment, makePaymentReference } from '@/lib/paystack';

const DownloadPayment = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [email, setEmail] = useState('');
  const [targetCurrency, setTargetCurrency] = useState('');
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      'USD': '$',
      'NGN': '₦',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CNY': '¥',
      'INR': '₹',
      'AUD': 'A$',
      'CAD': 'C$',
    };
    return symbols[currency] || currency;
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

  const { data: item, isLoading } = useQuery({
    queryKey: ['download-item', itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('id', itemId)
        .in('item_type', ['apk', 'file'])
        .single();
      if (error) throw error;
      return data;
    },
  });

  const getSessionId = () => {
    let sessionId = localStorage.getItem('cartswift-session');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substr(2, 9);
      localStorage.setItem('cartswift-session', sessionId);
    }
    return sessionId;
  };

  const handlePaystackCheckout = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address to receive the download link.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const sessionId = getSessionId();
      const reference = makePaymentReference('cs_download', itemId);
      
      // Generate download token
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('generate_download_token');
      
      if (tokenError) throw tokenError;
      
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Create an order for this APK/file purchase (digital download - use placeholder address)
      console.log('Creating order for APK/file purchase...');
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          session_id: sessionId,
          total_amount: Number(item?.price || 0),
          currency: item?.currency || 'USD',
          payment_method: 'credit_card' as any,
          status: 'pending',
          email: email,
          full_name: email.split('@')[0], // Use email prefix as name
          address_line1: 'Digital Download',
          city: 'Digital',
          state: 'N/A',
          postal_code: '00000',
          country: 'Digital',
          payment_reference: reference,
        })
        .select('id, tracking_code')
        .single();

      if (orderError) {
        console.error('Order creation error:', orderError);
        throw orderError;
      }
      console.log('Order created:', orderData);

      // Add order item
      const { error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: orderData.id,
          item_id: itemId,
          quantity: 1,
          price_at_time: Number(item?.price || 0),
        });

      if (itemError) {
        console.error('Order item error:', itemError);
        throw itemError;
      }

      // Create download record
      const { data: downloadData, error: downloadError } = await supabase
        .from('downloads')
        .insert({
          item_id: itemId,
          email: email,
          download_token: tokenData,
          session_id: sessionId,
          payment_verified: false,
          expires_at: expiresAt.toISOString(),
        })
        .select('id')
        .single();

      if (downloadError) {
        console.error('Download record error:', downloadError);
        // Don't throw - order is created
      }

      const paystackAmountNgn = getPaystackAmountNgn(Number(item?.price || 0), item?.currency || 'USD');
      console.info('[DownloadPayment] initializing Paystack', { orderId: orderData.id, downloadId: downloadData?.id, reference, paystackAmountNgn });
      const payment = await initializePaystackPayment({
        email,
        amount: paystackAmountNgn,
        currency: 'NGN',
        reference,
        callback_url: `${window.location.origin}/payment/return?target=order&id=${encodeURIComponent(orderData.id)}&kind=download`,
        metadata: {
          kind: 'download',
          order_id: orderData.id,
          download_id: downloadData?.id,
          item_id: itemId,
          original_amount: Number(item?.price || 0),
          original_currency: item?.currency || 'USD',
        },
      });
      if (!payment.authorization_url) throw new Error('No Paystack authorization URL returned');
      window.location.href = payment.authorization_url;
    } catch (error) {
      console.error('Error creating download order:', error);
      toast({
        title: "Error",
        description: "Failed to start Paystack payment. Please try again or contact support.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Item not found</h1>
          <Button onClick={() => navigate('/')}>Return to Home</Button>
        </div>
      </div>
    );
  }

  const paystackAmountNgn = getPaystackAmountNgn(Number(item?.price || 0), item?.currency || 'USD');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-6 w-6" />
                Download Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Item Details */}
              <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                {item.images && item.images[0] && (
                  <img
                    src={item.images[0]}
                    alt={item.title}
                    className="w-20 h-20 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-2xl font-bold text-green-600">
                      {getCurrencySymbol(item.currency || 'USD')}{Number(item.price).toFixed(2)}
                    </span>
                    {item.file_size && (
                      <span className="text-sm text-gray-500">
                        ({(item.file_size / (1024 * 1024)).toFixed(1)} MB)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Security Notice */}
              <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-blue-900">Secure Download</p>
                  <p className="text-blue-700">
                    Pay securely with Paystack. After payment confirmation, you'll receive a download link via email valid for 24 hours.
                  </p>
                </div>
              </div>

              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your download link will be sent to this email
                </p>
              </div>

              {/* Currency Converter */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
                <label className="block text-sm font-medium mb-2">
                  Convert to Your Currency (Optional)
                </label>
                <Select 
                  value={targetCurrency} 
                  onValueChange={(value) => {
                    setTargetCurrency(value);
                    if (value && value !== 'none' && item?.currency) {
                      fetchExchangeRate(item.currency, value);
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
                
                {exchangeRate && targetCurrency && item && (
                  <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                    <p className="text-sm text-gray-600 mb-1">
                      Original Price: {getCurrencySymbol(item.currency)}{Number(item.price).toFixed(2)} {item.currency}
                    </p>
                    <p className="text-lg font-bold text-blue-600">
                      You'll pay approximately: {getCurrencySymbol(targetCurrency)}{(Number(item.price) * exchangeRate).toFixed(2)} {targetCurrency}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Rate: 1 {item.currency} = {exchangeRate.toFixed(4)} {targetCurrency}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CreditCard className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-green-900">Paystack Checkout</p>
                  <p className="text-green-700">
                    You will be redirected to Paystack to pay {formatNaira(paystackAmountNgn)} securely.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/')}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handlePaystackCheckout}
                  disabled={!email || isProcessing}
                >
                  {isProcessing ? 'Redirecting…' : 'Pay with Paystack'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default DownloadPayment;
