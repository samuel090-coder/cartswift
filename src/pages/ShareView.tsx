import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ShoppingCart, Eye, Users, ThumbsUp, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';
import SEOHead from '@/components/SEOHead';
import { motion, useScroll, useTransform } from 'framer-motion';

type Item = Database['public']['Tables']['items']['Row'];
type ShareSettings = Database['public']['Tables']['share_settings']['Row'];

interface ShareData {
  item: Item;
  shareSettings: ShareSettings;
}

const ShareView = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const { addToCart } = useCart();
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [sessionId, setSessionId] = useState<string>('');
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 200]);

  const getCurrencySymbol = (currency: string = 'USD') => {
    const symbols: { [key: string]: string } = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      NGN: '₦',
      JPY: '¥',
      CNY: '¥',
      INR: '₹',
    };
    return symbols[currency] || currency;
  };

  // Generate or get session ID
  useEffect(() => {
    let currentSessionId = localStorage.getItem('cartswift_session_id');
    if (!currentSessionId) {
      currentSessionId = crypto.randomUUID();
      localStorage.setItem('cartswift_session_id', currentSessionId);
    }
    setSessionId(currentSessionId);
  }, []);

  // Track page view
  const trackAnalytics = useMutation({
    mutationFn: async ({ eventType, itemId }: { eventType: string; itemId: string }) => {
      const { error } = await supabase
        .from('share_analytics')
        .insert({
          item_id: itemId,
          event_type: eventType,
          session_id: sessionId,
          user_agent: navigator.userAgent,
          referrer: document.referrer || null
        });
      if (error) throw error;
    }
  });

  // Fetch share data
  const { data: shareData, isLoading, error } = useQuery({
    queryKey: ['share-view', itemId],
    queryFn: async (): Promise<ShareData> => {
      if (!itemId) throw new Error('Item ID is required');
      
      const { data: shareSettings, error: shareError } = await supabase
        .from('share_settings')
        .select('*')
        .eq('item_id', itemId)
        .eq('is_shareable', true)
        .single();
      
      if (shareError) throw new Error('Share page not found or not available');
      
      const { data: item, error: itemError } = await supabase
        .from('items')
        .select('*')
        .eq('id', itemId)
        .single();
      
      if (itemError) throw new Error('Product not found');
      
      return { item, shareSettings };
    },
    retry: false
  });

  // Track view on load
  useEffect(() => {
    if (shareData && sessionId) {
      trackAnalytics.mutate({ eventType: 'view', itemId: shareData.item.id });
    }
  }, [shareData, sessionId]);

  const handleAddToCart = () => {
    if (!shareData) return;
    
    trackAnalytics.mutate({ eventType: 'click', itemId: shareData.item.id });
    
    const cartItem = {
      id: shareData.item.id,
      title: shareData.item.title,
      price: Number(shareData.item.price),
      image: shareData.item.images?.[0] || '/placeholder.svg',
      currency: shareData.item.currency || 'USD',
    };
    
    addToCart(cartItem);
    toast.success('Added to cart!');
  };

  const handlePurchaseClick = () => {
    if (!shareData) return;
    
    trackAnalytics.mutate({ eventType: 'conversion', itemId: shareData.item.id });
    
    // For downloadable items (APK), redirect to download payment page
    if (shareData.item.item_type === 'download') {
      window.location.href = `/download-payment/${shareData.item.id}`;
      return;
    }
    
    // For physical products, add to cart and go to checkout
    const cartItem = {
      id: shareData.item.id,
      title: shareData.item.title,
      price: Number(shareData.item.price),
      image: shareData.item.images?.[0] || '/placeholder.svg',
      currency: shareData.item.currency || 'USD',
    };
    
    addToCart(cartItem);
    window.location.href = '/checkout';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <div className="animate-pulse text-center space-y-4">
          <div className="w-32 h-32 bg-primary/20 rounded-full mx-auto animate-bounce"></div>
          <p className="text-lg text-muted-foreground">Loading amazing product...</p>
        </div>
      </div>
    );
  }

  if (error || !shareData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-destructive/5 to-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto px-4">
          <h1 className="text-4xl font-bold text-destructive">Page Not Found</h1>
          <p className="text-muted-foreground">This share page is not available or has been removed.</p>
          <Button onClick={() => window.location.href = '/'}>
            Go to Main Store
          </Button>
        </div>
      </div>
    );
  }

  const { item, shareSettings } = shareData;
  
  // Calculate discount price
  const originalPrice = Number(item.price);
  const discountPrice = item.discount_percentage 
    ? originalPrice * (1 - item.discount_percentage / 100)
    : originalPrice;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": shareSettings.share_headline || item.title,
    "description": item.description,
    "image": shareSettings.hero_media_url || item.images?.[0],
    "offers": {
      "@type": "Offer",
      "price": discountPrice.toFixed(2),
      "priceCurrency": item.currency || "USD",
      "availability": "https://schema.org/InStock"
    },
    "aggregateRating": item.star_rating ? {
      "@type": "AggregateRating",
      "ratingValue": item.star_rating,
      "ratingCount": "127"
    } : undefined
  };

  return (
    <>
      <SEOHead
        title={`${shareSettings.share_headline || item.title} - CartSwift`}
        description={item.description || `Get ${shareSettings.share_headline || item.title} at the best price with fast delivery.`}
        canonical={`https://cartswift.lovable.app/share/${item.id}`}
        structured_data={structuredData}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        {/* Hero Section */}
        <motion.section 
          className="relative min-h-screen flex items-center justify-center overflow-hidden"
          style={{ y }}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 animate-gradient-shift"></div>
          </div>
          
          <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-8 items-center relative z-10">
            {/* Media Section */}
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="relative group">
                {shareSettings.hero_media_type === 'video' && shareSettings.hero_media_url ? (
                  <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl">
                    <video
                      src={shareSettings.hero_media_url}
                      autoPlay
                      muted
                      loop={isVideoPlaying}
                      className="w-full h-full object-cover"
                      onLoadedData={() => setIsVideoPlaying(true)}
                    />
                    <button
                      onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                      className="absolute bottom-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                    >
                      {isVideoPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                  </div>
                ) : (
                  <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl">
                    <img
                      src={shareSettings.hero_media_url || item.images?.[0] || '/placeholder.svg'}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    {item.discount_percentage && (
                      <Badge className="absolute top-4 left-4 bg-destructive text-destructive-foreground text-lg px-3 py-1 animate-pulse">
                        {item.discount_percentage}% OFF
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              
              {/* Product Gallery */}
              {item.images && item.images.length > 1 && (
                <motion.div 
                  className="flex gap-3 overflow-x-auto pb-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                >
                  {item.images.slice(1, 5).map((image, index) => (
                    <div key={index} className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden">
                      <img
                        src={image}
                        alt={`${item.title} ${index + 2}`}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>

            {/* Content Section */}
            <motion.div 
              className="space-y-8"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {/* Headline */}
              <div className="space-y-3">
                <motion.h1 
                  className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent leading-tight"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                >
                  {shareSettings.share_headline || item.title}
                </motion.h1>
                
                {/* Star Rating */}
                {item.star_rating && (
                  <motion.div 
                    className="flex items-center gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.4 }}
                  >
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={20}
                          className={i < item.star_rating! ? 'fill-current' : 'fill-gray-200'}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">(127 reviews)</span>
                  </motion.div>
                )}
              </div>

              {/* Benefits */}
              {shareSettings.share_benefits && shareSettings.share_benefits.length > 0 && (
                <motion.div 
                  className="space-y-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.6 }}
                >
                  {shareSettings.share_benefits.slice(0, 3).map((benefit, index) => (
                    <motion.div
                      key={index}
                      className="flex items-center gap-3 text-lg"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + index * 0.1, duration: 0.4 }}
                    >
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <ThumbsUp size={14} className="text-primary-foreground" />
                      </div>
                      <span className="text-foreground/90">{benefit}</span>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Price */}
              <motion.div 
                className="flex items-center gap-4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9, duration: 0.5 }}
              >
                <div className="text-4xl font-bold text-primary">
                  {getCurrencySymbol(item.currency)}{discountPrice.toFixed(2)}
                </div>
                {item.discount_percentage && (
                  <div className="text-2xl text-muted-foreground line-through">
                    {getCurrencySymbol(item.currency)}{originalPrice.toFixed(2)}
                  </div>
                )}
              </motion.div>

              {/* Social Proof */}
              <motion.div 
                className="bg-card/50 backdrop-blur-sm border rounded-xl p-4 space-y-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.6 }}
              >
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Eye size={16} />
                    <span>2,847 people viewed this today</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users size={16} />
                    <span>156 sold this week</span>
                  </div>
                </div>
                {shareSettings.social_proof_text && (
                  <p className="text-sm italic text-muted-foreground border-l-2 border-primary pl-3">
                    "{shareSettings.social_proof_text}"
                  </p>
                )}
              </motion.div>

              {/* CTAs */}
              <motion.div 
                className="space-y-4"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.6 }}
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={handlePurchaseClick}
                    size="lg"
                    className="w-full h-14 text-lg font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <ShoppingCart size={20} />
                      {shareSettings.cta_text || 'Buy Now'}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 group-hover:translate-x-96 transition-transform duration-1000"></div>
                  </Button>
                </motion.div>
                
                <Button
                  onClick={handleAddToCart}
                  variant="outline"
                  size="lg"
                  className="w-full h-12 font-semibold border-2 hover:bg-primary/5"
                >
                  Add to Cart
                </Button>
              </motion.div>

              {/* Delivery Info */}
              <motion.div 
                className="text-sm text-muted-foreground text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.3, duration: 0.4 }}
              >
                🚀 Fast delivery in {item.estimated_delivery_days} days • 💰 30-day money-back guarantee
              </motion.div>
            </motion.div>
          </div>
        </motion.section>

        {/* Sticky CTA */}
        <motion.div
          className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-4 z-50 lg:hidden"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ delay: 2, duration: 0.5 }}
        >
          <div className="flex gap-2">
            <Button
              onClick={handleAddToCart}
              variant="outline"
              className="flex-1"
            >
              Add to Cart
            </Button>
            <Button
              onClick={handlePurchaseClick}
              className="flex-1 bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black font-bold"
            >
              {shareSettings.cta_text || 'Buy Now'}
            </Button>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default ShareView;