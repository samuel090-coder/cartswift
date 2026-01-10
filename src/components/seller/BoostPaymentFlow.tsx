import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  CreditCard, Wallet, Building2, Gift, Upload, 
  CheckCircle, Copy, Loader2, AlertCircle, DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface BoostPaymentFlowProps {
  totalAmount: number;
  boostDetails: {
    views: number;
    locations: string[];
    duration: number;
    expectedBuyers: number;
  };
  onPaymentComplete: (paymentReference: string, proofUrl?: string) => void;
  onBack: () => void;
}

const paymentMethods = [
  { id: 'crypto', label: '💰 Cryptocurrency', icon: Wallet, description: 'BTC, ETH, USDT' },
  { id: 'bank_transfer', label: '🏦 Bank Transfer', icon: Building2, description: 'Direct bank deposit' },
  { id: 'gift_card', label: '🎁 Gift Card', icon: Gift, description: 'Amazon, iTunes, etc.' },
  { id: 'paypal', label: '💳 PayPal', icon: CreditCard, description: 'Send via PayPal' },
];

const BoostPaymentFlow = ({ totalAmount, boostDetails, onPaymentComplete, onBack }: BoostPaymentFlowProps) => {
  const [selectedMethod, setSelectedMethod] = useState('crypto');
  const [paymentReference, setPaymentReference] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState('');

  // Fetch payment settings
  const { data: paymentSettings } = useQuery({
    queryKey: ['boost-payment-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_method_settings')
        .select('*')
        .eq('is_enabled', true);
      if (error) throw error;
      return data;
    },
  });

  const getPaymentDetails = (method: string) => {
    const setting = paymentSettings?.find(s => s.payment_method === method);
    return setting || null;
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(''), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
  };

  const uploadProof = async (): Promise<string | null> => {
    if (!proofFile) return null;
    
    setUploading(true);
    try {
      const fileName = `boost-proofs/${Date.now()}-${proofFile.name}`;
      const { error } = await supabase.storage
        .from('media-files')
        .upload(fileName, proofFile);
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from('media-files')
        .getPublicUrl(fileName);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload proof');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitPayment = async () => {
    if (!paymentReference.trim()) {
      toast.error('Please enter payment reference/transaction ID');
      return;
    }

    let proofUrl: string | undefined;
    if (proofFile) {
      const url = await uploadProof();
      if (url) proofUrl = url;
    }

    onPaymentComplete(paymentReference, proofUrl);
  };

  const renderPaymentDetails = () => {
    const details = getPaymentDetails(selectedMethod);
    
    switch (selectedMethod) {
      case 'crypto':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20">
              <h4 className="font-semibold text-amber-400 mb-2">🪙 Crypto Payment</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Send exactly <span className="font-bold text-white">${totalAmount.toFixed(2)}</span> worth of crypto to:
              </p>
              
              {details?.wallet_address ? (
                <div className="space-y-3">
                  <div className="bg-background/50 p-3 rounded-lg">
                    <Label className="text-xs text-muted-foreground">Wallet Address</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs break-all flex-1 text-primary">{details.wallet_address}</code>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => copyToClipboard(details.wallet_address!, 'wallet')}
                      >
                        {copied === 'wallet' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  {details.additional_info && (
                    <p className="text-xs text-muted-foreground">{details.instructions}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Contact admin for crypto payment details</p>
              )}
            </div>
          </div>
        );
      
      case 'bank_transfer':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/20">
              <h4 className="font-semibold text-blue-400 mb-2">🏦 Bank Transfer</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Transfer exactly <span className="font-bold text-white">${totalAmount.toFixed(2)}</span> to:
              </p>
              
              {details?.bank_name ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b border-slate-700">
                    <span className="text-muted-foreground">Bank</span>
                    <span className="font-medium">{details.bank_name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-700">
                    <span className="text-muted-foreground">Account Name</span>
                    <span className="font-medium">{details.account_name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-700">
                    <span className="text-muted-foreground">Account Number</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{details.account_number}</span>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(details.account_number!, 'account')}
                      >
                        {copied === 'account' ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>
                  {details.routing_number && (
                    <div className="flex justify-between py-1 border-b border-slate-700">
                      <span className="text-muted-foreground">Routing Number</span>
                      <span className="font-medium">{details.routing_number}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Contact admin for bank details</p>
              )}
            </div>
          </div>
        );
      
      case 'paypal':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl border border-indigo-500/20">
              <h4 className="font-semibold text-indigo-400 mb-2">💳 PayPal</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Send exactly <span className="font-bold text-white">${totalAmount.toFixed(2)}</span> to:
              </p>
              
              {details?.email_address ? (
                <div className="bg-background/50 p-3 rounded-lg">
                  <Label className="text-xs text-muted-foreground">PayPal Email</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-medium text-primary">{details.email_address}</span>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => copyToClipboard(details.email_address!, 'paypal')}
                    >
                      {copied === 'paypal' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Contact admin for PayPal details</p>
              )}
            </div>
          </div>
        );
      
      case 'gift_card':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-xl border border-pink-500/20">
              <h4 className="font-semibold text-pink-400 mb-2">🎁 Gift Card</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Purchase a gift card worth <span className="font-bold text-white">${totalAmount.toFixed(2)}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Accepted: Amazon, iTunes, Google Play, Steam, etc.
              </p>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Order Summary */}
      <Card className="bg-gradient-to-br from-primary/5 to-pink-vibrant/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold">Boost Payment</h3>
              <p className="text-xs text-muted-foreground">Complete payment to submit boost request</p>
            </div>
          </div>
          
          <div className="space-y-1 text-sm border-t pt-3 mt-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{boostDetails.views.toLocaleString()} views</span>
              <span>x {boostDetails.duration} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Locations</span>
              <span>{boostDetails.locations.length} selected</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t mt-2">
              <span>Total</span>
              <span className="text-primary">${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Select Payment Method</Label>
        <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod} className="grid grid-cols-2 gap-2">
          {paymentMethods.map((method) => (
            <Label
              key={method.id}
              className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all border-2 ${
                selectedMethod === method.id 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <RadioGroupItem value={method.id} className="sr-only" />
              <method.icon className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">{method.label}</p>
                <p className="text-[10px] text-muted-foreground">{method.description}</p>
              </div>
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* Payment Details */}
      {renderPaymentDetails()}

      {/* Payment Confirmation */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Transaction ID / Payment Reference *</Label>
          <Input
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            placeholder="Enter your transaction ID or reference number"
            className="bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label>Upload Payment Proof (Screenshot)</Label>
          <div className="flex items-center gap-3">
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="bg-background"
            />
            {proofFile && (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle className="w-3 h-3" />
                {proofFile.name.slice(0, 15)}...
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
        <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
        <p className="text-xs text-amber-200">
          Your boost request will be reviewed after payment verification. 
          This usually takes 24-48 hours. You'll receive a notification once approved.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button 
          onClick={handleSubmitPayment}
          disabled={!paymentReference.trim() || uploading}
          className="flex-1 bg-gradient-to-r from-primary to-pink-vibrant text-white gap-2"
        >
          {uploading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
          ) : (
            <><Upload className="w-4 h-4" /> Submit Payment</>
          )}
        </Button>
      </div>
    </motion.div>
  );
};

export default BoostPaymentFlow;
