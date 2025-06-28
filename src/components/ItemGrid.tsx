
import { Database } from '@/integrations/supabase/types';
import ItemCard from './ItemCard';

type Item = Database['public']['Tables']['items']['Row'];

interface ItemGridProps {
  items: Item[];
  isLoading: boolean;
}

const ItemGrid = ({ items, isLoading }: ItemGridProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
            <div className="bg-gray-200 aspect-square rounded-lg mb-3"></div>
            <div className="bg-gray-200 h-4 rounded mb-2"></div>
            <div className="bg-gray-200 h-3 rounded mb-2"></div>
            <div className="bg-gray-200 h-4 rounded w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No items found in this category.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
};

export default ItemGrid;
