import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Store, Star, ShoppingBag, Verified, ChevronRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const SuggestedSellers = () => {
  // Fetch approved sellers with their products
  const { data: sellers = [], isLoading } = useQuery({
    queryKey: ['suggested-sellers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_seller', true)
        .eq('seller_verified', true)
        .not('store_name', 'is', null)
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Fetch product counts for sellers
  const { data: productCounts = {} } = useQuery({
    queryKey: ['seller-product-counts', sellers?.map(s => s.id)],
    queryFn: async () => {
      if (!sellers?.length) return {};
      const { data, error } = await supabase
        .from('seller_products')
        .select('seller_id')
        .eq('is_approved', true)
        .in('seller_id', sellers.map(s => s.id));
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach(p => {
        counts[p.seller_id] = (counts[p.seller_id] || 0) + 1;
      });
      return counts;
    },
    enabled: sellers?.length > 0,
  });

  if (isLoading || sellers.length === 0) return null;

  const getInitials = (name: string | null) => {
    if (!name) return 'S';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <section className="py-8 px-4 bg-gradient-to-r from-pink-soft via-background to-pink-soft">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-pink-vibrant bg-clip-text text-transparent">
                ✨ Featured Sellers
              </h2>
              <p className="text-sm text-muted-foreground">Discover amazing stores from verified sellers</p>
            </div>
          </div>
          <Button variant="ghost" className="text-primary hover:text-primary/80 gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
          {sellers.map((seller, index) => (
            <motion.div
              key={seller.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="snap-start"
            >
              <Link to={`/seller-profile/${seller.id}`}>
                <Card className="w-[180px] hover:shadow-lg transition-all duration-300 border-primary/10 hover:border-primary/30 bg-gradient-to-br from-background to-pink-soft/50 group overflow-hidden">
                  {/* Background Cover */}
                  <div 
                    className="h-16 bg-gradient-to-br from-primary/20 via-pink-medium/30 to-peach/40 relative"
                    style={seller.background_image_url ? {
                      backgroundImage: `url(${seller.background_image_url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    } : {}}
                  >
                    {seller.seller_verified && (
                      <Badge className="absolute top-2 right-2 bg-primary/90 text-[10px] px-1.5 py-0.5">
                        <Verified className="w-3 h-3 mr-0.5" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  
                  <CardContent className="p-3 pt-0 -mt-6 relative">
                    <div className="flex flex-col items-center text-center">
                      <Avatar className="h-12 w-12 border-2 border-background ring-2 ring-primary/20 mb-2">
                        <AvatarImage src={seller.store_logo_url || seller.avatar_url || ''} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-pink-vibrant text-white text-sm font-bold">
                          {getInitials(seller.store_name)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <h3 className="font-semibold text-sm truncate w-full group-hover:text-primary transition-colors">
                        {seller.store_name || 'Store'}
                      </h3>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        {seller.seller_rating && (
                          <span className="flex items-center gap-0.5 text-amber-500">
                            <Star className="w-3 h-3 fill-amber-500" />
                            {seller.seller_rating.toFixed(1)}
                          </span>
                        )}
                        <span className="flex items-center gap-0.5">
                          <ShoppingBag className="w-3 h-3" />
                          {productCounts[seller.id] || 0}
                        </span>
                      </div>
                      
                      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                        {seller.store_description || 'Quality products'}
                      </p>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2 w-full text-xs h-7 border-primary/30 text-primary hover:bg-primary hover:text-white"
                      >
                        <Store className="w-3 h-3 mr-1" />
                        Visit Store
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SuggestedSellers;
