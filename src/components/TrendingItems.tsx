import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Eye, Heart, ShoppingBag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface TrendingItem {
  item_id: string;
  trending_score: number;
  view_count: number;
  share_count: number;
  wishlist_count: number;
  purchase_count: number;
  items?: {
    title: string;
    price: number;
    images: string[];
    discount_percentage?: number;
  };
}

const TrendingItems = () => {
  const { data: trendingItems = [], isLoading } = useQuery({
    queryKey: ['trending-items'],
    queryFn: async (): Promise<TrendingItem[]> => {
      // First get trending items
      const { data: trending, error: trendingError } = await supabase
        .from('item_popularity')
        .select('*')
        .order('trending_score', { ascending: false })
        .limit(6);

      if (trendingError) throw trendingError;
      if (!trending || trending.length === 0) return [];

      const validTrending = trending.filter(item => item.trending_score > 0);
      if (validTrending.length === 0) return [];

      // Then get items for each trending item
      const itemIds = validTrending.map(item => item.item_id);
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('id, title, price, images, discount_percentage')
        .in('id', itemIds);

      if (itemsError) throw itemsError;

      // Combine the data
      return validTrending.map(trend => ({
        ...trend,
        items: items?.find(item => item.id === trend.item_id) || { 
          title: 'Unknown Item', 
          price: 0, 
          images: [], 
          discount_percentage: null 
        }
      }));
    },
    refetchInterval: 5 * 60 * 1000 // Refetch every 5 minutes
  });

  const getTrendingRank = (score: number) => {
    if (score >= 100) return { label: 'HOT', color: 'bg-red-500', icon: '🔥' };
    if (score >= 50) return { label: 'TRENDING', color: 'bg-orange-500', icon: '📈' };
    if (score >= 20) return { label: 'POPULAR', color: 'bg-yellow-500', icon: '⭐' };
    return { label: 'RISING', color: 'bg-green-500', icon: '🚀' };
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-32 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (trendingItems.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <TrendingUp className="mx-auto mb-2 text-gray-400" size={48} />
          <p className="text-muted-foreground">No trending items yet. Start shopping to see trends!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="text-primary" size={24} />
        <h2 className="text-xl font-bold">Trending Now</h2>
        <Badge variant="outline" className="animate-pulse">LIVE</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {trendingItems.map((item, index) => {
          const rank = getTrendingRank(Number(item.trending_score));
          const finalPrice = item.items?.discount_percentage 
            ? Number(item.items.price) * (1 - item.items.discount_percentage / 100)
            : Number(item.items?.price || 0);

          return (
            <Card key={item.item_id} className="relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
              <div className="absolute top-2 left-2 z-10">
                <Badge className={`${rank.color} text-white border-0`}>
                  {rank.icon} {rank.label}
                </Badge>
              </div>
              
              {index === 0 && (
                <div className="absolute top-2 right-2 z-10">
                  <Badge variant="destructive" className="animate-pulse">
                    #1 TRENDING
                  </Badge>
                </div>
              )}
              
              <CardContent 
                className="p-4 cursor-pointer"
                onClick={() => {
                  // Navigate to item
                  window.location.href = `/#item-${item.item_id}`;
                }}
              >
                <div className="aspect-square mb-3 overflow-hidden rounded-lg bg-gray-100">
                  <img
                    src={item.items?.images?.[0] || '/placeholder.svg'}
                    alt={item.items?.title || 'Trending item'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                
                <h3 className="font-semibold text-sm mb-2 line-clamp-2">
                  {item.items?.title}
                </h3>
                
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg font-bold text-primary">
                    ${finalPrice.toFixed(2)}
                  </span>
                  {item.items?.discount_percentage && (
                    <>
                      <span className="text-sm line-through text-gray-500">
                        ${Number(item.items.price).toFixed(2)}
                      </span>
                      <Badge variant="destructive" className="text-xs">
                        -{item.items.discount_percentage}%
                      </Badge>
                    </>
                  )}
                </div>
                
                <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Eye size={12} />
                    <span>{item.view_count}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart size={12} />
                    <span>{item.wishlist_count}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ShoppingBag size={12} />
                    <span>{item.purchase_count}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp size={12} />
                    <span>{Math.round(Number(item.trending_score))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default TrendingItems;