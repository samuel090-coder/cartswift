import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, TrendingUp, MapPin, Filter, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import Header from '@/components/Header';
import AnimatedBackground from '@/components/AnimatedBackground';
import BottomNavigation from '@/components/BottomNavigation';
import ItemCard from '@/components/ItemCard';
import SEOHead from '@/components/SEOHead';
import { Database } from '@/integrations/supabase/types';
import { motion } from 'framer-motion';

type Item = Database['public']['Tables']['items']['Row'];

const Explore = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<string>('all');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['explore-items', searchQuery, selectedFilter, priceRange],
    queryFn: async () => {
      let query = supabase.from('items').select('*').order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }
      if (selectedFilter !== 'all') {
        query = query.eq('category', selectedFilter as any);
      }
      if (priceRange === 'under10') query = query.lte('price', 10);
      else if (priceRange === '10-50') query = query.gte('price', 10).lte('price', 50);
      else if (priceRange === '50-100') query = query.gte('price', 50).lte('price', 100);
      else if (priceRange === 'over100') query = query.gte('price', 100);

      const { data, error } = await query.limit(40);
      if (error) throw error;
      return data as Item[];
    },
  });

  const { data: trendingItems = [] } = useQuery({
    queryKey: ['trending-explore'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);
      if (error) throw error;
      return data as Item[];
    },
  });

  const filters = [
    { id: 'all', label: '🔥 All' },
    { id: 'Fashion', label: '👗 Fashion' },
    { id: 'Animals', label: '🐾 Animals' },
    { id: 'Tools', label: '🔧 Tools' },
    { id: 'Vehicles', label: '🚗 Vehicles' },
    { id: 'Books', label: '📚 Books' },
  ];

  const priceFilters = [
    { id: 'all', label: 'Any Price' },
    { id: 'under10', label: 'Under $10' },
    { id: '10-50', label: '$10 - $50' },
    { id: '50-100', label: '$50 - $100' },
    { id: 'over100', label: '$100+' },
  ];

  return (
    <AnimatedBackground>
      <SEOHead
        title="Explore - Discover Trending Products | CartSwift"
        description="Explore trending products, discover new deals, and find items you'll love on CartSwift."
        canonical="https://cartswift.lovable.app/explore"
      />
      <Header onSearch={setSearchQuery} />

      <div className="container mx-auto px-4 pt-4 pb-6 relative z-10">
        {/* Search Section */}
        <div className="mb-6">
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for anything..."
              className="pl-10 pr-4 h-12 bg-secondary border-border/50 text-foreground text-base rounded-xl focus:border-primary/50"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          {filters.map((filter) => (
            <Button
              key={filter.id}
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFilter(filter.id)}
              className={`flex-shrink-0 rounded-full text-xs border transition-all ${
                selectedFilter === filter.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary'
              }`}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {/* Price Filters */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
          {priceFilters.map((filter) => (
            <Button
              key={filter.id}
              variant="ghost"
              size="sm"
              onClick={() => setPriceRange(filter.id)}
              className={`flex-shrink-0 rounded-full text-xs border transition-all ${
                priceRange === filter.id
                  ? 'bg-neon-amber/20 text-neon-amber border-neon-amber/30'
                  : 'bg-secondary/30 text-muted-foreground border-border/30 hover:bg-secondary/50'
              }`}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {/* Trending Section (show when no search) */}
        {!searchQuery && selectedFilter === 'all' && priceRange === 'all' && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-neon-amber" />
              <h2 className="text-lg font-bold text-foreground">🔥 Trending Now</h2>
              <Badge className="bg-primary/20 text-primary border-none text-xs">Hot</Badge>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {trendingItems.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex-shrink-0 w-36"
                >
                  <Card className="overflow-hidden border border-border/50 bg-card hover:border-primary/30 transition-all">
                    <div className="aspect-square overflow-hidden bg-secondary">
                      <img
                        src={item.images?.[0] || '/placeholder.svg'}
                        alt={item.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                    <CardContent className="p-2">
                      <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                      <p className="text-sm font-bold text-neon-emerald">${Number(item.price).toFixed(2)}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Location-based placeholder */}
        {!searchQuery && selectedFilter === 'all' && priceRange === 'all' && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-5 w-5 text-neon-cyan" />
              <h2 className="text-lg font-bold text-foreground">📍 Popular Near You</h2>
            </div>
            <div className="p-4 bg-secondary/30 rounded-xl border border-border/30 text-center">
              <Sparkles className="h-8 w-8 text-neon-violet mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Enable location to see trending items in your area</p>
              <Button size="sm" variant="ghost" className="mt-2 text-primary text-xs">
                Enable Location
              </Button>
            </div>
          </section>
        )}

        {/* Results */}
        <section>
          {searchQuery && (
            <p className="text-sm text-muted-foreground mb-4">
              {items.length} results for "{searchQuery}"
            </p>
          )}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-card rounded-lg p-3 animate-pulse border border-border/30">
                  <div className="bg-secondary aspect-square rounded-lg mb-2" />
                  <div className="bg-secondary h-3 rounded mb-1" />
                  <div className="bg-secondary h-4 rounded w-16" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No items found. Try different filters!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      </div>

      <BottomNavigation />
    </AnimatedBackground>
  );
};

export default Explore;
