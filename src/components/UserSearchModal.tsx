import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Search, X, UserPlus, UserCheck, Verified, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface UserSearchModalProps {
  onClose: () => void;
}

const UserSearchModal = ({ onClose }: UserSearchModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['search-users', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .not('id', 'eq', user?.id || '');
      
      if (searchQuery.trim()) {
        const q = searchQuery.trim();
        query = query.or(`full_name.ilike.%${q}%,store_name.ilike.%${q}%,email.ilike.%${q}%`);
      }
      
      const { data, error } = await query
        .order('followers_count', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch current following list
  const { data: following = [] } = useQuery({
    queryKey: ['my-following-ids', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_followers')
        .select('following_id')
        .eq('follower_id', user?.id);
      if (error) throw error;
      return data?.map(f => f.following_id) || [];
    },
    enabled: !!user?.id,
  });

  // Helper to send email notifications about follow/unfollow events
  const notifyFollowEvent = async (targetUserId: string, template: 'new_follower' | 'unfollow') => {
    try {
      const [{ data: target }, { data: actor }] = await Promise.all([
        supabase.from('profiles').select('email, full_name').eq('id', targetUserId).maybeSingle(),
        supabase.from('profiles').select('full_name').eq('id', user?.id || '').maybeSingle(),
      ]);
      if (!target?.email) return;
      await supabase.functions.invoke('send-user-email', {
        body: {
          to: target.email,
          template,
          data: { actorName: actor?.full_name || 'Someone', actorId: user?.id },
        },
      });
    } catch (e) {
      console.warn('Follow email notify failed', e);
    }
  };

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_followers')
        .insert({
          follower_id: user?.id,
          following_id: userId
        });
      if (error) throw error;
      await notifyFollowEvent(userId, 'new_follower');
    },
    onSuccess: () => {
      toast.success('Following!');
      queryClient.invalidateQueries({ queryKey: ['my-following-ids'] });
      queryClient.invalidateQueries({ queryKey: ['my-following'] });
    },
    onError: () => {
      toast.error('Failed to follow');
    },
  });

  // Unfollow mutation
  const unfollowMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_followers')
        .delete()
        .eq('follower_id', user?.id)
        .eq('following_id', userId);
      if (error) throw error;
      await notifyFollowEvent(userId, 'unfollow');
    },
    onSuccess: () => {
      toast.success('Unfollowed');
      queryClient.invalidateQueries({ queryKey: ['my-following-ids'] });
      queryClient.invalidateQueries({ queryKey: ['my-following'] });
    },
    onError: () => {
      toast.error('Failed to unfollow');
    },
  });

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isFollowing = (userId: string) => following.includes(userId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-white font-semibold">Find People</h2>
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

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or store..."
            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
            autoFocus
          />
        </div>
      </div>

      {/* User List */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-2 pb-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/60 text-sm">No users found</p>
            </div>
          ) : (
            users.map((profile: any) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <Link 
                  to={`/profile/${profile.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 flex-1"
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12 ring-2 ring-white/20">
                      <AvatarImage src={profile.avatar_url || profile.store_logo_url || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-pink-vibrant text-white text-sm font-bold">
                        {getInitials(profile.full_name || profile.store_name)}
                      </AvatarFallback>
                    </Avatar>
                    {profile.seller_verified && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Verified className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium text-sm truncate">
                        {profile.full_name || profile.store_name || 'User'}
                      </p>
                      {profile.is_seller && (
                        <Badge variant="secondary" className="text-[10px] bg-primary/20 text-primary">
                          Seller
                        </Badge>
                      )}
                    </div>
                    <p className="text-white/60 text-xs truncate">
                      {profile.bio || (profile.is_seller ? profile.store_description : 'No bio')}
                    </p>
                    <p className="text-white/40 text-[10px]">
                      {profile.followers_count || 0} followers
                    </p>
                  </div>
                </Link>
                
                {/* Follow Button */}
                {user && (
                  <Button
                    size="sm"
                    variant={isFollowing(profile.id) ? "outline" : "default"}
                    onClick={() => {
                      if (isFollowing(profile.id)) {
                        unfollowMutation.mutate(profile.id);
                      } else {
                        followMutation.mutate(profile.id);
                      }
                    }}
                    disabled={followMutation.isPending || unfollowMutation.isPending}
                    className={isFollowing(profile.id) 
                      ? "border-white/20 text-white hover:bg-white/10" 
                      : "bg-primary hover:bg-primary/90"
                    }
                  >
                    {isFollowing(profile.id) ? (
                      <>
                        <UserCheck className="w-4 h-4 mr-1" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-1" />
                        Follow
                      </>
                    )}
                  </Button>
                )}
              </motion.div>
            ))
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
};

export default UserSearchModal;
