
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import CategoryTabs from '@/components/CategoryTabs';
import ItemGrid from '@/components/ItemGrid';
import PromoBanner from '@/components/PromoBanner';
import { Database } from '@/integrations/supabase/types';

type Item = Database['public']['Tables']['items']['Row'];
type ItemCategory = Database['public']['Enums']['item_category'];

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['items', selectedCategory],
    queryFn: async () => {
      let query = supabase.from('items').select('*').order('created_at', { ascending: false });
      
      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory as ItemCategory);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Item[];
    },
  });

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
      
      <div className="container mx-auto px-4 py-6 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 animate-pulse">
            CARTSWIFT
          </h1>
          <p className="text-lg text-gray-600 font-medium">Fast delivery, amazing deals</p>
        </div>
        
        <CategoryTabs 
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
        
        <ItemGrid items={items} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default Index;
