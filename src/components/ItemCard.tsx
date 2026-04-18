import React, { useState, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, Clock, Eye, ShoppingCart, Star, Download } from 'lucide-react';
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
import { formatDisplayPrice } from '@/lib/priceFormat';

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

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      USD: '$', NGN: '₦', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥', INR: '₹', AUD: '$', CAD: '$'
    };
    return symbols[currency] || currency + ' ';
  };

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

  useEffect(() => { trackView.mutate(); }, [item.id]);

  const finalPrice = item.discount_percentage 
    ? Number(item.price) * (1 - item.discount_percentage / 100)
    : Number(item.price);

  useEffect(() => {
    const baseViews = Math.floor(Math.random() * 5000) + 1000;
    const basePurchases = Math.floor(Math.random() * 1000) + 100;
    setMockViews(baseViews);
    setMockPurchases(basePurchases);
    const interval = setInterval(() => {
      setMockViews(prev => prev + Math.floor(Math.random() * 3));
      if (Math.random() > 0.7) setMockPurchases(prev => prev + 1);
    }, 5000 + Math.random() * 10000);
    return () => clearInterval(interval);
  }, [item.id]);

  const getSessionId = () => {
    let sessionId = localStorage.getItem('cartswift-session');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substr(2, 9);
      localStorage.setItem('cartswift-session', sessionId);
    }
    return sessionId;
  };

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

  const likeMutation = useMutation({
    mutationFn: async () => {
      const sessionId = getSessionId();
      if (isLiked) {
        await supabase.from('item_reactions').delete().eq('item_id', item.id).eq('session_id', sessionId);
      } else {
        await supabase.from('item_reactions').insert({ item_id: item.id, session_id: sessionId });
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['reaction', item.id] }); },
    onError: () => { toast({ title: "Error", description: "Failed to update reaction", variant: "destructive" }); },
  });

  const images = item.images && item.images.length > 0 ? item.images : ['https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400'];
  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);

  const handleAddToCart = () => {
    if (item.item_type === 'apk' || item.item_type === 'file') {
      window.location.href = `/download/${item.id}/payment`;
      return;
    }
    addToCart({ id: item.id, title: item.title, price: finalPrice, image: images[0], currency: item.currency || 'USD' });
    toast({ title: "Added to cart", description: `${item.title} has been added to your cart` });
  };

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
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(productStructuredData);
    script.id = `product-schema-${item.id}`;
    document.head.appendChild(script);
    return () => {
      const existingScript = document.getElementById(`product-schema-${item.id}`);
      if (existingScript) document.head.removeChild(existingScript);
    };
  }, [item.id]);

  return (
    <Card className="group overflow-hidden border border-border/50 bg-card hover:border-primary/30 transition-all duration-300 hover:shadow-lg" style={{ boxShadow: 'var(--shadow-soft)' }}>
      <CardContent className="p-0">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-secondary">
          <LazyImage
            src={images[currentImageIndex]}
            alt={`${item.title} - ${item.category} - ${getCurrencySymbol(item.currency || 'USD')}${Number(item.price).toFixed(2)}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          
          {item.discount_percentage && (
            <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground font-bold text-xs">
              -{item.discount_percentage}%
            </Badge>
          )}
          
          {images.length > 1 && (
            <>
              <Button variant="ghost" size="sm"
                className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 bg-background/70 hover:bg-background/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                onClick={prevImage}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 bg-background/70 hover:bg-background/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                onClick={nextImage}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1">
                {images.map((_, index) => (
                  <div key={index} className={`w-1.5 h-1.5 rounded-full transition-colors ${index === currentImageIndex ? 'bg-primary' : 'bg-foreground/30'}`} />
                ))}
              </div>
            </>
          )}
          
          <div className="absolute top-2 right-2">
            <WishlistButton itemId={item.id} size="sm" />
          </div>
        </div>

        {/* Info */}
        <div className="p-3 space-y-2">
          <h3 className="font-semibold text-sm leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {item.title}
          </h3>
          
          {item.star_rating && (
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`h-3 w-3 ${i < item.star_rating! ? 'fill-neon-amber text-neon-amber' : 'text-muted-foreground/30'}`} />
              ))}
              <span className="text-xs text-muted-foreground ml-1">({item.star_rating})</span>
            </div>
          )}
          
          <ExpandableDescription description={item.description || ''} maxLines={2} />
          
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-neon-emerald">
                {formatDisplayPrice(finalPrice, getCurrencySymbol(item.currency || 'USD'))}
              </span>
              {item.discount_percentage && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatDisplayPrice(Number(item.price), getCurrencySymbol(item.currency || 'USD'))}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{item.estimated_delivery_days || 7}d</span>
            </div>
          </div>

          {/* Analytics */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3 text-neon-cyan" />
              <span>{mockViews.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <ShoppingCart className="h-3 w-3 text-neon-amber" />
              <span>{mockPurchases.toLocaleString()} sold</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button onClick={handleAddToCart} className="flex-1 btn-premium text-xs h-9" size="sm">
              {item.item_type === 'apk' || item.item_type === 'file' ? (
                <><Download className="h-3.5 w-3.5 mr-1" />Download</>
              ) : (
                <><Plus className="h-3.5 w-3.5 mr-1" />Add to Cart</>
              )}
            </Button>
            <SocialShareButtons itemId={item.id} itemTitle={item.title} itemImage={images[0]} />
          </div>

          <div className="text-xs text-muted-foreground">
            🚚 Est. delivery: {item.estimated_delivery_days || 7} days
          </div>

          <ReviewsSection itemId={item.id} />
        </div>
      </CardContent>
    </Card>
  );
};

export default ItemCard;
