import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { toast } from '@/hooks/use-toast';
import { CheckCircle2, Download, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import PaymentMethod from '@/components/PaymentMethod';
import { MANUAL_PAYMENT_METHODS, getCurrencySymbol, recordPaymentProof, uploadPaymentProof } from '@/lib/manualPayment';

const DownloadPayment = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [email, setEmail] = useState('');
  const [targetCurrency, setTargetCurrency] = useState('');
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [method, setMethod] = useState<'bank_transfer' | 'crypto_eth' | 'gift_card'>('bank_transfer');
  const [submitted, setSubmitted] = useState(false);

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
        title: 'Exchange Rate Error',
        description: 'Could not fetch current exchange rates. Showing original price.',
        variant: 'destructive',
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

  const handlePaymentSuccess = async (reference?: string, giftCardData?: any, proofUrl?: string) => {
    if (!email) {
      toast({
        title: 'Email Required',
        description: 'Please enter your email address to receive the download link.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const sessionId = getSessionId();

      const { data: tokenData, error: tokenError } = await supabase.rpc('generate_download_token');
      if (tokenError) throw tokenError;

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          session_id: sessionId,
          total_amount: Number(item?.price || 0),
          currency: item?.currency || 'USD',
          payment_method: method as any,
          status: 'pending',
          email: email,
          full_name: email.split('@')[0],
          address_line1: 'Digital Download',
          city: 'Digital',
          state: 'N/A',
          postal_code: '00000',
          country: 'Digital',
          payment_reference: reference || null,
          gift_card_data: giftCardData || null,
        } as any)
        .select('id, tracking_code')
        .single();

      if (orderError) throw orderError;

      const { error: itemError } = await supabase.from('order_items').insert({
        order_id: orderData.id,
        item_id: itemId,
        quantity: 1,
        price_at_time: Number(item?.price || 0),
      });
      if (itemError) throw itemError;

      const { error: downloadError } = await supabase.from('downloads').insert({
        item_id: itemId,
        email: email,
        download_token: tokenData,
        session_id: sessionId,
        payment_verified: false,
        expires_at: expiresAt.toISOString(),
      });
      if (downloadError) console.error('Download record error:', downloadError);

      if (proofUrl) {
        await recordPaymentProof({
          orderId: orderData.id,
          paymentMethod: method,
          proofType: method === 'bank_transfer' ? 'bank_receipt' : method === 'crypto_eth' ? 'crypto_screenshot' : 'gift_card_image',
          fileUrl: proofUrl,
        });
      }

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error creating download order:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit your payment. Please try again or contact support.',
        variant: 'destructive',
      });
    } finally {
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

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Payment Submitted!</h1>
            <p className="text-muted-foreground mb-6">
              Once your payment is confirmed, your download link will be sent to <b>{email}</b>. This usually takes 30 minutes to 2 hours.
            </p>
            <Button onClick={() => navigate('/')}>Return to Home</Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
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
                  <img src={item.images[0]} alt={item.title} className="w-20 h-20 object-cover rounded" />
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
                    After your payment is confirmed, you'll receive a download link via email valid for 24 hours.
                  </p>
                </div>
              </div>

              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium mb-2">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Your download link will be sent to this email</p>
              </div>

              {/* Currency Converter */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
                <label className="block text-sm font-medium mb-2">Convert to Your Currency (Optional)</label>
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

                {isLoadingRate && <p className="text-sm text-blue-600 mt-2">Fetching exchange rate...</p>}

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
            </CardContent>
          </Card>

          {/* Payment Method Selection */}
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
            total={Number(item.price || 0)}
            currency={item.currency || 'USD'}
            onPaymentSuccess={handlePaymentSuccess}
            onFileUpload={async (file, type) => uploadPaymentProof(file, type)}
          />

          <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
            Cancel
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default DownloadPayment;
