import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Heart, MessageCircle, Share2, ShoppingBag, Play, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface FeedPost {
  id: string;
  source: 'item' | 'seller_product';
  type: 'product' | 'status' | 'reel';
  user: { name: string; avatar?: string; verified?: boolean; id?: string };
  image: string;
  caption: string;
  likes: number;
  comments: number;
  price?: number;
  currency?: string;
}

const SocialFeed = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // Fetch posts from both items and seller_products
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['social-feed'],
    queryFn: async (): Promise<FeedPost[]> => {
      // Fetch admin items
      const { data: items } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(12);

      // Fetch approved seller products with seller profile
      const { data: sellerProducts } = await supabase
        .from('seller_products')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(12);

      // Get seller profiles for seller products
      const sellerIds = [...new Set((sellerProducts || []).map(p => p.seller_id))];
      let sellerProfiles: Record<string, any> = {};
      if (sellerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, store_name, seller_verified')
          .in('id', sellerIds);
        profiles?.forEach(p => { sellerProfiles[p.id] = p; });
      }

      const adminPosts: FeedPost[] = (items || []).map((item) => ({
        id: item.id,
        source: 'item' as const,
        type: 'product' as const,
        user: { name: 'CartSwift Store', avatar: undefined, verified: true, id: undefined },
        image: item.images?.[0] || '/placeholder.svg',
        caption: item.description || item.title,
        likes: 0,
        comments: 0,
        price: Number(item.price),
        currency: item.currency || 'USD',
      }));

      const sellerPosts: FeedPost[] = (sellerProducts || []).map((product) => {
        const profile = sellerProfiles[product.seller_id];
        return {
          id: product.id,
          source: 'seller_product' as const,
          type: 'product' as const,
          user: {
            name: profile?.store_name || profile?.full_name || 'Seller',
            avatar: profile?.avatar_url || undefined,
            verified: profile?.seller_verified || false,
            id: product.seller_id,
          },
          image: product.images?.[0] || '/placeholder.svg',
          caption: product.description || product.title,
          likes: 0,
          comments: 0,
          price: Number(product.price),
          currency: product.currency || 'USD',
        };
      });

      // Interleave posts: seller, admin, seller, admin...
      const merged: FeedPost[] = [];
      const maxLen = Math.max(adminPosts.length, sellerPosts.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < sellerPosts.length) merged.push(sellerPosts[i]);
        if (i < adminPosts.length) merged.push(adminPosts[i]);
      }
      return merged;
    },
  });

  // Fetch user's likes
  const { data: userLikes = [] } = useQuery({
    queryKey: ['user-likes', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('post_likes')
        .select('item_id')
        .eq('user_id', user!.id);
      return data?.map(l => l.item_id) || [];
    },
  });

  // Fetch like counts
  const { data: likeCounts = {} } = useQuery({
    queryKey: ['like-counts'],
    queryFn: async () => {
      const { data } = await supabase.from('post_likes').select('item_id');
      const counts: Record<string, number> = {};
      data?.forEach(l => { counts[l.item_id] = (counts[l.item_id] || 0) + 1; });
      return counts;
    },
  });

  // Fetch comments
  const { data: allComments = {} } = useQuery({
    queryKey: ['post-comments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('post_comments')
        .select('*, profiles:user_id(full_name, avatar_url)')
        .order('created_at', { ascending: true });
      const grouped: Record<string, any[]> = {};
      data?.forEach(c => {
        if (!grouped[c.item_id]) grouped[c.item_id] = [];
        grouped[c.item_id].push(c);
      });
      return grouped;
    },
  });

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async (itemId: string) => {
      if (!user) throw new Error('Not authenticated');
      const isLiked = userLikes.includes(itemId);
      if (isLiked) {
        await supabase.from('post_likes').delete().eq('item_id', itemId).eq('user_id', user.id);
      } else {
        await supabase.from('post_likes').insert({ item_id: itemId, user_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-likes'] });
      queryClient.invalidateQueries({ queryKey: ['like-counts'] });
    },
  });

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async ({ itemId, text }: { itemId: string; text: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('post_comments').insert({ item_id: itemId, user_id: user.id, text });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments'] });
      setCommentText('');
    },
  });

  const toggleLike = (postId: string) => {
    if (!user) { toast({ title: 'Sign in to like posts', variant: 'destructive' }); return; }
    likeMutation.mutate(postId);
  };

  const addComment = (postId: string) => {
    if (!user) { toast({ title: 'Sign in to comment', variant: 'destructive' }); return; }
    if (!commentText.trim()) return;
    commentMutation.mutate({ itemId: postId, text: commentText });
  };

  const startChat = (post: FeedPost) => {
    if (!user) { toast({ title: 'Sign in to message sellers', variant: 'destructive' }); return; }
    if (!post.user.id) {
      toast({ title: 'This is a store post', description: 'No direct seller to message.' });
      return;
    }
    navigate(`/messages?seller=${post.user.id}`);
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

      {posts.map((post, index) => {
        const isLiked = userLikes.includes(post.id);
        const likeCount = likeCounts[post.id] || 0;
        const comments = allComments[post.id] || [];
        const isSeller = post.source === 'seller_product' && !!post.user.id;

        return (
          <motion.div key={`${post.source}-${post.id}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
            <Card className="overflow-hidden border border-border/50 bg-card">
              {/* Header */}
              <div
                className={cn("flex items-center gap-3 p-3", isSeller && "cursor-pointer hover:bg-secondary/30")}
                onClick={() => isSeller && navigate(`/seller-profile/${post.user.id}`)}
              >
                <Avatar className={cn("h-8 w-8 border", isSeller ? "border-primary" : "border-border/30")}>
                  <AvatarImage src={post.user.avatar} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {post.user.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-foreground">{post.user.name}</span>
                    {post.user.verified && <span className="text-neon-cyan text-xs">✓</span>}
                    {isSeller && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full ml-1">Seller</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {isSeller ? 'Seller Post' : 'Sponsored'}
                  </span>
                </div>
                {post.price && (
                  <span className="text-sm font-bold text-neon-emerald">
                    {getCurrencySymbol(post.currency || 'USD')}{post.price.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Image */}
              <div
                className="relative aspect-square bg-secondary cursor-pointer select-none"
                onDoubleClick={() => toggleLike(post.id)}
              >
                <img src={post.image} alt={post.caption} className="w-full h-full object-cover" />
                {post.type === 'reel' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/20">
                    <div className="h-14 w-14 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center">
                      <Play className="h-6 w-6 text-foreground fill-foreground ml-1" />
                    </div>
                  </div>
                )}
                {post.price && (
                  <Button size="sm" className="absolute bottom-3 right-3 btn-premium text-xs gap-1">
                    <ShoppingBag className="h-3 w-3" /> Shop
                  </Button>
                )}
              </div>

              {/* Actions */}
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <motion.button onClick={() => toggleLike(post.id)} whileTap={{ scale: 1.3 }}>
                    <Heart className={cn("h-6 w-6 transition-colors", isLiked ? "fill-destructive text-destructive" : "text-foreground")} />
                  </motion.button>
                  <button onClick={() => setOpenComments(prev => prev === post.id ? null : post.id)}>
                    <MessageCircle className={cn("h-6 w-6", openComments === post.id ? "text-primary" : "text-foreground")} />
                  </button>
                  <button><Share2 className="h-6 w-6 text-foreground" /></button>
                  {isSeller && (
                    <div className="ml-auto">
                      <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => startChat(post)}>
                        <Send className="h-3 w-3" /> DM Seller
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-sm font-semibold text-foreground">{likeCount.toLocaleString()} likes</p>
                <p className="text-sm text-foreground line-clamp-2">
                  <span className="font-semibold">{post.user.name}</span> {post.caption}
                </p>
                <button onClick={() => setOpenComments(prev => prev === post.id ? null : post.id)} className="text-xs text-muted-foreground">
                  View all {comments.length} comments
                </button>

                {/* Comments */}
                <AnimatePresence>
                  {openComments === post.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="pt-2 border-t border-border/30 space-y-2 max-h-48 overflow-y-auto">
                        {comments.map((c: any) => (
                          <div key={c.id} className="flex gap-2 items-start">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={c.profiles?.avatar_url} />
                              <AvatarFallback className="text-[10px] bg-secondary text-foreground">
                                {(c.profiles?.full_name || 'U')[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-xs text-foreground">
                                <span className="font-semibold">{c.profiles?.full_name || 'User'}</span> {c.text}
                              </p>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(c.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={(e) => { e.preventDefault(); addComment(post.id); }} className="flex gap-2 mt-2">
                        <Input
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Add a comment..."
                          className="flex-1 h-8 text-xs bg-secondary border-border/50"
                        />
                        <Button type="submit" size="icon" className="h-8 w-8 shrink-0" disabled={!commentText.trim()}>
                          <Send className="h-3 w-3" />
                        </Button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};

export default SocialFeed;
