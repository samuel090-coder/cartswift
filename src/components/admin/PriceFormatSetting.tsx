import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, DollarSign } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  PriceFormatMode,
  formatDisplayPrice,
  setPriceFormatMode,
} from '@/lib/priceFormat';

const PriceFormatSetting = () => {
  const [mode, setMode] = useState<PriceFormatMode>('full');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('notification_settings')
        .select('setting_value')
        .eq('setting_key', 'price_display_format')
        .maybeSingle();
      const v = (data?.setting_value as any)?.format;
      if (v === 'full' || v === 'compact') setMode(v);
      setLoading(false);
    })();
  }, []);

  const save = async (next: PriceFormatMode) => {
    setSaving(true);
    const { error } = await supabase
      .from('notification_settings')
      .update({ setting_value: { format: next } })
      .eq('setting_key', 'price_display_format');
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setMode(next);
    setPriceFormatMode(next);
    toast({ title: 'Saved', description: `Prices now display as ${next === 'full' ? 'full numbers' : 'compact (K/M/B)'}.` });
  };

  if (loading) {
    return (
      <Card><CardContent className="py-8 flex justify-center"><Loader2 className="animate-spin" /></CardContent></Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Price Display Format</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Label>Choose how prices appear across the entire site</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => save('full')}
            className={`p-4 rounded-lg border-2 text-left transition ${
              mode === 'full' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
          >
            <p className="font-semibold mb-1">Full numbers</p>
            <p className="text-sm text-muted-foreground mb-2">e.g. {formatDisplayPrice(7000000, '$', 'full')}</p>
            <p className="text-xs text-muted-foreground">Shows commas and decimals.</p>
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => save('compact')}
            className={`p-4 rounded-lg border-2 text-left transition ${
              mode === 'compact' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
          >
            <p className="font-semibold mb-1">Compact</p>
            <p className="text-sm text-muted-foreground mb-2">e.g. {formatDisplayPrice(7000000, '$', 'compact')} or {formatDisplayPrice(2000, '$', 'compact')}</p>
            <p className="text-xs text-muted-foreground">Shortens large numbers to K / M / B.</p>
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceFormatSetting;
