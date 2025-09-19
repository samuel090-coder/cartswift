import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WishlistButtonProps {
  itemId: string;
  size?: 'sm' | 'md' | 'lg';
}

const WishlistButton = ({ itemId, size = 'md' }: WishlistButtonProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sessionId = sessionStorage.getItem('sessionId') || '';

  const { data: isWishlisted = false } = useQuery({
    queryKey: ['wishlist', itemId, sessionId],
    queryFn: async () => {
      const { data } = await supabase
        .from('wishlists')
        .select('id')
        .eq('item_id', itemId)
        .eq('session_id', sessionId)
        .maybeSingle();
      return !!data;
    }
  });

  const toggleWishlist = useMutation({
    mutationFn: async () => {
      if (isWishlisted) {
        await supabase
          .from('wishlists')
          .delete()
          .eq('item_id', itemId)
          .eq('session_id', sessionId);
      } else {
        await supabase
          .from('wishlists')
          .insert({ item_id: itemId, session_id: sessionId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist', itemId, sessionId] });
      toast({
        title: isWishlisted ? 'Removed from wishlist' : 'Added to wishlist',
        description: isWishlisted 
          ? 'Item removed from your wishlist' 
          : 'Item saved to your wishlist',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update wishlist',
        variant: 'destructive',
      });
    }
  });

  const sizeMap = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  const iconSizeMap = {
    sm: 16,
    md: 20,
    lg: 24
  };

  return (
    <Button
      variant="outline"
      size="icon"
      className={`${sizeMap[size]} ${
        isWishlisted 
          ? 'bg-red-50 border-red-200 hover:bg-red-100 text-red-600' 
          : 'hover:bg-gray-50'
      }`}
      onClick={() => toggleWishlist.mutate()}
      disabled={toggleWishlist.isPending}
    >
      <Heart 
        size={iconSizeMap[size]} 
        className={isWishlisted ? 'fill-current' : ''} 
      />
    </Button>
  );
};

export default WishlistButton;