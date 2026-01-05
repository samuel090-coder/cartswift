import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { Sparkles, ShoppingCart } from 'lucide-react';

interface ProductRecommendationsProps {
  currentItemId?: string;
  currentCategory?: string;
  limit?: number;
}

const getSessionId = () => {
  let sessionId = localStorage.getItem('cartswift-session-id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('cartswift-session-id', sessionId);
  }
  return sessionId;
};

const ProductRecommendations = ({ 
  currentItemId, 
  currentCategory,
  limit = 4 
}: ProductRecommendationsProps) => {
  const { addToCart } = useCart();
  const sessionId = getSessionId();

  // Track view for recommendations
  useEffect(() => {
    if (currentItemId) {
      supabase
        .from('browsing_history')
        .insert({
          session_id: sessionId,
          item_id: currentItemId,
        })
        .then(() => {});
    }
  }, [currentItemId, sessionId]);

  // Fetch browsing history
  const { data: browsingHistory = [] } = useQuery({
    queryKey: ['browsing-history', sessionId],
    queryFn: async () => {
      const { data } = await supabase
        .from('browsing_history')
        .select('item_id')
        .eq('session_id', sessionId)
        .order('viewed_at', { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  // Fetch recommendations based on browsing history and current item
  const { data: recommendations = [] } = useQuery({
    queryKey: ['recommendations', currentItemId, currentCategory, browsingHistory],
    queryFn: async () => {
      // Get items from same category, excluding current and already viewed
      const viewedIds = browsingHistory.map((h: any) => h.item_id);
      const excludeIds = currentItemId ? [...viewedIds, currentItemId] : viewedIds;

      let query = supabase
        .from('items')
        .select('*')
        .limit(limit);

      if (currentCategory && ['Fashion', 'Animals', 'Tools', 'Vehicles', 'Books'].includes(currentCategory)) {
        query = query.eq('category', currentCategory as 'Fashion' | 'Animals' | 'Tools' | 'Vehicles' | 'Books');
      }

      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
      }

      // Also get trending items
      const { data: categoryItems } = await query;

      // If not enough, get popular items
      if ((categoryItems?.length || 0) < limit) {
        const { data: popularItems } = await supabase
          .from('items')
          .select('*, item_popularity(trending_score)')
          .order('created_at', { ascending: false })
          .limit(limit - (categoryItems?.length || 0));
        
        return [...(categoryItems || []), ...(popularItems || [])].slice(0, limit);
      }

      return categoryItems || [];
    },
  });

  const handleAddToCart = (product: any) => {
    addToCart({
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.images?.[0] || '/placeholder.svg',
      currency: product.currency || 'USD',
    });
    toast.success(`${product.title} added to cart!`);
  };

  if (recommendations.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          You Might Also Like
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {recommendations.map((product: any) => (
            <div 
              key={product.id} 
              className="group cursor-pointer"
            >
              <div className="aspect-square bg-muted rounded-lg overflow-hidden mb-2">
                <img 
                  src={product.images?.[0] || '/placeholder.svg'} 
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <h4 className="font-medium text-sm line-clamp-1">{product.title}</h4>
              <p className="text-sm font-bold text-primary">${product.price}</p>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full mt-1"
                onClick={() => handleAddToCart(product)}
              >
                <ShoppingCart className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductRecommendations;
