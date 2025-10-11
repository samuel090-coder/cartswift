import React, { useState, useEffect } from 'react';
import { Heart, Plus, ChevronLeft, ChevronRight, Truck, Clock, Eye, ShoppingCart, Star, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import WishlistButton from './WishlistButton';
import SocialShareButtons from './SocialShareButtons';
import ReviewsSection from './ReviewsSection';
import { useCart } from '@/contexts/CartContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';
import ExpandableDescription from './ExpandableDescription';
import LazyImage from './LazyImage';

type Item = Database['public']['Tables']['items']['Row'];

interface ItemCardProps {
  item: Item;
}

const ItemCard = ({ item }: ItemCardProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [mockViews, setMockViews] = useState(0);
  const [mockPurchases, setMockPurchases] = useState(0);
  const { addToCart } = useCart();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const sessionId = sessionStorage.getItem('sessionId') || '';

  // Currency symbol helper
  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      USD: '$', NGN: '₦', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥', INR: '₹', AUD: '$', CAD: '$'
    };
    return symbols[currency] || currency + ' ';
  };

  // Track item views for popularity
  const trackView = useMutation({
    mutationFn: async () => {
      await supabase
        .from('share_analytics')
        .insert({
          item_id: item.id,
          event_type: 'view',
          session_id: sessionId,
          user_agent: navigator.userAgent,
          referrer: document.referrer || null
        });
    }
  });

  // Track view when component mounts
  useEffect(() => {
    trackView.mutate();
  }, [item.id]);

  const finalPrice = item.discount_percentage 
    ? Number(item.price) * (1 - item.discount_percentage / 100)
    : Number(item.price);

  // Initialize mock data
  useEffect(() => {
    const baseViews = Math.floor(Math.random() * 5000) + 1000;
    const basePurchases = Math.floor(Math.random() * 1000) + 100;
    setMockViews(baseViews);
    setMockPurchases(basePurchases);

    // Animate numbers slightly
    const interval = setInterval(() => {
      setMockViews(prev => prev + Math.floor(Math.random() * 3));
      if (Math.random() > 0.7) {
        setMockPurchases(prev => prev + 1);
      }
    }, 5000 + Math.random() * 10000);

    return () => clearInterval(interval);
  }, [item.id]);

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
    // Check if it's an APK or file - redirect to download payment
    if (item.item_type === 'apk' || item.item_type === 'file') {
      window.location.href = `/download/${item.id}/payment`;
      return;
    }
    
    // Regular product - add to cart
    addToCart({
      id: item.id,
      title: item.title,
      price: finalPrice,
      image: images[0],
    });
    toast({
      title: "Added to cart",
      description: `${item.title} has been added to your cart`,
    });
  };

  // Generate structured data for this product
  const productStructuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": item.title,
    "description": item.description || `${item.title} from ${item.category} category`,
    "image": images,
    "category": item.category,
    "offers": {
      "@type": "Offer",
      "price": Number(item.price).toFixed(2),
      "priceCurrency": item.currency || "USD",
      "availability": "https://schema.org/InStock",
      "url": `https://cartswift.lovable.app/#item-${item.id}`
    },
    ...(item.star_rating && {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": item.star_rating,
        "bestRating": 5,
        "worstRating": 1,
        "ratingCount": Math.floor(Math.random() * 100) + 20
      }
    })
  };

  useEffect(() => {
    // Add structured data to page
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(productStructuredData);
    script.id = `product-schema-${item.id}`;
    document.head.appendChild(script);

    return () => {
      const existingScript = document.getElementById(`product-schema-${item.id}`);
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, [item.id]);

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden border-2 hover:border-blue-200">
      <CardContent className="p-4 space-y-3">
        {/* Image Slider */}
        <div className="relative aspect-square mb-3 overflow-hidden rounded-lg bg-gray-100">
          <LazyImage
            src={images[currentImageIndex]}
            alt={`${item.title} - ${item.category} - ${getCurrencySymbol(item.currency || 'USD')}${Number(item.price).toFixed(2)}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
          
          {/* Discount Badge */}
          {item.discount_percentage && (
            <Badge className="absolute top-2 left-2 bg-red-500 text-white font-bold">
              -{item.discount_percentage}%
            </Badge>
          )}
          
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
          
          {/* Wishlist Button */}
          <div className="absolute top-2 right-2">
            <WishlistButton itemId={item.id} size="sm" />
          </div>
        </div>

        {/* Item Info */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg leading-tight group-hover:text-blue-600 transition-colors">
            {item.title}
          </h3>
          
          {/* Star Rating */}
          {item.star_rating && (
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < item.star_rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                  }`}
                />
              ))}
              <span className="text-sm text-gray-500 ml-1">({item.star_rating}/5)</span>
            </div>
          )}
          
          <ExpandableDescription description={item.description || ''} maxLines={2} />
          
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-green-600">
              {getCurrencySymbol(item.currency || 'USD')}{Number(item.price).toFixed(2)}
            </span>
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>{item.estimated_delivery_days || 7} days</span>
            </div>
          </div>

          {/* Mock Analytics */}
          <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t">
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span className="animate-pulse">{mockViews.toLocaleString()} views</span>
            </div>
            <div className="flex items-center gap-1">
              <ShoppingCart className="h-3 w-3" />
              <span className="animate-pulse">{mockPurchases.toLocaleString()} bought</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleAddToCart}
              className="flex-1"
              size="sm"
            >
              {item.item_type === 'apk' || item.item_type === 'file' ? (
                <>
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Add to Cart
                </>
              )}
            </Button>
            <SocialShareButtons 
              itemId={item.id}
              itemTitle={item.title}
              itemImage={images[0]}
            />
          </div>

          <div className="text-sm text-gray-500">
            Estimated delivery: {item.estimated_delivery_days || 7} days
          </div>

          <ReviewsSection itemId={item.id} />
        </div>
      </CardContent>
    </Card>
  );
};

export default ItemCard;
