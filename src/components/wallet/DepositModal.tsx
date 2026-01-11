import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { DollarSign, Upload, CreditCard, Building, Wallet, Gift, Loader2 } from 'lucide-react';

interface DepositModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const PAYMENT_METHODS = [
  { id: 'bank_transfer', name: 'Bank Transfer', icon: Building },
  { id: 'crypto', name: 'Cryptocurrency', icon: Wallet },
  { id: 'paypal', name: 'PayPal', icon: CreditCard },
  { id: 'gift_card', name: 'Gift Card', icon: Gift },
];

const DepositModal = ({ onClose, onSuccess }: DepositModalProps) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    if (!paymentMethod) {
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
          payment_method: paymentMethod,
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

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gradient-to-br from-background to-primary/5 border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <DollarSign className="w-6 h-6 text-primary" />
            Top Up Wallet
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Amount Input */}
          <div className="space-y-2">
            <Label>Amount (USD)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
                  ${amt}
                </Button>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <Card
                  key={method.id}
                  className={`cursor-pointer transition-all ${
                    paymentMethod === method.id 
                      ? 'border-primary bg-primary/10' 
                      : 'border-muted hover:border-primary/50'
                  }`}
                  onClick={() => setPaymentMethod(method.id)}
                >
                  <CardContent className="p-3 flex items-center gap-2">
                    <method.icon className={`w-5 h-5 ${
                      paymentMethod === method.id ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                    <span className="text-sm font-medium">{method.name}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

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
              disabled={isSubmitting}
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
