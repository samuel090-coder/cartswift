import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Heart, MessageCircle, Share2, ShoppingBag, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FeedPost {
  id: string;
  type: 'product' | 'status' | 'reel';
  user: { name: string; avatar?: string; verified?: boolean };
  image: string;
  caption: string;
  likes: number;
  comments: number;
  price?: number;
  currency?: string;
}

const SocialFeed = () => {
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['social-feed'],
    queryFn: async (): Promise<FeedPost[]> => {
      // Fetch items and transform them into feed posts
      const { data: items } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(12);

      return (items || []).map((item, i) => ({
        id: item.id,
        type: i % 3 === 0 ? 'reel' : 'product',
        user: {
          name: 'CartSwift Store',
          avatar: undefined,
          verified: true,
        },
        image: item.images?.[0] || '/placeholder.svg',
        caption: item.description || item.title,
        likes: Math.floor(Math.random() * 5000) + 100,
        comments: Math.floor(Math.random() * 200) + 10,
        price: Number(item.price),
        currency: item.currency || 'USD',
      }));
    },
  });

  const toggleLike = (postId: string) => {
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const getCurrencySymbol = (c: string) => {
    const s: Record<string, string> = { USD: '$', NGN: '₦', EUR: '€', GBP: '£' };
    return s[c] || c;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-card rounded-xl animate-pulse border border-border/30">
            <div className="h-10 bg-secondary rounded-t-xl" />
            <div className="aspect-square bg-secondary" />
            <div className="h-20 bg-secondary rounded-b-xl" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground">📱 Feed</h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="text-xs text-primary">For You</Button>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">Following</Button>
        </div>
      </div>

      {posts.map((post, index) => (
        <motion.div
          key={post.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card className="overflow-hidden border border-border/50 bg-card">
            {/* Post Header */}
            <div className="flex items-center gap-3 p-3">
              <Avatar className="h-8 w-8 border border-primary/30">
                <AvatarImage src={post.user.avatar} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">CS</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-foreground">{post.user.name}</span>
                  {post.user.verified && <span className="text-neon-cyan text-xs">✓</span>}
                </div>
                <span className="text-xs text-muted-foreground">Sponsored</span>
              </div>
              {post.price && (
                <span className="text-sm font-bold text-neon-emerald">
                  {getCurrencySymbol(post.currency || 'USD')}{post.price.toFixed(2)}
                </span>
              )}
            </div>

            {/* Post Image */}
            <div className="relative aspect-square bg-secondary">
              <img
                src={post.image}
                alt={post.caption}
                className="w-full h-full object-cover"
              />
              {post.type === 'reel' && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/20">
                  <div className="h-14 w-14 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center">
                    <Play className="h-6 w-6 text-foreground fill-foreground ml-1" />
                  </div>
                </div>
              )}
              {post.price && (
                <Button size="sm" className="absolute bottom-3 right-3 btn-premium text-xs gap-1">
                  <ShoppingBag className="h-3 w-3" />
                  Shop
                </Button>
              )}
            </div>

            {/* Post Actions */}
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleLike(post.id)}
                  className="transition-transform active:scale-125"
                >
                  <Heart className={cn(
                    "h-6 w-6 transition-colors",
                    likedPosts.has(post.id) ? "fill-destructive text-destructive" : "text-foreground"
                  )} />
                </button>
                <button>
                  <MessageCircle className="h-6 w-6 text-foreground" />
                </button>
                <button>
                  <Share2 className="h-6 w-6 text-foreground" />
                </button>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {(likedPosts.has(post.id) ? post.likes + 1 : post.likes).toLocaleString()} likes
              </p>
              <p className="text-sm text-foreground line-clamp-2">
                <span className="font-semibold">{post.user.name}</span>{' '}
                {post.caption}
              </p>
              <p className="text-xs text-muted-foreground">
                View all {post.comments} comments
              </p>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default SocialFeed;
