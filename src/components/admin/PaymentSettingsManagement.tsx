import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Save, Wallet, Building, CreditCard, Gift, DollarSign, RefreshCw, AlertTriangle, Settings } from 'lucide-react';

interface PaymentSetting {
  id: string;
  payment_method: string;
  display_name: string;
  is_enabled: boolean;
  instructions: string | null;
  wallet_address: string | null;
  account_number: string | null;
  account_name: string | null;
  bank_name: string | null;
  routing_number: string | null;
  email_address: string | null;
  additional_info: Record<string, any> | null;
}

const PaymentSettingsManagement = () => {
  const queryClient = useQueryClient();
  const [editedSettings, setEditedSettings] = useState<Record<string, Partial<PaymentSetting>>>({});

  const { data: settings, isLoading, error, refetch } = useQuery({
    queryKey: ['payment-settings-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_method_settings')
        .select('*')
        .order('display_name');
      
      if (error) throw error;
      return (data || []) as PaymentSetting[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PaymentSetting> }) => {
      const { error } = await supabase
        .from('payment_method_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-settings-admin'] });
      toast({
        title: "✅ Settings saved",
        description: "Payment method settings have been updated.",
      });
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      });
    },
  });

  const handleChange = (id: string, field: keyof PaymentSetting, value: any) => {
    setEditedSettings(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleSave = (setting: PaymentSetting) => {
    const updates = editedSettings[setting.id];
    if (updates && Object.keys(updates).length > 0) {
      updateMutation.mutate({ id: setting.id, updates });
      setEditedSettings(prev => {
        const newState = { ...prev };
        delete newState[setting.id];
        return newState;
      });
    }
  };

  const getValue = (setting: PaymentSetting, field: keyof PaymentSetting) => {
    return editedSettings[setting.id]?.[field] ?? setting[field] ?? '';
  };

  const getIcon = (method: string) => {
    switch (method) {
      case 'cryptocurrency':
      case 'crypto_eth':
        return <Wallet className="h-5 w-5 text-purple-400" />;
      case 'bank_transfer':
        return <Building className="h-5 w-5 text-blue-400" />;
      case 'credit_card':
        return <CreditCard className="h-5 w-5 text-amber-400" />;
      case 'gift_card':
        return <Gift className="h-5 w-5 text-pink-400" />;
      case 'cash_app':
      case 'paypal':
        return <DollarSign className="h-5 w-5 text-emerald-400" />;
      default:
        return <CreditCard className="h-5 w-5 text-amber-400" />;
    }
  };

  // Error state
  if (error) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-red-500/50">
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-400" />
            <p className="text-red-300 mb-4">Failed to load payment settings</p>
            <p className="text-slate-400 text-sm mb-4">{(error as Error).message}</p>
            <Button onClick={() => refetch()} variant="outline" className="border-amber-500/50 text-amber-300">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-amber-500/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-amber-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-400">
          <Settings className="h-5 w-5" />
          Payment Method Settings
        </CardTitle>
        <CardDescription className="text-slate-400">
          Configure payment details for each payment method. These details will be shown to customers during checkout.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {settings && settings.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="h-12 w-12 mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400">No payment methods configured</p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="space-y-2">
            {settings?.map((setting) => (
              <AccordionItem 
                key={setting.id} 
                value={setting.id} 
                className="border border-slate-700/50 rounded-lg px-4 bg-slate-800/30"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    {getIcon(setting.payment_method)}
                    <span className="font-medium text-white">{setting.display_name}</span>
                    {!setting.is_enabled && (
                      <span className="text-xs bg-red-950/50 text-red-300 px-2 py-1 rounded border border-red-500/30">Disabled</span>
                    )}
                    {setting.is_enabled && (
                      <span className="text-xs bg-emerald-950/50 text-emerald-300 px-2 py-1 rounded border border-emerald-500/30">Active</span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  {/* Enable/Disable Toggle */}
                  <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                    <div>
                      <Label className="text-white">Enable Payment Method</Label>
                      <p className="text-xs text-slate-400">Show this payment option to customers</p>
                    </div>
                    <Switch
                      checked={getValue(setting, 'is_enabled') as boolean}
                      onCheckedChange={(checked) => handleChange(setting.id, 'is_enabled', checked)}
                      className="data-[state=checked]:bg-emerald-600"
                    />
                  </div>

                  {/* Display Name */}
                  <div className="space-y-2">
                    <Label className="text-slate-300">Display Name</Label>
                    <Input
                      value={getValue(setting, 'display_name') as string}
                      onChange={(e) => handleChange(setting.id, 'display_name', e.target.value)}
                      placeholder="e.g., Pay with Crypto"
                      className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </div>

                  {/* Instructions */}
                  <div className="space-y-2">
                    <Label className="text-slate-300">Payment Instructions</Label>
                    <Textarea
                      value={getValue(setting, 'instructions') as string}
                      onChange={(e) => handleChange(setting.id, 'instructions', e.target.value)}
                      placeholder="Instructions shown to customers..."
                      rows={3}
                      className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </div>

                  {/* Method-specific fields */}
                  {(setting.payment_method === 'cryptocurrency' || setting.payment_method === 'crypto_eth') && (
                    <div className="space-y-2">
                      <Label className="text-slate-300">Wallet Address</Label>
                      <Input
                        value={getValue(setting, 'wallet_address') as string}
                        onChange={(e) => handleChange(setting.id, 'wallet_address', e.target.value)}
                        placeholder="0x..."
                        className="font-mono text-sm bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                      />
                    </div>
                  )}

                  {setting.payment_method === 'bank_transfer' && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-slate-300">Bank Name</Label>
                          <Input
                            value={getValue(setting, 'bank_name') as string}
                            onChange={(e) => handleChange(setting.id, 'bank_name', e.target.value)}
                            placeholder="Bank of America"
                            className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Account Name</Label>
                          <Input
                            value={getValue(setting, 'account_name') as string}
                            onChange={(e) => handleChange(setting.id, 'account_name', e.target.value)}
                            placeholder="John Doe"
                            className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-slate-300">Account Number</Label>
                          <Input
                            value={getValue(setting, 'account_number') as string}
                            onChange={(e) => handleChange(setting.id, 'account_number', e.target.value)}
                            placeholder="123456789"
                            className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Routing Number</Label>
                          <Input
                            value={getValue(setting, 'routing_number') as string}
                            onChange={(e) => handleChange(setting.id, 'routing_number', e.target.value)}
                            placeholder="021000021"
                            className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {(setting.payment_method === 'paypal' || setting.payment_method === 'cash_app') && (
                    <div className="space-y-2">
                      <Label className="text-slate-300">Email / Username</Label>
                      <Input
                        value={getValue(setting, 'email_address') as string}
                        onChange={(e) => handleChange(setting.id, 'email_address', e.target.value)}
                        placeholder={setting.payment_method === 'cash_app' ? '$cashtag' : 'email@example.com'}
                        className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                      />
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={() => handleSave(setting)}
                      disabled={!editedSettings[setting.id] || updateMutation.isPending}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      💾 Save Changes
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentSettingsManagement;