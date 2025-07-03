
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import CategoryTabs from '@/components/CategoryTabs';
import ItemGrid from '@/components/ItemGrid';
import PromoBanner from '@/components/PromoBanner';
import WelcomePopup from '@/components/WelcomePopup';
import AnimatedBackground from '@/components/AnimatedBackground';
import { Database } from '@/integrations/supabase/types';

type Item = Database['public']['Tables']['items']['Row'];
type ItemCategory = Database['public']['Enums']['item_category'];

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [welcomeCategory, setWelcomeCategory] = useState<string>('');

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
    
    if (activeCategory === 'all' || !activeCategory) {
      return allItems;
    }
    
    if (welcomeCategory && welcomeCategory !== 'all') {
      // Show 70% from selected category, 30% from others
      const categoryItems = allItems.filter(item => item.category === welcomeCategory);
      const otherItems = allItems.filter(item => item.category !== welcomeCategory);
      
      const categoryCount = Math.ceil(categoryItems.length * 0.7);
      const otherCount = Math.ceil(otherItems.length * 0.3);
      
      return [
        ...categoryItems.slice(0, categoryCount),
        ...otherItems.slice(0, otherCount)
      ].sort(() => Math.random() - 0.5); // Shuffle the results
    }
    
    // Regular category filter
    return allItems.filter(item => item.category === activeCategory);
  })();

  const handleWelcomeCategorySelect = (category: string) => {
    setWelcomeCategory(category);
    setSelectedCategory(category);
  };

  return (
    <AnimatedBackground>
      <Header />
      <PromoBanner />
      <WelcomePopup onCategorySelect={handleWelcomeCategorySelect} />
      
      <div className="container mx-auto px-4 py-6 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-light via-purple-light to-cyan-bright bg-clip-text text-transparent mb-2 animate-pulse">
            CARTSWIFT
          </h1>
          <p className="text-lg text-white/80 font-medium">Fast delivery, amazing deals</p>
        </div>
        
        <CategoryTabs 
          selectedCategory={selectedCategory}
          onCategoryChange={(category) => {
            setSelectedCategory(category);
            setWelcomeCategory('');
          }}
        />
        
        <ItemGrid items={items} isLoading={isLoading} />
      </div>
    </AnimatedBackground>
  );
};

export default Index;
