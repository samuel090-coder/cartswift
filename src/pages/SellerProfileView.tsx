import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, Store, Star, ShoppingBag, MapPin, Globe, Calendar,
  Verified, Package, MessageCircle, Heart, Share2, Sparkles
} from 'lucide-react';
import Header from '@/components/Header';
import ItemCard from '@/components/ItemCard';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';

const SellerProfileView = () => {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const [isFollowing, setIsFollowing] = useState(false);

  // Fetch seller profile
  const { data: seller, isLoading: loadingSeller } = useQuery({
    queryKey: ['seller-profile', sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sellerId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!sellerId,
  });

  // Fetch seller's approved products
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['seller-public-products', sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seller_products')
        .select('*')
        .eq('seller_id', sellerId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!sellerId,
  });

  const getInitials = (name: string | null) => {
    if (!name) return 'S';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    toast.success(isFollowing ? 'Unfollowed seller' : 'Following seller! 💕');
  };

  const handleShare = () => {
    navigator.share?.({
      title: seller?.store_name || 'Store',
      url: window.location.href,
    }).catch(() => {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied! 📋');
    });
  };

  if (loadingSeller) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-soft via-background to-peach/20">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-soft via-background to-peach/20">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Store not found</h2>
          <p className="text-muted-foreground mb-4">This seller profile doesn't exist.</p>
          <Button onClick={() => navigate('/')} className="bg-primary">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Shopping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-soft via-background to-peach/20">
      <Header />
      
      {/* Cover Image */}
      <div 
        className="h-48 md:h-64 bg-gradient-to-r from-primary/30 via-pink-medium/40 to-coral/30 relative"
        style={seller.background_image_url ? {
          backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.1)), url(${seller.background_image_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } : {}}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm hover:bg-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="absolute top-4 right-4 flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            className="bg-white/80 backdrop-blur-sm hover:bg-white"
          >
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-20 relative z-10">
        {/* Seller Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-lg bg-background/95 backdrop-blur-sm mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <Avatar className="h-24 w-24 border-4 border-background ring-4 ring-primary/20 shadow-lg">
                  <AvatarImage src={seller.store_logo_url || seller.avatar_url || ''} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-pink-vibrant text-white text-2xl font-bold">
                    {getInitials(seller.store_name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl md:text-3xl font-bold">{seller.store_name || 'Store'}</h1>
                    {seller.seller_verified && (
                      <Badge className="bg-primary gap-1">
                        <Verified className="w-3 h-3" /> Verified
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-muted-foreground mt-1">{seller.store_description || 'Quality products at great prices'}</p>
                  
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                    {seller.seller_rating && (
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span className="font-semibold text-foreground">{seller.seller_rating.toFixed(1)}</span>
                        Rating
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Package className="w-4 h-4" />
                      <span className="font-semibold text-foreground">{products.length}</span>
                      Products
                    </span>
                    {seller.total_sales && (
                      <span className="flex items-center gap-1">
                        <ShoppingBag className="w-4 h-4" />
                        <span className="font-semibold text-foreground">{seller.total_sales}</span>
                        Sales
                      </span>
                    )}
                    {seller.country && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {seller.city && `${seller.city}, `}{seller.country}
                      </span>
                    )}
                    {seller.created_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Since {format(new Date(seller.created_at), 'MMM yyyy')}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto">
                  <Button 
                    onClick={handleFollow}
                    className={`flex-1 md:flex-none gap-2 ${isFollowing ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-primary text-white'}`}
                    variant={isFollowing ? 'outline' : 'default'}
                  >
                    <Heart className={`w-4 h-4 ${isFollowing ? 'fill-primary' : ''}`} />
                    {isFollowing ? 'Following' : 'Follow'}
                  </Button>
                  <Button variant="outline" className="flex-1 md:flex-none gap-2 border-primary/30 text-primary">
                    <MessageCircle className="w-4 h-4" />
                    Contact
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Products Section */}
        <Tabs defaultValue="products" className="mb-8">
          <TabsList className="bg-background/80 backdrop-blur-sm border border-primary/20 mb-6">
            <TabsTrigger value="products" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Package className="w-4 h-4" />
              Products ({products.length})
            </TabsTrigger>
            <TabsTrigger value="about" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Store className="w-4 h-4" />
              About
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            {loadingProducts ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="h-64 animate-pulse bg-muted/50" />
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="overflow-hidden hover:shadow-lg transition-all border-primary/10 hover:border-primary/30 group">
                      <div className="aspect-square relative overflow-hidden bg-pink-soft/30">
                        {product.images?.[0] ? (
                          <img 
                            src={product.images[0]} 
                            alt={product.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-12 h-12 text-muted-foreground/30" />
                          </div>
                        )}
                        {product.is_featured && (
                          <Badge className="absolute top-2 left-2 bg-gradient-to-r from-amber-500 to-orange-500">
                            <Sparkles className="w-3 h-3 mr-1" /> Featured
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                          {product.title}
                        </h3>
                        <p className="text-lg font-bold text-primary mt-1">
                          ${product.price.toFixed(2)}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Package className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No products yet</h3>
                <p className="text-muted-foreground">This seller hasn't added any products.</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="about">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-3">About the Store</h3>
                <p className="text-muted-foreground">
                  {seller.store_description || seller.bio || 'Welcome to our store! We offer quality products at great prices.'}
                </p>
                
                {seller.website && (
                  <div className="mt-4 flex items-center gap-2 text-sm">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <a href={seller.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {seller.website}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SellerProfileView;
