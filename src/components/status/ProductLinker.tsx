import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingBag, Search, X, Package, Check, Store
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ProductLinkerProps {
  onSelect: (product: { 
    id: string; 
    type: 'seller_product' | 'item';
    title: string; 
    price: number;
    currency: string;
    image: string | null;
  }) => void;
  onClose: () => void;
  selectedProduct?: any;
}

const ProductLinker = ({ onSelect, onClose, selectedProduct }: ProductLinkerProps) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'my-products' | 'all-items'>('my-products');

  // Fetch user's seller products
  const { data: myProducts = [] } = useQuery({
    queryKey: ['my-seller-products', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seller_products')
        .select('*')
        .eq('seller_id', user?.id)
        .eq('is_approved', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch all items (for non-sellers or additional products)
  const { data: allItems = [] } = useQuery({
    queryKey: ['all-items-for-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const filteredProducts = activeTab === 'my-products' 
    ? myProducts.filter((p: any) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allItems.filter((i: any) =>
        i.title.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const handleSelectProduct = (product: any) => {
    if (activeTab === 'my-products') {
      onSelect({
        id: product.id,
        type: 'seller_product',
        title: product.title,
        price: product.price,
        currency: product.currency || 'USD',
        image: product.images?.[0] || null
      });
    } else {
      onSelect({
        id: product.id,
        type: 'item',
        title: product.title,
        price: product.price,
        currency: product.currency || 'USD',
        image: product.images?.[0] || null
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <h2 className="text-white font-semibold">Link Product</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 py-3">
        <Button
          size="sm"
          variant={activeTab === 'my-products' ? 'default' : 'outline'}
          onClick={() => setActiveTab('my-products')}
          className={activeTab === 'my-products' ? 'bg-primary' : 'border-white/20 text-white'}
        >
          <Store className="w-4 h-4 mr-1" />
          My Products
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'all-items' ? 'default' : 'outline'}
          onClick={() => setActiveTab('all-items')}
          className={activeTab === 'all-items' ? 'bg-primary' : 'border-white/20 text-white'}
        >
          <Package className="w-4 h-4 mr-1" />
          Marketplace
        </Button>
      </div>

      {/* Search */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
          />
        </div>
      </div>

      {/* Selected Product Preview */}
      {selectedProduct && (
        <div className="mx-4 my-2 p-3 rounded-xl bg-primary/20 border border-primary/40">
          <div className="flex items-center gap-3">
            {selectedProduct.image && (
              <img 
                src={selectedProduct.image} 
                alt={selectedProduct.title}
                className="w-12 h-12 rounded-lg object-cover"
              />
            )}
            <div className="flex-1">
              <p className="text-white font-medium text-sm">{selectedProduct.title}</p>
              <p className="text-primary text-xs font-bold">
                {selectedProduct.currency} {selectedProduct.price.toFixed(2)}
              </p>
            </div>
            <Badge className="bg-primary text-white">
              <Check className="w-3 h-3 mr-1" />
              Linked
            </Badge>
          </div>
        </div>
      )}

      {/* Product List */}
      <ScrollArea className="flex-1 px-4">
        <div className="grid grid-cols-2 gap-3 pb-4">
          {filteredProducts.map((product: any) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`rounded-xl overflow-hidden bg-white/5 border ${
                selectedProduct?.id === product.id 
                  ? 'border-primary ring-2 ring-primary/50' 
                  : 'border-white/10'
              } hover:bg-white/10 transition-all cursor-pointer`}
              onClick={() => handleSelectProduct(product)}
            >
              {/* Product Image */}
              <div className="aspect-square bg-white/5 relative">
                {product.images?.[0] ? (
                  <img 
                    src={product.images[0]} 
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-10 h-10 text-white/20" />
                  </div>
                )}
                {selectedProduct?.id === product.id && (
                  <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                    <Check className="w-8 h-8 text-white" />
                  </div>
                )}
              </div>
              
              {/* Product Info */}
              <div className="p-3">
                <p className="text-white text-sm font-medium truncate">{product.title}</p>
                <p className="text-primary text-sm font-bold">
                  {product.currency || 'USD'} {product.price.toFixed(2)}
                </p>
              </div>
            </motion.div>
          ))}
          
          {filteredProducts.length === 0 && (
            <div className="col-span-2 text-center py-8">
              <Package className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/60 text-sm">
                {activeTab === 'my-products' 
                  ? 'No products found. Add products in your seller dashboard.'
                  : 'No items found'}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
};

export default ProductLinker;
