import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { DollarSign, Upload, CreditCard, Building, Wallet, Gift, Loader2, Copy, CheckCircle2 } from 'lucide-react';

interface DepositModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'BTC', name: 'Bitcoin', symbol: '₿' },
  { code: 'ETH', name: 'Ethereum', symbol: 'Ξ' },
  { code: 'USDT', name: 'Tether', symbol: '₮' },
];

const METHOD_ICONS: Record<string, any> = {
  bank_transfer: Building,
  crypto: Wallet,
  paypal: CreditCard,
  gift_card: Gift,
  mobile_money: CreditCard,
  other: CreditCard,
};

const DepositModal = ({ onClose, onSuccess }: DepositModalProps) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Fetch available payment methods
  const { data: paymentMethods = [], isLoading } = useQuery({
    queryKey: ['deposit-payment-methods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deposit_payment_methods')
        .select('*')
        .eq('is_enabled', true)
        .order('method_name');
      if (error) throw error;
      return data;
    },
  });

  const selectedMethod = paymentMethods.find((m: any) => m.id === selectedMethodId);

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please log in to make a deposit');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!selectedMethodId) {
      toast.error('Please select a payment method');
      return;
    }

    if (!paymentReference) {
      toast.error('Please enter your payment reference');
      return;
    }

    setIsSubmitting(true);

    try {
      let proofUrl = null;

      // Upload proof if provided
      if (proofFile) {
        const fileExt = proofFile.name.split('.').pop();
        const fileName = `${user.id}/deposit-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, proofFile);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('payment-proofs')
            .getPublicUrl(fileName);
          proofUrl = publicUrl;
        }
      }

      // Create deposit request
      const { error } = await supabase
        .from('deposit_requests')
        .insert({
          user_id: user.id,
          amount: parseFloat(amount),
          currency: currency,
          payment_method: selectedMethod?.method_name || selectedMethodId,
          payment_reference: paymentReference,
          proof_url: proofUrl,
        });

      if (error) throw error;

      toast.success('Deposit request submitted! Admin will review and approve it shortly.');
      onSuccess();
    } catch (error: any) {
      console.error('Error submitting deposit:', error);
      toast.error(error.message || 'Failed to submit deposit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickAmounts = [10, 25, 50, 100, 250, 500];
  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol || '$';

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-gradient-to-br from-background to-primary/5 border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <DollarSign className="w-6 h-6 text-primary" />
            Top Up Wallet
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Currency Selection */}
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="flex items-center gap-2">
                      <span className="font-mono">{c.symbol}</span>
                      <span>{c.name} ({c.code})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label>Amount ({currency})</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">
                {currencySymbol}
              </span>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="pl-9 text-lg font-bold"
                min="1"
              />
            </div>
            
            {/* Quick Amount Buttons */}
            <div className="flex flex-wrap gap-2 mt-2">
              {quickAmounts.map((amt) => (
                <Button
                  key={amt}
                  variant={amount === String(amt) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAmount(String(amt))}
                  className={amount === String(amt) ? 'bg-primary' : ''}
                >
                  {currencySymbol}{amt}
                </Button>
              ))}
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : paymentMethods.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No payment methods available. Please contact admin.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {paymentMethods.map((method: any) => {
                  const Icon = METHOD_ICONS[method.method_type] || CreditCard;
                  const isSelected = selectedMethodId === method.id;
                  return (
                    <Card
                      key={method.id}
                      className={`cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/30' 
                          : 'border-muted hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedMethodId(method.id)}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="flex-1">
                          <span className="font-medium">{method.method_name}</span>
                          <div className="flex gap-1 mt-1">
                            {method.supported_currencies?.slice(0, 4).map((c: string) => (
                              <Badge key={c} variant="secondary" className="text-[10px] px-1">
                                {c}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-primary" />}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Show Payment Details when method is selected */}
          {selectedMethod && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <h4 className="font-semibold text-primary flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Payment Details - {selectedMethod.method_name}
                </h4>
                
                {selectedMethod.bank_name && (
                  <div className="flex items-center justify-between bg-background rounded-lg p-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Bank Name</p>
                      <p className="font-medium">{selectedMethod.bank_name}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(selectedMethod.bank_name, 'bank')}
                    >
                      {copiedField === 'bank' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                )}
                
                {selectedMethod.account_name && (
                  <div className="flex items-center justify-between bg-background rounded-lg p-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Account Name</p>
                      <p className="font-medium">{selectedMethod.account_name}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(selectedMethod.account_name, 'name')}
                    >
                      {copiedField === 'name' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                )}
                
                {selectedMethod.account_number && (
                  <div className="flex items-center justify-between bg-background rounded-lg p-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Account Number</p>
                      <p className="font-mono font-bold text-lg">{selectedMethod.account_number}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(selectedMethod.account_number, 'number')}
                    >
                      {copiedField === 'number' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                )}
                
                {selectedMethod.wallet_address && (
                  <div className="flex items-center justify-between bg-background rounded-lg p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Wallet Address</p>
                      <p className="font-mono text-sm truncate">{selectedMethod.wallet_address}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(selectedMethod.wallet_address, 'wallet')}
                    >
                      {copiedField === 'wallet' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                )}
                
                {selectedMethod.email_address && (
                  <div className="flex items-center justify-between bg-background rounded-lg p-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Email Address</p>
                      <p className="font-medium">{selectedMethod.email_address}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(selectedMethod.email_address, 'email')}
                    >
                      {copiedField === 'email' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                )}
                
                {selectedMethod.instructions && (
                  <div className="bg-background rounded-lg p-3 mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Instructions</p>
                    <p className="text-sm">{selectedMethod.instructions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment Reference */}
          <div className="space-y-2">
            <Label>Payment Reference / Transaction ID</Label>
            <Input
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="Enter your payment reference"
            />
          </div>

          {/* Proof Upload */}
          <div className="space-y-2">
            <Label>Payment Proof (Optional)</Label>
            <div className="border-2 border-dashed border-primary/30 rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="proof-upload"
              />
              <label htmlFor="proof-upload" className="cursor-pointer">
                {proofFile ? (
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <Upload className="w-5 h-5" />
                    <span className="text-sm">{proofFile.name}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Upload className="w-8 h-8" />
                    <span className="text-sm">Click to upload payment proof</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedMethodId}
              className="flex-1 bg-gradient-to-r from-primary to-pink-vibrant"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>Submit Request</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DepositModal;
