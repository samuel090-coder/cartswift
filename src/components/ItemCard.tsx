
import { useState } from 'react';
import { Heart, Plus, ChevronLeft, ChevronRight, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCart } from '@/contexts/CartContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type Item = Database['public']['Tables']['items']['Row'];

interface ItemCardProps {
  item: Item;
}

const ItemCard = ({ item }: ItemCardProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { addToCart } = useCart();
  const queryClient = useQueryClient();

  // Get session ID for reactions
  const getSessionId = () => {
    let sessionId = localStorage.getItem('cartswift-session');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substr(2, 9);
      localStorage.setItem('cartswift-session', sessionId);
    }
    return sessionId;
  };

  // Query to check if item is liked
  const { data: isLiked = false } = useQuery({
    queryKey: ['reaction', item.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('item_reactions')
        .select('id')
        .eq('item_id', item.id)
        .eq('session_id', getSessionId())
        .maybeSingle();
      return !!data;
    },
  });

  // Mutation to toggle like
  const likeMutation = useMutation({
    mutationFn: async () => {
      const sessionId = getSessionId();
      
      if (isLiked) {
        await supabase
          .from('item_reactions')
          .delete()
          .eq('item_id', item.id)
          .eq('session_id', sessionId);
      } else {
        await supabase
          .from('item_reactions')
          .insert({ item_id: item.id, session_id: sessionId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reaction', item.id] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update reaction",
        variant: "destructive",
      });
    },
  });

  const images = item.images && item.images.length > 0 ? item.images : ['https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400'];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleAddToCart = () => {
    addToCart({
      id: item.id,
      title: item.title,
      price: Number(item.price),
      image: images[0],
    });
    toast({
      title: "Added to cart",
      description: `${item.title} has been added to your cart`,
    });
  };

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-200 bg-white">
      <CardContent className="p-3">
        {/* Image Slider */}
        <div className="relative aspect-square mb-3 overflow-hidden rounded-lg bg-gray-100">
          <img
            src={images[currentImageIndex]}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
          
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="absolute left-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={prevImage}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={nextImage}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
              
              {/* Image indicators */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1">
                {images.map((_, index) => (
                  <div
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full ${
                      index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
          
          {/* React Button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/80 hover:bg-white"
            onClick={() => likeMutation.mutate()}
          >
            <Heart
              className={`h-4 w-4 ${
                isLiked ? 'fill-red-500 text-red-500' : 'text-gray-600'
              }`}
            />
          </Button>
        </div>

        {/* Item Info */}
        <div className="space-y-2">
          <h3 className="font-medium text-sm text-gray-900 line-clamp-2 leading-tight">
            {item.title}
          </h3>
          
          {item.description && (
            <p className="text-xs text-gray-600 line-clamp-1">
              {item.description}
            </p>
          )}
          
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-gray-900">
              ${Number(item.price).toFixed(2)}
            </span>
            <Button
              size="sm"
              onClick={handleAddToCart}
              className="h-7 px-2"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
          
          {/* Delivery Info */}
          <div className="flex items-center text-xs text-gray-500">
            <Truck className="h-3 w-3 mr-1" />
            {item.estimated_delivery_days} day delivery
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ItemCard;
