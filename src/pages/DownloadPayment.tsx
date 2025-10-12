import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import PaymentMethod from '@/components/PaymentMethod';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Download, Shield, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const DownloadPayment = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

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

  const handlePaymentComplete = async (paymentReference?: string, giftCardData?: any) => {
    // Navigate to email submission page with payment reference
    setShowPaymentDialog(false);
    navigate(`/download/${itemId}/email?payment=${paymentReference || 'pending'}`);
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

  const allowedMethods = item.allowed_payment_methods || ['crypto', 'bank_transfer', 'gift_card'];

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
                Complete Your Purchase
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
                    After payment confirmation, you'll receive a download link via email valid for 24 hours.
                  </p>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select Payment Method *
                </label>
                <Select onValueChange={setSelectedPaymentMethod} value={selectedPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedMethods.includes('crypto') && (
                      <SelectItem value="crypto_eth">Cryptocurrency (ETH)</SelectItem>
                    )}
                    {allowedMethods.includes('bank_transfer') && (
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    )}
                    {allowedMethods.includes('gift_card') && (
                      <SelectItem value="gift_card">Gift Card</SelectItem>
                    )}
                    {allowedMethods.includes('stripe') && (
                      <SelectItem value="credit_card">Credit/Debit Card</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Processing Time Notice */}
              <div className="flex gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-yellow-900">Payment Verification</p>
                  <p className="text-yellow-700">
                    Manual payments are verified within 30 minutes to 2 hours during business hours.
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
                  onClick={() => setShowPaymentDialog(true)}
                  disabled={!selectedPaymentMethod}
                >
                  Proceed to Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-2xl">
          <PaymentMethod
            method={selectedPaymentMethod}
            total={Number(item?.price || 0)}
            currency={item?.currency || 'USD'}
            onPaymentSuccess={handlePaymentComplete}
            onFileUpload={async (file, type) => {
              // Upload file to storage
              const fileExt = file.name.split('.').pop();
              const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
              const filePath = `${type}/${fileName}`;
              
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('payment-proofs')
                .upload(filePath, file);
              
              if (uploadError) throw uploadError;
              
              const { data: urlData } = supabase.storage
                .from('payment-proofs')
                .getPublicUrl(filePath);
              
              return urlData.publicUrl;
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DownloadPayment;
