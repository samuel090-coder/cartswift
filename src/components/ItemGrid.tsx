import { ProductGridSkeleton } from './BrandedSkeleton';
import { Database } from '@/integrations/supabase/types';
import ItemCard from './ItemCard';

type Item = Database['public']['Tables']['items']['Row'];

interface ItemGridProps {
  items: Item[];
  isLoading: boolean;
}

const ItemGrid = ({ items, isLoading }: ItemGridProps) => {
  if (isLoading) {
    return <ProductGridSkeleton count={10} />;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">No items found in this category.</p>
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
