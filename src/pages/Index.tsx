import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import FlashSalesBanner from '@/components/FlashSalesBanner';
import TrendingItems from '@/components/TrendingItems';
import LoyaltyPointsDisplay from '@/components/LoyaltyPointsDisplay';
import ReferralSystem from '@/components/ReferralSystem';
import Header from '@/components/Header';
import CategoryTabs from '@/components/CategoryTabs';
import ItemGrid from '@/components/ItemGrid';
import PromoBanner from '@/components/PromoBanner';
import WelcomePopup from '@/components/WelcomePopup';
import WelcomeVoice from '@/components/WelcomeVoice';
import VoiceAssistant from '@/components/VoiceAssistant';
import AnimatedBackground from '@/components/AnimatedBackground';
import SEOHead from '@/components/SEOHead';
import AIShoppingAssistant from '@/components/AIShoppingAssistant';
import LiveChatSupport from '@/components/LiveChatSupport';
import SuggestedSellers from '@/components/SuggestedSellers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, TrendingUp, Gift, Users, Sparkles, Package } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

type Item = Database['public']['Tables']['items']['Row'];
type ItemCategory = Database['public']['Enums']['item_category'];

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [welcomeCategory, setWelcomeCategory] = useState<string>('');
  const [currentTab, setCurrentTab] = useState('shop');

  const { data: allItems = [], isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Item[];
    },
  });

  // Fetch approved & boosted seller products (from active boost requests)
  const { data: boostedProducts = [] } = useQuery({
    queryKey: ['boosted-seller-products'],
    queryFn: async () => {
      // First get active boost requests
      const { data: boostData, error: boostError } = await supabase
        .from('boost_requests')
        .select('product_id')
        .eq('status', 'active')
        .gte('ends_at', new Date().toISOString());
      
      if (boostError) throw boostError;
      
      if (!boostData || boostData.length === 0) {
        // Fallback to featured products
        const { data, error } = await supabase
          .from('seller_products')
          .select('*')
          .eq('is_approved', true)
          .eq('is_featured', true)
          .order('created_at', { ascending: false })
          .limit(8);
        if (error) throw error;
        
        // Fetch seller profiles separately
        const sellerIds = [...new Set(data?.map(p => p.seller_id) || [])];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, store_name, avatar_url, seller_verified')
          .in('id', sellerIds);
        
        return data?.map(p => ({
          ...p,
          profiles: profiles?.find(pr => pr.id === p.seller_id)
        })) || [];
      }
      
      const productIds = boostData.map(b => b.product_id);
      
      const { data, error } = await supabase
        .from('seller_products')
        .select('*')
        .eq('is_approved', true)
        .in('id', productIds)
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      
      // Fetch seller profiles separately
      const sellerIds = [...new Set(data?.map(p => p.seller_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, store_name, avatar_url, seller_verified')
        .in('id', sellerIds);
      
      return data?.map(p => ({
        ...p,
        profiles: profiles?.find(pr => pr.id === p.seller_id)
      })) || [];
    },
  });

  // Fetch regular approved seller products (non-boosted)
  const { data: sellerProducts = [] } = useQuery({
    queryKey: ['approved-seller-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seller_products')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      
      // Fetch seller profiles separately
      const sellerIds = [...new Set(data?.map(p => p.seller_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, store_name, avatar_url, seller_verified')
        .in('id', sellerIds);
      
      return data?.map(p => ({
        ...p,
        profiles: profiles?.find(pr => pr.id === p.seller_id)
      })) || [];
    },
  });

  // Filter items based on welcome category or selected category
  const items = (() => {
    const activeCategory = welcomeCategory || selectedCategory;
    
    // Filter out APK/File items unless that category is selected
    const filteredItems = activeCategory === 'APK/File' 
      ? allItems.filter(item => item.item_type === 'apk' || item.item_type === 'file')
      : allItems.filter(item => item.item_type !== 'apk' && item.item_type !== 'file');
    
    if (activeCategory === 'all' || !activeCategory) {
      return filteredItems;
    }
    
    if (activeCategory === 'APK/File') {
      return filteredItems;
    }
    
    if (welcomeCategory && welcomeCategory !== 'all' && welcomeCategory !== 'APK/File') {
      // Show 70% from selected category, 30% from others
      const categoryItems = filteredItems.filter(item => item.category === welcomeCategory);
      const otherItems = filteredItems.filter(item => item.category !== welcomeCategory);
      
      const categoryCount = Math.ceil(categoryItems.length * 0.7);
      const otherCount = Math.ceil(otherItems.length * 0.3);
      
      return [
        ...categoryItems.slice(0, categoryCount),
        ...otherItems.slice(0, otherCount)
      ].sort(() => Math.random() - 0.5); // Shuffle the results
    }
    
    // Regular category filter
    return filteredItems.filter(item => item.category === activeCategory);
  })();

  const handleWelcomeCategorySelect = (category: string) => {
    setWelcomeCategory(category);
    setSelectedCategory(category);
  };

  // Generate structured data for homepage
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "CartSwift",
    "url": "https://cartswift.lovable.app",
    "description": "Fast & reliable online shopping for fashion, books, tools, vehicles and more",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://cartswift.lovable.app/?search={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <AnimatedBackground>
      <SEOHead 
        title="CartSwift - Fast & Reliable Online Shopping | Fashion, Books, Tools & More"
        description="Shop the latest products at CartSwift with viral deals, trending items, and rewards program. Browse fashion, books, tools, vehicles and more with secure checkout."
        keywords="online shopping, fashion, books, tools, vehicles, fast delivery, secure checkout, deals, trending, rewards, referrals, CartSwift, e-commerce, digital products"
        canonical="https://cartswift.lovable.app/"
        structured_data={structuredData}
        products={allItems}
      />
      <Header />
      <PromoBanner />
      <WelcomePopup onCategorySelect={handleWelcomeCategorySelect} />
      <WelcomeVoice />
      <VoiceAssistant />
      <AIShoppingAssistant />
      <LiveChatSupport />
      
      <div className="container mx-auto px-4 py-6 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-light via-purple-light to-cyan-bright bg-clip-text text-transparent mb-2 animate-pulse">
            CARTSWIFT
          </h1>
          <p className="text-lg text-white/80 font-medium">Fast delivery, amazing deals, viral rewards</p>
        </div>
        
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-md mx-auto">
            <TabsTrigger value="shop" className="gap-2">
              <ShoppingBag size={16} />
              Shop
            </TabsTrigger>
            <TabsTrigger value="trending" className="gap-2">
              <TrendingUp size={16} />
              Trending
            </TabsTrigger>
            <TabsTrigger value="rewards" className="gap-2">
              <Gift size={16} />
              Rewards
            </TabsTrigger>
            <TabsTrigger value="refer" className="gap-2">
              <Users size={16} />
              Refer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shop" className="space-y-6">
            <FlashSalesBanner />
            
            {/* Boosted Products Section */}
            {boostedProducts.length > 0 && (
              <section className="py-4">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h2 className="text-xl font-bold text-white">🔥 Featured Products</h2>
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">Boosted</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {boostedProducts.map((product: any, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="overflow-hidden hover:shadow-lg transition-all border-amber-500/30 hover:border-amber-500/50 bg-gradient-to-br from-background to-amber-50/10 group">
                        <div className="aspect-square relative overflow-hidden">
                          {product.images?.[0] ? (
                            <img 
                              src={product.images[0]} 
                              alt={product.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted">
                              <Package className="w-12 h-12 text-muted-foreground/30" />
                            </div>
                          )}
                          <Badge className="absolute top-2 left-2 bg-gradient-to-r from-amber-500 to-orange-500 text-[10px]">
                            <Sparkles className="w-3 h-3 mr-1" /> Featured
                          </Badge>
                        </div>
                        <CardContent className="p-3">
                          <h3 className="font-medium text-sm truncate text-white group-hover:text-amber-400 transition-colors">
                            {product.title}
                          </h3>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-lg font-bold text-amber-400">
                              ${product.price.toFixed(2)}
                            </p>
                            {product.profiles?.store_name && (
                              <Link to={`/seller-profile/${product.seller_id}`} className="text-xs text-muted-foreground hover:text-white">
                                {product.profiles.store_name}
                              </Link>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            <CategoryTabs 
              selectedCategory={selectedCategory}
              onCategoryChange={(category) => {
                setSelectedCategory(category);
                setWelcomeCategory('');
              }}
            />
            <ItemGrid items={items} isLoading={isLoading} />

            {/* Suggested Sellers Section - Middle of page */}
            <SuggestedSellers />

            {/* Regular Seller Products - At the bottom */}
            {sellerProducts.length > 0 && (
              <section className="py-6">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="w-5 h-5 text-cyan-bright" />
                  <h2 className="text-xl font-bold text-white">🛒 From Our Sellers</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {sellerProducts.filter((p: any) => !p.is_featured).map((product: any, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Card className="overflow-hidden hover:shadow-lg transition-all border-primary/20 hover:border-primary/40 bg-gradient-to-br from-background/90 to-primary/5 group">
                        <div className="aspect-square relative overflow-hidden">
                          {product.images?.[0] ? (
                            <img 
                              src={product.images[0]} 
                              alt={product.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted">
                              <Package className="w-10 h-10 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-2">
                          <h3 className="font-medium text-xs truncate text-white group-hover:text-primary transition-colors">
                            {product.title}
                          </h3>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-sm font-bold text-primary">
                              ${product.price.toFixed(2)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}
          </TabsContent>

          <TabsContent value="trending" className="space-y-6">
            <TrendingItems />
          </TabsContent>

          <TabsContent value="rewards" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LoyaltyPointsDisplay />
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-white">How to Earn Points</h2>
                <div className="grid gap-3">
                  {[
                    { action: '🛍️ Make a Purchase', points: '1 point per $1 spent' },
                    { action: '⭐ Write a Review', points: '10 points' },
                    { action: '📱 Share on Social Media', points: '5 points per platform' },
                    { action: '👥 Successful Referral', points: '50 points' }
                  ].map((item) => (
                    <div key={item.action} className="flex justify-between items-center p-3 bg-white/10 rounded-lg border border-white/20 backdrop-blur-sm">
                      <span className="font-medium text-white">{item.action}</span>
                      <span className="text-cyan-bright font-bold">{item.points}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="refer" className="space-y-6">
            <ReferralSystem />
          </TabsContent>
        </Tabs>
      </div>
    </AnimatedBackground>
  );
};

export default Index;
