
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
import AnimatedBackground from '@/components/AnimatedBackground';
import SEOHead from '@/components/SEOHead';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingBag, TrendingUp, Gift, Users } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

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
        keywords="online shopping, fashion, books, tools, vehicles, fast delivery, secure checkout, deals, trending, rewards, referrals"
        canonical="https://cartswift.lovable.app/"
        structured_data={structuredData}
      />
      <Header />
      <PromoBanner />
      <WelcomePopup onCategorySelect={handleWelcomeCategorySelect} />
      
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
            <CategoryTabs 
              selectedCategory={selectedCategory}
              onCategoryChange={(category) => {
                setSelectedCategory(category);
                setWelcomeCategory('');
              }}
            />
            <ItemGrid items={items} isLoading={isLoading} />
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
