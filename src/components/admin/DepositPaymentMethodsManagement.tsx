import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Building, Wallet, CreditCard, Gift, Loader2, Save, X } from 'lucide-react';

const METHOD_TYPES = [
  { id: 'bank_transfer', name: 'Bank Transfer', icon: Building },
  { id: 'crypto', name: 'Cryptocurrency', icon: Wallet },
  { id: 'paypal', name: 'PayPal', icon: CreditCard },
  { id: 'gift_card', name: 'Gift Card', icon: Gift },
  { id: 'mobile_money', name: 'Mobile Money', icon: CreditCard },
  { id: 'other', name: 'Other', icon: CreditCard },
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'GHS', 'KES', 'ZAR', 'INR', 'CNY', 'JPY', 'BTC', 'ETH', 'USDT'];

interface PaymentMethod {
  id: string;
  method_name: string;
  method_type: string;
  account_name: string | null;
  account_number: string | null;
  bank_name: string | null;
  wallet_address: string | null;
  email_address: string | null;
  instructions: string | null;
  is_enabled: boolean;
  supported_currencies: string[];
}

const DepositPaymentMethodsManagement = () => {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<PaymentMethod>>({
    method_name: '',
    method_type: 'bank_transfer',
    account_name: '',
    account_number: '',
    bank_name: '',
    wallet_address: '',
    email_address: '',
    instructions: '',
    is_enabled: true,
    supported_currencies: ['USD'],
  });

  const { data: methods = [], isLoading } = useQuery({
    queryKey: ['deposit-payment-methods-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deposit_payment_methods')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PaymentMethod[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: Partial<PaymentMethod>) => {
      const { error } = await supabase
        .from('deposit_payment_methods')
        .insert([data as any]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Payment method added!');
      queryClient.invalidateQueries({ queryKey: ['deposit-payment-methods-admin'] });
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add payment method');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PaymentMethod> }) => {
      const { error } = await supabase
        .from('deposit_payment_methods')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Payment method updated!');
      queryClient.invalidateQueries({ queryKey: ['deposit-payment-methods-admin'] });
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update payment method');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('deposit_payment_methods')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Payment method deleted!');
      queryClient.invalidateQueries({ queryKey: ['deposit-payment-methods-admin'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete payment method');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('deposit_payment_methods')
        .update({ is_enabled: enabled })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposit-payment-methods-admin'] });
    },
  });

  const resetForm = () => {
    setFormData({
      method_name: '',
      method_type: 'bank_transfer',
      account_name: '',
      account_number: '',
      bank_name: '',
      wallet_address: '',
      email_address: '',
      instructions: '',
      is_enabled: true,
      supported_currencies: ['USD'],
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (method: PaymentMethod) => {
    setFormData(method);
    setEditingId(method.id);
    setIsAdding(true);
  };

  const handleSubmit = () => {
    if (!formData.method_name || !formData.method_type) {
      toast.error('Please fill in required fields');
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      addMutation.mutate(formData);
    }
  };

  const handleCurrencyToggle = (currency: string) => {
    const current = formData.supported_currencies || [];
    if (current.includes(currency)) {
      setFormData({ ...formData, supported_currencies: current.filter(c => c !== currency) });
    } else {
      setFormData({ ...formData, supported_currencies: [...current, currency] });
    }
  };

  const getMethodIcon = (type: string) => {
    const method = METHOD_TYPES.find(m => m.id === type);
    return method?.icon || CreditCard;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-amber-300">Deposit Payment Methods</h3>
        {!isAdding && (
          <Button
            onClick={() => setIsAdding(true)}
            className="bg-amber-600 hover:bg-amber-700 gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Method
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <Card className="bg-slate-800/50 border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-amber-300">
              {editingId ? 'Edit Payment Method' : 'Add New Payment Method'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Method Name *</Label>
                <Input
                  value={formData.method_name || ''}
                  onChange={(e) => setFormData({ ...formData, method_name: e.target.value })}
                  placeholder="e.g., Bank of America Transfer"
                  className="bg-slate-900/50 border-slate-600"
                />
              </div>
              <div>
                <Label className="text-slate-300">Method Type *</Label>
                <Select
                  value={formData.method_type}
                  onValueChange={(value) => setFormData({ ...formData, method_type: value })}
                >
                  <SelectTrigger className="bg-slate-900/50 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METHOD_TYPES.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.method_type === 'bank_transfer' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-slate-300">Bank Name</Label>
                  <Input
                    value={formData.bank_name || ''}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    placeholder="Bank Name"
                    className="bg-slate-900/50 border-slate-600"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Account Name</Label>
                  <Input
                    value={formData.account_name || ''}
                    onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                    placeholder="Account Holder Name"
                    className="bg-slate-900/50 border-slate-600"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Account Number</Label>
                  <Input
                    value={formData.account_number || ''}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    placeholder="Account Number"
                    className="bg-slate-900/50 border-slate-600"
                  />
                </div>
              </div>
            )}

            {formData.method_type === 'crypto' && (
              <div>
                <Label className="text-slate-300">Wallet Address</Label>
                <Input
                  value={formData.wallet_address || ''}
                  onChange={(e) => setFormData({ ...formData, wallet_address: e.target.value })}
                  placeholder="Crypto Wallet Address"
                  className="bg-slate-900/50 border-slate-600"
                />
              </div>
            )}

            {formData.method_type === 'paypal' && (
              <div>
                <Label className="text-slate-300">PayPal Email</Label>
                <Input
                  value={formData.email_address || ''}
                  onChange={(e) => setFormData({ ...formData, email_address: e.target.value })}
                  placeholder="PayPal Email Address"
                  className="bg-slate-900/50 border-slate-600"
                />
              </div>
            )}

            <div>
              <Label className="text-slate-300">Instructions</Label>
              <Textarea
                value={formData.instructions || ''}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="Payment instructions for users..."
                className="bg-slate-900/50 border-slate-600"
                rows={3}
              />
            </div>

            <div>
              <Label className="text-slate-300 mb-2 block">Supported Currencies</Label>
              <div className="flex flex-wrap gap-2">
                {CURRENCIES.map((currency) => (
                  <Badge
                    key={currency}
                    variant={formData.supported_currencies?.includes(currency) ? 'default' : 'outline'}
                    className={`cursor-pointer ${
                      formData.supported_currencies?.includes(currency)
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'border-slate-600 text-slate-400 hover:border-amber-500'
                    }`}
                    onClick={() => handleCurrencyToggle(currency)}
                  >
                    {currency}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, is_enabled: checked })}
              />
              <Label className="text-slate-300">Enabled</Label>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSubmit}
                disabled={addMutation.isPending || updateMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 gap-2"
              >
                {(addMutation.isPending || updateMutation.isPending) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {editingId ? 'Update' : 'Save'}
              </Button>
              <Button variant="outline" onClick={resetForm} className="border-slate-600 gap-2">
                <X className="w-4 h-4" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List of Methods */}
      <div className="grid gap-4">
        {methods.map((method) => {
          const Icon = getMethodIcon(method.method_type);
          return (
            <Card key={method.id} className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${method.is_enabled ? 'bg-amber-600/20' : 'bg-slate-700'}`}>
                      <Icon className={`w-5 h-5 ${method.is_enabled ? 'text-amber-400' : 'text-slate-500'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-white">{method.method_name}</h4>
                        <Badge variant={method.is_enabled ? 'default' : 'secondary'} className={method.is_enabled ? 'bg-green-600' : ''}>
                          {method.is_enabled ? 'Active' : 'Disabled'}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-400 capitalize">{method.method_type.replace('_', ' ')}</p>
                      
                      {method.bank_name && (
                        <p className="text-xs text-slate-500 mt-1">Bank: {method.bank_name}</p>
                      )}
                      {method.account_number && (
                        <p className="text-xs text-slate-500">Account: {method.account_number}</p>
                      )}
                      {method.wallet_address && (
                        <p className="text-xs text-slate-500 truncate max-w-xs">Wallet: {method.wallet_address}</p>
                      )}
                      {method.email_address && (
                        <p className="text-xs text-slate-500">Email: {method.email_address}</p>
                      )}
                      
                      <div className="flex flex-wrap gap-1 mt-2">
                        {method.supported_currencies?.map((currency) => (
                          <Badge key={currency} variant="outline" className="text-[10px] border-slate-600 text-slate-400">
                            {currency}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={method.is_enabled}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: method.id, enabled: checked })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(method)}
                      className="text-slate-400 hover:text-amber-400"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(method.id)}
                      className="text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {methods.length === 0 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-8 text-center">
              <CreditCard className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <p className="text-slate-400">No payment methods configured yet.</p>
              <p className="text-sm text-slate-500">Add payment methods for users to deposit funds.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DepositPaymentMethodsManagement;
