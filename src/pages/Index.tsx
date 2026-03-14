import { useState, useEffect } from 'react';
import { useAutoSubscribe } from '@/hooks/useAutoSubscribe';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
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
import StatusBar from '@/components/StatusBar';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import BottomNavigation from '@/components/BottomNavigation';
import SocialFeed from '@/components/SocialFeed';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, TrendingUp, Gift, Users, Sparkles, Package, Tv } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

type Item = Database['public']['Tables']['items']['Row'];
type ItemCategory = Database['public']['Enums']['item_category'];

const Index = () => {
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [welcomeCategory, setWelcomeCategory] = useState<string>('');
  const [currentTab, setCurrentTab] = useState(searchParams.get('tab') || 'shop');

  // Sync tab with URL param
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setCurrentTab(tab);
  }, [searchParams]);

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
      <PWAInstallPrompt />
      
      <div className="container mx-auto px-4 pt-3 pb-6 relative z-10">
        
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 max-w-lg mx-auto bg-secondary/50 border border-border/30 backdrop-blur-sm">
            <TabsTrigger value="shop" className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ShoppingBag size={14} />
              Shop
            </TabsTrigger>
            <TabsTrigger value="feed" className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Tv size={14} />
              Feed
            </TabsTrigger>
            <TabsTrigger value="trending" className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <TrendingUp size={14} />
              Hot
            </TabsTrigger>
            <TabsTrigger value="rewards" className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Gift size={14} />
              Rewards
            </TabsTrigger>
            <TabsTrigger value="refer" className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users size={14} />
              Refer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shop" className="space-y-6">
            {/* Status Bar - Stories like feature */}
            <StatusBar />
            
            {/* Removed AllUsersRow as requested */}
            
            <FlashSalesBanner />

            <CategoryTabs 
              selectedCategory={selectedCategory}
              onCategoryChange={(category) => {
                setSelectedCategory(category);
                setWelcomeCategory('');
              }}
            />
            <ItemGrid items={items} isLoading={isLoading} />

            {/* All Seller Products (Boosted + Regular) - Mixed together at bottom */}
            {(boostedProducts.length > 0 || sellerProducts.length > 0) && (
              <section className="py-6">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="w-5 h-5 text-cyan-bright" />
                  <h2 className="text-xl font-bold text-foreground">🛒 From Our Sellers</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {sellerProducts.filter((p: any) => !p.is_featured).map((product: any, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Card className="overflow-hidden hover:shadow-lg transition-all border border-border/50 hover:border-primary/40 bg-card group">
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
                          <h3 className="font-medium text-xs truncate text-foreground group-hover:text-primary transition-colors">
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

          <TabsContent value="feed" className="space-y-6">
            <SocialFeed />
          </TabsContent>

          <TabsContent value="trending" className="space-y-6">
            <TrendingItems />
          </TabsContent>

          <TabsContent value="rewards" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LoyaltyPointsDisplay />
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">How to Earn Points</h2>
                <div className="grid gap-3">
                  {[
                    { action: '🛍️ Make a Purchase', points: '1 point per $1 spent' },
                    { action: '⭐ Write a Review', points: '10 points' },
                    { action: '📱 Share on Social Media', points: '5 points per platform' },
                    { action: '👥 Successful Referral', points: '50 points' }
                  ].map((item) => (
                    <div key={item.action} className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg border border-border/30 backdrop-blur-sm">
                      <span className="font-medium text-foreground">{item.action}</span>
                      <span className="text-neon-cyan font-bold">{item.points}</span>
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
      
      {/* Bottom Navigation */}
      <BottomNavigation />
    </AnimatedBackground>
  );
};

export default Index;
