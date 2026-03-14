import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, X, ShoppingBag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';

interface TaggedProduct {
  id: string;
  title: string;
  image?: string;
  price?: number;
  currency?: string;
  source: 'item' | 'seller_product';
}

interface ProductTaggerProps {
  onSelect: (product: TaggedProduct) => void;
  onClose: () => void;
}

const ProductTagger = ({ onSelect, onClose }: ProductTaggerProps) => {
  const [search, setSearch] = useState('');

  const { data: products = [] } = useQuery({
    queryKey: ['tag-products', search],
    queryFn: async (): Promise<TaggedProduct[]> => {
      const results: TaggedProduct[] = [];

      // Search admin items
      const { data: items } = await supabase
        .from('items')
        .select('id, title, images, price, currency')
        .ilike('title', `%${search}%`)
        .limit(10);

      items?.forEach(i => results.push({
        id: i.id, title: i.title,
        image: i.images?.[0], price: i.price, currency: i.currency,
        source: 'item',
      }));

      // Search seller products
      const { data: sp } = await supabase
        .from('seller_products')
        .select('id, title, images, price, currency')
        .ilike('title', `%${search}%`)
        .limit(10);

      sp?.forEach(p => results.push({
        id: p.id, title: p.title,
        image: p.images?.[0], price: p.price, currency: p.currency,
        source: 'seller_product',
      }));

      return results;
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50"
    >
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <ShoppingBag className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Tag a Product</span>
        <Button size="icon" variant="ghost" onClick={onClose} className="ml-auto h-6 w-6">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="p-2">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products..."
          className="h-8 text-sm bg-secondary border-none"
          autoFocus
        />
      </div>
      <ScrollArea className="max-h-48">
        {products.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            {search ? 'No products found' : 'Type to search products'}
          </p>
        ) : (
          <div className="divide-y divide-border">
            {products.map(p => (
              <button
                key={`${p.source}-${p.id}`}
                onClick={() => onSelect(p)}
                className="w-full flex items-center gap-2.5 p-2.5 hover:bg-secondary/50 transition-colors text-left"
              >
                {p.image ? (
                  <img src={p.image} alt="" className="h-9 w-9 rounded-lg object-cover" />
                ) : (
                  <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center">
                    <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{p.title}</p>
                  {p.price && (
                    <p className="text-[10px] text-muted-foreground">
                      {p.currency || '$'}{p.price.toFixed(2)}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </motion.div>
  );
};

export default ProductTagger;
