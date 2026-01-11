import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Verified, Star } from 'lucide-react';
import { motion } from 'framer-motion';

const CircularSellersRow = () => {
  // Fetch approved sellers with products
  const { data: sellers = [], isLoading } = useQuery({
    queryKey: ['circular-sellers'],
    queryFn: async () => {
      // Get sellers with approved products
      const { data: productsData } = await supabase
        .from('seller_products')
        .select('seller_id')
        .eq('is_approved', true);
      
      const sellerIds = [...new Set(productsData?.map(p => p.seller_id) || [])];
      
      if (sellerIds.length === 0) {
        // Fallback: get all sellers
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('is_seller', true)
          .not('store_name', 'is', null)
          .limit(15);
        if (error) throw error;
        return data || [];
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', sellerIds)
        .not('store_name', 'is', null)
        .limit(15);
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading || sellers.length === 0) return null;

  const getInitials = (name: string | null) => {
    if (!name) return 'S';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <section className="py-4 overflow-hidden">
      <div className="flex items-center gap-2 mb-4 px-4">
        <h2 className="text-lg font-bold bg-gradient-to-r from-primary to-pink-vibrant bg-clip-text text-transparent">
          ✨ Suggested Sellers
        </h2>
        <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px]">
          {sellers.length} Stores
        </Badge>
      </div>

      <div className="flex gap-5 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {sellers.map((seller, index) => (
          <motion.div
            key={seller.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link 
              to={`/seller-profile/${seller.id}`}
              className="flex flex-col items-center gap-2 flex-shrink-0 group"
            >
              {/* Circular Avatar with Gradient Ring */}
              <div className="relative">
                <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-primary via-pink-vibrant to-peach group-hover:scale-105 transition-transform">
                  <div className="w-full h-full rounded-full bg-background p-0.5">
                    <Avatar className="w-full h-full">
                      <AvatarImage src={seller.store_logo_url || seller.avatar_url || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-pink-vibrant text-white text-sm font-bold">
                        {getInitials(seller.store_name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                
                {/* Verified Badge */}
                {seller.seller_verified && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                    <Verified className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>

              {/* Store Name */}
              <div className="text-center max-w-[70px]">
                <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                  {seller.store_name || 'Store'}
                </p>
                {seller.seller_rating && (
                  <div className="flex items-center justify-center gap-0.5 mt-0.5">
                    <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                    <span className="text-[10px] text-muted-foreground">
                      {seller.seller_rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default CircularSellersRow;
