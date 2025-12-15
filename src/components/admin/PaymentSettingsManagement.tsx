import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Save, Wallet, Building, CreditCard, Gift, DollarSign } from 'lucide-react';

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

  const { data: settings, isLoading } = useQuery({
    queryKey: ['payment-settings-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_method_settings')
        .select('*')
        .order('display_name');
      
      if (error) throw error;
      return data as PaymentSetting[];
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
        title: "Settings saved",
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
        return <Wallet className="h-5 w-5" />;
      case 'bank_transfer':
        return <Building className="h-5 w-5" />;
      case 'credit_card':
        return <CreditCard className="h-5 w-5" />;
      case 'gift_card':
        return <Gift className="h-5 w-5" />;
      case 'cash_app':
      case 'paypal':
        return <DollarSign className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Method Settings</CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure payment details for each payment method. These details will be shown to customers during checkout.
        </p>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="space-y-2">
          {settings?.map((setting) => (
            <AccordionItem key={setting.id} value={setting.id} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  {getIcon(setting.payment_method)}
                  <span className="font-medium">{setting.display_name}</span>
                  {!setting.is_enabled && (
                    <span className="text-xs bg-muted px-2 py-1 rounded">Disabled</span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4">
                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Payment Method</Label>
                    <p className="text-xs text-muted-foreground">Show this payment option to customers</p>
                  </div>
                  <Switch
                    checked={getValue(setting, 'is_enabled') as boolean}
                    onCheckedChange={(checked) => handleChange(setting.id, 'is_enabled', checked)}
                  />
                </div>

                {/* Display Name */}
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input
                    value={getValue(setting, 'display_name') as string}
                    onChange={(e) => handleChange(setting.id, 'display_name', e.target.value)}
                    placeholder="e.g., Pay with Crypto"
                  />
                </div>

                {/* Instructions */}
                <div className="space-y-2">
                  <Label>Payment Instructions</Label>
                  <Textarea
                    value={getValue(setting, 'instructions') as string}
                    onChange={(e) => handleChange(setting.id, 'instructions', e.target.value)}
                    placeholder="Instructions shown to customers..."
                    rows={3}
                  />
                </div>

                {/* Method-specific fields */}
                {(setting.payment_method === 'cryptocurrency' || setting.payment_method === 'crypto_eth') && (
                  <div className="space-y-2">
                    <Label>Wallet Address</Label>
                    <Input
                      value={getValue(setting, 'wallet_address') as string}
                      onChange={(e) => handleChange(setting.id, 'wallet_address', e.target.value)}
                      placeholder="0x..."
                      className="font-mono text-sm"
                    />
                  </div>
                )}

                {setting.payment_method === 'bank_transfer' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Bank Name</Label>
                        <Input
                          value={getValue(setting, 'bank_name') as string}
                          onChange={(e) => handleChange(setting.id, 'bank_name', e.target.value)}
                          placeholder="Bank of America"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Name</Label>
                        <Input
                          value={getValue(setting, 'account_name') as string}
                          onChange={(e) => handleChange(setting.id, 'account_name', e.target.value)}
                          placeholder="John Doe"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Account Number</Label>
                        <Input
                          value={getValue(setting, 'account_number') as string}
                          onChange={(e) => handleChange(setting.id, 'account_number', e.target.value)}
                          placeholder="123456789"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Routing Number</Label>
                        <Input
                          value={getValue(setting, 'routing_number') as string}
                          onChange={(e) => handleChange(setting.id, 'routing_number', e.target.value)}
                          placeholder="021000021"
                        />
                      </div>
                    </div>
                  </>
                )}

                {(setting.payment_method === 'paypal' || setting.payment_method === 'cash_app') && (
                  <div className="space-y-2">
                    <Label>Email / Username</Label>
                    <Input
                      value={getValue(setting, 'email_address') as string}
                      onChange={(e) => handleChange(setting.id, 'email_address', e.target.value)}
                      placeholder={setting.payment_method === 'cash_app' ? '$cashtag' : 'email@example.com'}
                    />
                  </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => handleSave(setting)}
                    disabled={!editedSettings[setting.id] || updateMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default PaymentSettingsManagement;
