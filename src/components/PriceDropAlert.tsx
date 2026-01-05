import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Bell, BellRing } from 'lucide-react';

interface PriceDropAlertProps {
  itemId: string;
  itemTitle: string;
  currentPrice: number;
}

const getSessionId = () => {
  let sessionId = localStorage.getItem('cartswift-session-id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('cartswift-session-id', sessionId);
  }
  return sessionId;
};

const PriceDropAlert = ({ itemId, itemTitle, currentPrice }: PriceDropAlertProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [targetPrice, setTargetPrice] = useState((currentPrice * 0.9).toFixed(2)); // Default 10% off

  const createAlert = useMutation({
    mutationFn: async () => {
      const sessionId = getSessionId();
      
      const { error } = await supabase
        .from('price_alerts')
        .insert({
          session_id: sessionId,
          item_id: itemId,
          email: email.trim() || null,
          target_price: parseFloat(targetPrice),
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Price alert set! We\'ll notify you when the price drops.');
      setIsOpen(false);
      setEmail('');
    },
    onError: () => {
      toast.error('Failed to set price alert');
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Bell className="w-4 h-4" />
          Price Alert
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellRing className="w-5 h-5 text-primary" />
            Set Price Drop Alert
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium text-sm">{itemTitle}</p>
            <p className="text-lg font-bold text-primary">Current: ${currentPrice}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetPrice">Alert me when price drops to</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="targetPrice"
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="pl-7"
                step="0.01"
                min="0"
                max={currentPrice}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {((1 - parseFloat(targetPrice) / currentPrice) * 100).toFixed(0)}% off current price
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to receive in-app notifications only
            </p>
          </div>

          <Button 
            onClick={() => createAlert.mutate()} 
            disabled={createAlert.isPending || parseFloat(targetPrice) >= currentPrice}
            className="w-full"
          >
            {createAlert.isPending ? 'Setting Alert...' : 'Set Alert'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PriceDropAlert;
