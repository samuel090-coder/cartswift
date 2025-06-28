
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import CategoryTabs from '@/components/CategoryTabs';
import ItemGrid from '@/components/ItemGrid';
import { Database } from '@/integrations/supabase/types';

type Item = Database['public']['Tables']['items']['Row'];

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['items', selectedCategory],
    queryFn: async () => {
      let query = supabase.from('items').select('*').order('created_at', { ascending: false });
      
      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Item[];
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">CARTSWIFT</h1>
          <p className="text-lg text-gray-600">Fast delivery, amazing deals</p>
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
