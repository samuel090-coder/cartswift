import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Zap, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface FlashSale {
  id: string;
  item_id: string;
  original_price: number;
  sale_price: number;
  ends_at: string;
  max_quantity?: number;
  sold_quantity: number;
  items?: {
    title: string;
    images: string[];
  };
}

const FlashSalesBanner = () => {
  const [timeLeft, setTimeLeft] = useState<{ [key: string]: string }>({});

  const { data: flashSales = [], isLoading } = useQuery({
    queryKey: ['flash-sales'],
    queryFn: async (): Promise<FlashSale[]> => {
      const { data: sales, error: salesError } = await supabase
        .from('flash_sales')
        .select('*')
        .eq('is_active', true)
        .gte('ends_at', new Date().toISOString())
        .lte('starts_at', new Date().toISOString())
        .order('ends_at', { ascending: true })
        .limit(3);

      if (salesError) throw salesError;
      if (!sales || sales.length === 0) return [];

      const itemIds = sales.map(sale => sale.item_id);
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('id, title, images')
        .in('id', itemIds);

      if (itemsError) throw itemsError;

      return sales.map(sale => ({
        ...sale,
        items: items?.find(item => item.id === sale.item_id) || { title: 'Unknown Item', images: [] }
      }));
    },
    refetchInterval: 60000
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft: { [key: string]: string } = {};
      flashSales.forEach(sale => {
        const now = new Date().getTime();
        const endTime = new Date(sale.ends_at).getTime();
        const difference = endTime - now;
        if (difference > 0) {
          const days = Math.floor(difference / (1000 * 60 * 60 * 24));
          const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((difference % (1000 * 60)) / 1000);
          if (days > 0) newTimeLeft[sale.id] = `${days}d ${hours}h ${minutes}m`;
          else if (hours > 0) newTimeLeft[sale.id] = `${hours}h ${minutes}m ${seconds}s`;
          else newTimeLeft[sale.id] = `${minutes}m ${seconds}s`;
        } else {
          newTimeLeft[sale.id] = 'EXPIRED';
        }
      });
      setTimeLeft(newTimeLeft);
    }, 1000);
    return () => clearInterval(timer);
  }, [flashSales]);

  const getDiscountPercentage = (originalPrice: number, salePrice: number) => {
    return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
  };

  const getAvailableQuantity = (sale: FlashSale) => {
    if (!sale.max_quantity) return null;
    return Math.max(0, sale.max_quantity - sale.sold_quantity);
  };

  if (isLoading || flashSales.length === 0) return null;

  return (
    <div className="w-full mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="text-neon-amber animate-pulse" size={24} />
        <h2 className="text-xl font-bold text-foreground">⚡ Flash Sales</h2>
        <Badge className="animate-pulse bg-destructive text-destructive-foreground">LIVE</Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {flashSales.map((sale) => {
          const discountPercent = getDiscountPercentage(Number(sale.original_price), Number(sale.sale_price));
          const availableQty = getAvailableQuantity(sale);
          const isLowStock = availableQty !== null && availableQty <= 5;
          
          return (
            <Card key={sale.id} className="relative overflow-hidden border border-destructive/30 bg-card hover:border-destructive/50 transition-all">
              <div className="absolute top-2 left-2 z-10">
                <Badge className="animate-pulse bg-destructive text-destructive-foreground">
                  -{discountPercent}%
                </Badge>
              </div>
              
              <CardContent className="p-4">
                <div className="aspect-square mb-3 overflow-hidden rounded-lg bg-secondary">
                  <img
                    src={sale.items?.images?.[0] || '/placeholder.svg'}
                    alt={sale.items?.title || 'Flash sale item'}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                </div>
                
                <h3 className="font-semibold text-sm mb-2 line-clamp-2 text-foreground">
                  {sale.items?.title}
                </h3>
                
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-bold text-neon-emerald">
                    ${Number(sale.sale_price).toFixed(2)}
                  </span>
                  <span className="text-sm line-through text-muted-foreground">
                    ${Number(sale.original_price).toFixed(2)}
                  </span>
                </div>
                
                <div className="flex items-center gap-1 mb-2 text-sm text-destructive font-medium">
                  <Clock size={16} />
                  <span>{timeLeft[sale.id] || 'Loading...'}</span>
                </div>
                
                {availableQty !== null && (
                  <div className="mb-3">
                    <div className={`text-xs ${isLowStock ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      {isLowStock ? `Only ${availableQty} left!` : `${availableQty} available`}
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2 mt-1">
                      <div 
                        className={`h-2 rounded-full ${isLowStock ? 'bg-destructive' : 'bg-neon-emerald'}`}
                        style={{ width: `${Math.max(10, (availableQty / (sale.max_quantity || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                
                <Button 
                  size="sm" 
                  className="w-full btn-premium gap-2"
                  onClick={() => { window.location.href = `/#item-${sale.item_id}`; }}
                >
                  <ShoppingCart size={16} />
                  Grab Deal
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default FlashSalesBanner;
