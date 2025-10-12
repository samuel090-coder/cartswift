
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Copy, Upload, CreditCard, Building2, Gift, Coins } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { handleGiftCardPayment } from '@/components/GiftCardPaymentHandler';

interface PaymentMethodProps {
  method: string;
  total: number;
  currency?: string;
  onPaymentSuccess: (reference?: string, giftCardData?: any) => void;
  onFileUpload: (file: File, type: string, orderId?: string) => Promise<string>;
}

const PaymentMethod = ({ method, total, currency = 'USD', onPaymentSuccess, onFileUpload }: PaymentMethodProps) => {
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [giftCardData, setGiftCardData] = useState({
    brand: '',
    customBrand: '',
    estimatedValue: '',
    cardCode: '',
    notes: '',
    currency: 'USD'
  });

  const giftCardBrands = [
    { id: 'steam', name: 'Steam', logo: '🎮' },
    { id: 'walmart', name: 'Walmart MoneyCard', logo: '🏪' },
    { id: 'razer', name: 'Razer', logo: '⚡' },
    { id: 'xbox', name: 'Xbox', logo: '🎮' },
    { id: 'macys', name: "Macy's", logo: '🛍️' },
    { id: 'apple', name: 'Apple/iTunes', logo: '🍎' },
    { id: 'sephora', name: 'Sephora', logo: '💄' },
    { id: 'footlocker', name: 'Foot Locker', logo: '👟' },
    { id: 'nike', name: 'Nike', logo: '✓' },
    { id: 'google', name: 'Google', logo: '🔍' },
    { id: 'amazon', name: 'Amazon', logo: '📦' },
    { id: 'nordstrom', name: 'Nordstrom', logo: '👗' },
    { id: 'roblox', name: 'Roblox', logo: '🎮' },
    { id: 'amex', name: 'AMEX', logo: '💳' },
    { id: 'vanilla', name: 'Vanilla', logo: '🍦' },
  ];

  const currencies = [
    { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
    { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
    { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
    { code: 'BRL', name: 'Brazilian Real', flag: '🇧🇷' },
    { code: 'NZD', name: 'New Zealand Dollar', flag: '🇳🇿' },
    { code: 'HKD', name: 'Hong Kong Dollar', flag: '🇭🇰' },
    { code: 'TWD', name: 'Taiwan Dollar', flag: '🇹🇼' },
    { code: 'MXN', name: 'Mexican Peso', flag: '🇲🇽' },
    { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬' },
    { code: 'EUR', name: 'Euro (Netherlands)', flag: '🇳🇱' },
    { code: 'MYR', name: 'Malaysian Ringgit', flag: '🇲🇾' },
    { code: 'IDR', name: 'Indonesian Rupiah', flag: '🇮🇩' },
    { code: 'TRY', name: 'Turkish Lira', flag: '🇹🇷' },
    { code: 'THB', name: 'Thai Baht', flag: '🇹🇭' },
    { code: 'PHP', name: 'Philippine Peso', flag: '🇵🇭' },
    { code: 'COP', name: 'Colombian Peso', flag: '🇨🇴' },
  ];
  const [cryptoNotes, setCryptoNotes] = useState('');
  const [bankNotes, setBankNotes] = useState('');

  const getCurrencySymbol = (curr: string) => {
    const symbols: Record<string, string> = {
      'USD': '$', 'NGN': '₦', 'EUR': '€', 'GBP': '£',
      'JPY': '¥', 'CNY': '¥', 'INR': '₹', 'AUD': 'A$', 'CAD': 'C$',
    };
    return symbols[curr] || curr;
  };

  const handlePaystackPayment = () => {
    // Paystack only supports NGN, so we convert if needed
    let amountInKobo: number;
    let paystackCurrency = 'NGN';
    
    if (currency === 'NGN') {
      amountInKobo = Math.round(total * 100); // Convert to kobo
    } else {
      // For non-NGN currencies, convert (rough estimate - ideally use real-time rates)
      const conversionRate = currency === 'USD' ? 1500 : 1500;
      amountInKobo = Math.round(total * conversionRate * 100);
    }

    const handler = (window as any).PaystackPop.setup({
      key: 'pk_live_0e0f5f39decd0ac1abe180cddf4b41fe5b45d10b',
      email: 'customer@cartswift.com',
      amount: amountInKobo,
      currency: paystackCurrency,
      callback: function(response: any) {
        onPaymentSuccess(response.reference);
        toast({
          title: "Payment Successful!",
          description: `Payment reference: ${response.reference}`,
        });
      },
      onClose: function() {
        toast({
          title: "Payment Cancelled",
          description: "Payment was not completed",
          variant: "destructive",
        });
      }
    });
    handler.openIframe();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const fileUrl = await onFileUpload(file, type);
      setUploadedFiles(prev => [...prev, fileUrl]);
      console.log('File uploaded successfully:', fileUrl, 'Type:', type);
      toast({
        title: "File uploaded successfully",
        description: "Your proof of payment has been submitted",
      });
    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGiftCardSubmit = async () => {
    if (!giftCardData.brand || !giftCardData.estimatedValue) {
      console.error('Gift card validation failed - missing required fields');
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (uploadedFiles.length === 0) {
      console.error('Gift card validation failed - no files uploaded');
      toast({
        title: "Missing files",
        description: "Please upload both gift card image and receipt",
        variant: "destructive",
      });
      return;
    }

    console.log('Gift card submission started with data:', giftCardData, 'Files:', uploadedFiles);
    onPaymentSuccess(undefined, giftCardData);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard",
    });
  };

  if (method === 'credit_card') {
    const currencySymbol = getCurrencySymbol(currency);
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Credit/Debit Card (Paystack)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800 mb-2">
              Secure payment powered by Paystack
            </p>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-blue-900">
                {currencySymbol}{total.toLocaleString()}
              </p>
            </div>
          </div>
          <Button 
            onClick={handlePaystackPayment}
            className="w-full"
            size="lg"
          >
            Pay {currencySymbol}{total.toLocaleString()}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (method === 'bank_transfer') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Bank Transfer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800 mb-3">
              Make payment to the following bank account and upload proof of payment. 
              Your order will be confirmed within 30 minutes to 2 hours.
            </p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-medium text-sm text-gray-600">Account Name:</span>
                <span className="font-semibold">Samuel Sunday</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-medium text-sm text-gray-600">Bank Name:</span>
                <span className="font-semibold">Wells Fargo</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-medium text-sm text-gray-600">Account Number:</span>
                <span className="font-mono font-semibold">40630281780274976</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-medium text-sm text-gray-600">Routing Number:</span>
                <span className="font-mono font-semibold">121000248</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-medium text-sm text-gray-600">SWIFT Code:</span>
                <span className="font-mono font-semibold">WFBIUS6SXXX</span>
              </div>
              <div className="pt-2">
                <span className="font-medium text-sm text-gray-600">Bank Address:</span>
                <p className="text-sm mt-1">580 California Street, San Francisco, CA 94104, US</p>
              </div>
            </div>
            <Badge variant="outline" className="mt-3">
              Amount: {getCurrencySymbol(currency)}{total.toFixed(2)}
            </Badge>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="bank-proof">Upload Proof of Payment *</Label>
              <Input
                id="bank-proof"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handleFileUpload(e, 'bank_receipt')}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="bank-notes">Optional Note</Label>
              <Textarea
                id="bank-notes"
                value={bankNotes}
                onChange={(e) => setBankNotes(e.target.value)}
                placeholder="Any additional information..."
                rows={3}
              />
            </div>

            <Button 
              onClick={() => onPaymentSuccess()}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? 'Uploading...' : 'Submit Proof'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (method === 'gift_card') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Gift Card
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-sm text-green-800">
              Cart Total: <span className="font-bold">{getCurrencySymbol(currency)}{total.toFixed(2)}</span> — 
              Please upload a gift card of equal or higher value.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gift-brand">Gift Card Brand *</Label>
                <Select value={giftCardData.brand} onValueChange={(value) => 
                  setGiftCardData(prev => ({ ...prev, brand: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="steam">🎮 Steam</SelectItem>
                    <SelectItem value="walmart">🛒 Walmart MoneyCard</SelectItem>
                    <SelectItem value="razer">🐍 Razer</SelectItem>
                    <SelectItem value="xbox">🎮 Xbox</SelectItem>
                    <SelectItem value="macys">🛍️ Macy's</SelectItem>
                    <SelectItem value="apple">🍎 Apple/iTunes</SelectItem>
                    <SelectItem value="sephora">💄 Sephora</SelectItem>
                    <SelectItem value="footlocker">👟 Foot Locker</SelectItem>
                    <SelectItem value="nike">✅ Nike</SelectItem>
                    <SelectItem value="google">🔍 Google</SelectItem>
                    <SelectItem value="amazon">📦 Amazon</SelectItem>
                    <SelectItem value="nordstrom">👗 Nordstrom</SelectItem>
                    <SelectItem value="roblox">🎮 Roblox</SelectItem>
                    <SelectItem value="amex">💳 AMEX</SelectItem>
                    <SelectItem value="vanilla">🍦 Vanilla</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="gift-currency">Currency *</Label>
                <Select value={giftCardData.currency} onValueChange={(value) => 
                  setGiftCardData(prev => ({ ...prev, currency: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">🇺🇸 USD</SelectItem>
                    <SelectItem value="CAD">🇨🇦 CAD</SelectItem>
                    <SelectItem value="AUD">🇦🇺 AUD</SelectItem>
                    <SelectItem value="BRL">🇧🇷 BRL</SelectItem>
                    <SelectItem value="NZD">🇳🇿 NZD</SelectItem>
                    <SelectItem value="HKD">🇭🇰 HKD</SelectItem>
                    <SelectItem value="TWD">🇹🇼 TWD</SelectItem>
                    <SelectItem value="MXN">🇲🇽 MXN</SelectItem>
                    <SelectItem value="SGD">🇸🇬 SGD</SelectItem>
                    <SelectItem value="EUR">🇳🇱 EUR - Netherlands</SelectItem>
                    <SelectItem value="MYR">🇲🇾 MYR</SelectItem>
                    <SelectItem value="IDR">🇮🇩 IDR</SelectItem>
                    <SelectItem value="TRY">🇹🇷 TRY</SelectItem>
                    <SelectItem value="THB">🇹🇭 THB</SelectItem>
                    <SelectItem value="PHP">🇵🇭 PHP</SelectItem>
                    <SelectItem value="COP">🇨🇴 COP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {giftCardData.brand === 'other' && (
              <div>
                <Label htmlFor="custom-brand">Custom Brand Name</Label>
                <Input
                  id="custom-brand"
                  value={giftCardData.customBrand}
                  onChange={(e) => setGiftCardData(prev => ({ ...prev, customBrand: e.target.value }))}
                  placeholder="Enter brand name"
                />
              </div>
            )}

            <div>
              <Label htmlFor="gift-value">Estimated Value ({giftCardData.currency}) *</Label>
              <Input
                id="gift-value"
                type="number"
                min={total}
                value={giftCardData.estimatedValue}
                onChange={(e) => setGiftCardData(prev => ({ ...prev, estimatedValue: e.target.value }))}
                placeholder={`Enter card value in ${giftCardData.currency}`}
              />
            </div>

            <div>
              <Label htmlFor="gift-code">Card Code / PIN</Label>
              <Input
                id="gift-code"
                value={giftCardData.cardCode}
                onChange={(e) => setGiftCardData(prev => ({ ...prev, cardCode: e.target.value }))}
                placeholder="Enter card code (optional)"
              />
            </div>

            <div>
              <Label htmlFor="gift-image">Upload Gift Card Image *</Label>
              <Input
                id="gift-image"
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'gift_card_image')}
              />
            </div>

            <div>
              <Label htmlFor="gift-receipt">Upload Gift Card Receipt *</Label>
              <Input
                id="gift-receipt"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handleFileUpload(e, 'gift_card_receipt')}
              />
            </div>

            <div>
              <Label htmlFor="gift-notes">Additional Notes</Label>
              <Textarea
                id="gift-notes"
                value={giftCardData.notes}
                onChange={(e) => setGiftCardData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional information..."
                rows={3}
              />
            </div>

            <Button 
              onClick={handleGiftCardSubmit}
              disabled={loading || !giftCardData.brand || !giftCardData.estimatedValue}
              className="w-full"
              size="lg"
            >
              {loading ? 'Uploading...' : 'Submit Gift Card'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (method === 'crypto_eth') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Cryptocurrency (ETH)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-800 mb-3">
              Send your exact cart total to the address below and upload proof. 
              Your order will be reviewed within 30 minutes – 2 hours.
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">ETH Address:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard('0xE0520ED79515cA41a28C1Dc8c09C218C940F7a6e')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="font-mono text-sm break-all bg-white p-2 rounded border">
              0xE0520ED79515cA41a28C1Dc8c09C218C940F7a6e
            </p>
            
            <div className="mt-4 flex items-center justify-center">
              <img 
                src="/lovable-uploads/315e5ecd-90aa-409f-a151-038a2736a829.png" 
                alt="ETH QR Code for 0xE0520ED79515cA41a28C1Dc8c09C218C940F7a6e" 
                className="w-48 h-48 border rounded shadow-sm"
              />
            </div>

            <Badge variant="outline" className="mt-3">
              Amount: {getCurrencySymbol(currency)}{total.toFixed(2)} equivalent in ETH
            </Badge>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="crypto-proof">Upload Payment Screenshot or Transaction Hash *</Label>
              <Input
                id="crypto-proof"
                type="file"
                accept="image/*,.pdf,.txt"
                onChange={(e) => handleFileUpload(e, 'crypto_screenshot')}
              />
            </div>

            <div>
              <Label htmlFor="crypto-notes">Transaction Hash or Notes</Label>
              <Textarea
                id="crypto-notes"
                value={cryptoNotes}
                onChange={(e) => setCryptoNotes(e.target.value)}
                placeholder="Enter transaction hash or additional notes..."
                rows={3}
              />
            </div>

            <Button 
              onClick={() => onPaymentSuccess()}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? 'Uploading...' : 'Submit Payment'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};

export default PaymentMethod;
