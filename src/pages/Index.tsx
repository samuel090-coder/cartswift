
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import CategoryTabs from '@/components/CategoryTabs';
import ItemGrid from '@/components/ItemGrid';
import PromoBanner from '@/components/PromoBanner';
import WelcomePopup from '@/components/WelcomePopup';
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-pink-400/20 to-yellow-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-green-400/10 to-blue-400/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <Header />
      <PromoBanner />
      <WelcomePopup onCategorySelect={handleWelcomeCategorySelect} />
      
      <div className="container mx-auto px-4 py-6 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 animate-pulse">
            CARTSWIFT
          </h1>
          <p className="text-lg text-gray-600 font-medium">Fast delivery, amazing deals</p>
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
    </div>
  );
};

export default Index;
