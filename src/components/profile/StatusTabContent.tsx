import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, Eye, Trash2, Users, UserPlus, UserMinus, 
  Image, Clock, Heart, MessageCircle, BarChart3, Play, Volume2,
  Search, DollarSign, ShoppingBag
} from 'lucide-react';
import StatusUploadModal from '@/components/StatusUploadModal';
import StatusViewer from '@/components/StatusViewer';
import UserSearchModal from '@/components/UserSearchModal';
import StatusEarningsPanel from '@/components/status/StatusEarningsPanel';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// Reusable component for displaying followers/following with WhatsApp-style status
interface FollowerCardProps {
  follower: any;
  type: 'follower' | 'following';
  onViewStatus: (userId: string) => void;
  onViewProfile: (userId: string) => void;
  onRemove: () => void;
  getInitials: (name: string | null) => string;
}

const FollowerCard = ({ follower, type, onViewStatus, onViewProfile, onRemove, getInitials }: FollowerCardProps) => {
  const userId = type === 'follower' ? follower.follower_id : follower.following_id;
  const [hasActiveStatus, setHasActiveStatus] = useState(false);
  const [latestStatusPreview, setLatestStatusPreview] = useState<{
    type: string;
    url?: string;
    text?: string;
    bgColor?: string;
  } | null>(null);

  // Check if user has active status
  useEffect(() => {
    const checkStatus = async () => {
      const { data } = await supabase
        .from('user_statuses')
        .select('content_type, content_url, text_content, background_color')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data) {
        setHasActiveStatus(true);
        setLatestStatusPreview({
          type: data.content_type,
          url: data.content_url,
          text: data.text_content,
          bgColor: data.background_color
        });
      }
    };
    checkStatus();
  }, [userId]);
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
    >
      {/* WhatsApp-style Status Avatar Ring */}
      <div className="relative cursor-pointer" onClick={() => hasActiveStatus ? onViewStatus(userId) : onViewProfile(userId)}>
        {/* Status Ring - gradient ring if has status */}
        <div className={`absolute -inset-[3px] rounded-full ${
          hasActiveStatus 
            ? 'bg-gradient-to-tr from-primary via-pink-500 to-coral animate-pulse' 
            : 'bg-transparent'
        }`} />
        
        {/* Inner white ring for gap effect */}
        <div className="absolute -inset-[2px] rounded-full bg-background" />
        
        {/* Status Preview Circle */}
        <div 
          className="relative h-14 w-14 rounded-full overflow-hidden border-2 border-transparent"
          style={latestStatusPreview?.bgColor ? { backgroundColor: latestStatusPreview.bgColor } : {}}
        >
          {latestStatusPreview?.type === 'image' && latestStatusPreview.url ? (
            <img 
              src={latestStatusPreview.url} 
              alt="Status" 
              className="w-full h-full object-cover"
            />
          ) : latestStatusPreview?.type === 'video' && latestStatusPreview.url ? (
            <div className="relative w-full h-full">
              <video src={latestStatusPreview.url} className="w-full h-full object-cover" muted />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Play className="w-4 h-4 text-white" />
              </div>
            </div>
          ) : latestStatusPreview?.type === 'text' ? (
            <div className="w-full h-full flex items-center justify-center p-1">
              <p className="text-[8px] text-white text-center line-clamp-3">{latestStatusPreview.text}</p>
            </div>
          ) : (
            <Avatar className="h-full w-full">
              <AvatarImage src={follower.profile?.avatar_url || ''} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-pink-vibrant text-white">
                {getInitials(follower.profile?.full_name)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
        
        {/* Online indicator */}
        {hasActiveStatus && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
            <span className="text-[8px] text-white">✓</span>
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p 
          className="font-medium truncate cursor-pointer hover:text-primary"
          onClick={() => onViewProfile(userId)}
        >
          {follower.profile?.full_name || 'User'}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {hasActiveStatus ? (
            <span className="text-primary font-medium">Tap to view status 👆</span>
          ) : (
            follower.profile?.bio || 'No bio'
          )}
        </p>
        <span className="text-[10px] text-muted-foreground">
          {formatDistanceToNow(new Date(follower.created_at), { addSuffix: true })}
        </span>
      </div>
      
      <Button
        size="sm"
        variant="outline"
        className={`gap-1 text-xs ${type === 'follower' ? 'text-destructive hover:text-destructive hover:bg-destructive/10' : ''}`}
        onClick={onRemove}
      >
        <UserMinus className="w-3 h-3" />
        {type === 'follower' ? 'Remove' : 'Unfollow'}
      </Button>
    </motion.div>
  );
};

const StatusTabContent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<any>(null);
  const [viewingStatus, setViewingStatus] = useState<any>(null);
  const [showUserSearch, setShowUserSearch] = useState(false);

  // Fetch user's statuses
  const { data: statuses = [], isLoading: loadingStatuses } = useQuery({
    queryKey: ['my-statuses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_statuses')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch statuses from people I follow (WhatsApp-style)
  const { data: followingStatuses = [] } = useQuery({
    queryKey: ['following-statuses', user?.id],
    queryFn: async () => {
      // First get who I follow
      const { data: followingData, error: followErr } = await supabase
        .from('user_followers')
        .select('following_id')
        .eq('follower_id', user?.id);
      if (followErr || !followingData?.length) return [];

      const followingIds = followingData.map(f => f.following_id);

      // Get active statuses from followed users
      const { data: statusData, error: statusErr } = await supabase
        .from('user_statuses')
        .select('*')
        .in('user_id', followingIds)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      if (statusErr) return [];

      // Get profiles for those users
      const userIds = [...new Set((statusData || []).map(s => s.user_id))];
      if (!userIds.length) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, store_name')
        .in('id', userIds);

      // Group statuses by user
      const grouped = userIds.map(uid => {
        const userStatuses = (statusData || []).filter(s => s.user_id === uid);
        const profile = profiles?.find(p => p.id === uid);
        return {
          id: uid,
          user_id: uid,
          avatar_url: profile?.avatar_url || null,
          full_name: profile?.full_name || 'User',
          store_name: profile?.store_name || null,
          statuses: userStatuses,
          hasUnviewed: true, // Could check status_views table for more accuracy
          latestStatus: userStatuses[0],
        };
      });

      return grouped;
    },
    enabled: !!user?.id,
  });

  // Fetch followers
  const { data: followers = [], isLoading: loadingFollowers } = useQuery({
    queryKey: ['my-followers', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_followers')
        .select('id, created_at, follower_id')
        .eq('following_id', user?.id);
      if (error) throw error;
      
      if (data && data.length > 0) {
        const followerIds = data.map(f => f.follower_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, bio')
          .in('id', followerIds);
        
        return data.map(f => ({
          ...f,
          profile: profiles?.find(p => p.id === f.follower_id)
        }));
      }
      return [];
    },
    enabled: !!user?.id,
  });

  // Fetch following
  const { data: following = [], isLoading: loadingFollowing } = useQuery({
    queryKey: ['my-following', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_followers')
        .select('id, created_at, following_id')
        .eq('follower_id', user?.id);
      if (error) throw error;
      
      if (data && data.length > 0) {
        const followingIds = data.map(f => f.following_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, bio')
          .in('id', followingIds);
        
        return data.map(f => ({
          ...f,
          profile: profiles?.find(p => p.id === f.following_id)
        }));
      }
      return [];
    },
    enabled: !!user?.id,
  });

  // Fetch status views for selected status
  const { data: statusViews = [] } = useQuery({
    queryKey: ['status-views', selectedStatus?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('status_views')
        .select('id, viewed_at, reacted_with, viewer_id')
        .eq('status_id', selectedStatus?.id)
        .order('viewed_at', { ascending: false });
      if (error) throw error;
      
      if (data && data.length > 0) {
        const viewerIds = data.map(v => v.viewer_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', viewerIds);
        
        return data.map(view => ({
          ...view,
          viewer: profiles?.find(p => p.id === view.viewer_id)
        }));
      }
      return [];
    },
    enabled: !!selectedStatus?.id,
  });

  // Delete status mutation
  const deleteStatusMutation = useMutation({
    mutationFn: async (statusId: string) => {
      const { error } = await supabase
        .from('user_statuses')
        .delete()
        .eq('id', statusId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Status deleted');
      setSelectedStatus(null);
      queryClient.invalidateQueries({ queryKey: ['my-statuses'] });
    },
    onError: () => {
      toast.error('Failed to delete status');
    },
  });

  // Unfollow mutation
  const unfollowMutation = useMutation({
    mutationFn: async (followingId: string) => {
      const { error } = await supabase
        .from('user_followers')
        .delete()
        .eq('follower_id', user?.id)
        .eq('following_id', followingId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Unfollowed');
      queryClient.invalidateQueries({ queryKey: ['my-following'] });
    },
    onError: () => {
      toast.error('Failed to unfollow');
    },
  });

  // Remove follower mutation
  const removeFollowerMutation = useMutation({
    mutationFn: async (followerId: string) => {
      const { error } = await supabase
        .from('user_followers')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Follower removed');
      queryClient.invalidateQueries({ queryKey: ['my-followers'] });
    },
    onError: () => {
      toast.error('Failed to remove follower');
    },
  });

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const activeStatuses = statuses.filter(s => new Date(s.expires_at) > new Date());
  const totalViews = statuses.reduce((acc, s) => acc + (s.view_count || 0), 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-gradient-to-br from-primary/10 to-pink-vibrant/10 rounded-xl p-3 text-center border border-primary/20">
          <Image className="w-5 h-5 mx-auto text-primary mb-1" />
          <p className="text-xl font-bold">{activeStatuses.length}</p>
          <p className="text-[10px] text-muted-foreground">Active</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl p-3 text-center border border-blue-500/20">
          <Eye className="w-5 h-5 mx-auto text-blue-500 mb-1" />
          <p className="text-xl font-bold">{totalViews}</p>
          <p className="text-[10px] text-muted-foreground">Views</p>
        </div>
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-3 text-center border border-green-500/20">
          <Users className="w-5 h-5 mx-auto text-green-500 mb-1" />
          <p className="text-xl font-bold">{followers.length}</p>
          <p className="text-[10px] text-muted-foreground">Followers</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 rounded-xl p-3 text-center border border-purple-500/20">
          <UserPlus className="w-5 h-5 mx-auto text-purple-500 mb-1" />
          <p className="text-xl font-bold">{following.length}</p>
          <p className="text-[10px] text-muted-foreground">Following</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <Button 
          onClick={() => setShowUploadModal(true)}
          className="flex-1 gap-2 bg-gradient-to-r from-primary to-pink-vibrant hover:opacity-90 h-12"
        >
          <Plus className="w-5 h-5" />
          Create Status
        </Button>
        <Button 
          onClick={() => setShowUserSearch(true)}
          variant="outline"
          className="gap-2 h-12 border-primary/30 hover:bg-primary/10"
        >
          <Search className="w-5 h-5" />
          Find People
        </Button>
      </div>

      {/* Sub Tabs */}
      <Tabs defaultValue="my-statuses" className="space-y-4">
        <TabsList className="bg-background/80 backdrop-blur-sm border border-primary/20 grid grid-cols-4 w-full">
          <TabsTrigger value="my-statuses" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-white">
            <Image className="w-3 h-3 mr-1" />
            Statuses
          </TabsTrigger>
          <TabsTrigger value="earnings" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-white">
            <DollarSign className="w-3 h-3 mr-1" />
            Earnings
          </TabsTrigger>
          <TabsTrigger value="followers" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-white">
            <Users className="w-3 h-3 mr-1" />
            Followers
          </TabsTrigger>
          <TabsTrigger value="following" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-white">
            <UserPlus className="w-3 h-3 mr-1" />
            Following
          </TabsTrigger>
        </TabsList>

        {/* Earnings Tab */}
        <TabsContent value="earnings">
          <StatusEarningsPanel />
        </TabsContent>

        {/* My Statuses Tab */}
        <TabsContent value="my-statuses">
          {/* WhatsApp-style horizontal status row from people I follow */}
          {followingStatuses.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Recent Updates
              </h3>
              <ScrollArea className="w-full">
                <div className="flex gap-4 pb-3">
                  {followingStatuses.map((userGroup: any) => (
                    <div
                      key={userGroup.id}
                      className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0"
                      onClick={() => setViewingStatus(userGroup)}
                    >
                      {/* Status ring */}
                      <div className="relative">
                        <div className={`absolute -inset-[3px] rounded-full ${
                          userGroup.hasUnviewed
                            ? 'bg-gradient-to-tr from-primary via-pink-500 to-amber-500'
                            : 'bg-muted-foreground/30'
                        }`} />
                        <div className="absolute -inset-[1.5px] rounded-full bg-background" />
                        <div className="relative h-16 w-16 rounded-full overflow-hidden">
                          {userGroup.latestStatus?.content_type === 'image' && userGroup.latestStatus?.content_url ? (
                            <img
                              src={userGroup.latestStatus.content_url}
                              alt="Status"
                              className="w-full h-full object-cover"
                            />
                          ) : userGroup.latestStatus?.content_type === 'video' && userGroup.latestStatus?.content_url ? (
                            <div className="relative w-full h-full">
                              <video src={userGroup.latestStatus.content_url} className="w-full h-full object-cover" muted />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <Play className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          ) : userGroup.latestStatus?.content_type === 'text' ? (
                            <div
                              className="w-full h-full flex items-center justify-center p-1"
                              style={{ backgroundColor: userGroup.latestStatus.background_color || '#1a1a2e' }}
                            >
                              <p className="text-[7px] text-white text-center line-clamp-3">{userGroup.latestStatus.text_content}</p>
                            </div>
                          ) : (
                            <Avatar className="h-full w-full">
                              <AvatarImage src={userGroup.avatar_url || ''} />
                              <AvatarFallback className="bg-gradient-to-br from-primary to-pink-vibrant text-white">
                                {getInitials(userGroup.full_name)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                        {/* Status count badge */}
                        {userGroup.statuses.length > 1 && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center border-2 border-background font-bold">
                            {userGroup.statuses.length}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[70px] text-center">
                        {userGroup.full_name?.split(' ')[0] || 'User'}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {loadingStatuses ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
          ) : statuses.length === 0 ? (
            <Card className="border-dashed border-2 border-primary/30">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Image className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">No statuses yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Share your first status update with your followers!
                </p>
                <Button onClick={() => setShowUploadModal(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Status
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* WhatsApp Style Status Grid */}
              <div className="grid grid-cols-3 gap-3">
                {statuses.map((status: any) => {
                  const isExpired = new Date(status.expires_at) <= new Date();
                  return (
                    <motion.div
                      key={status.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer group ${
                        isExpired ? 'opacity-60' : ''
                      }`}
                      style={{ backgroundColor: status.background_color || '#1a1a2e' }}
                      onClick={() => setSelectedStatus(status)}
                    >
                      {status.content_type === 'image' && status.content_url ? (
                        <img 
                          src={status.content_url} 
                          alt="Status" 
                          className="w-full h-full object-cover"
                        />
                      ) : status.content_type === 'video' && status.content_url ? (
                        <div className="relative w-full h-full">
                          <video 
                            src={status.content_url}
                            className="w-full h-full object-cover"
                            muted
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Play className="w-8 h-8 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-3">
                          <p className="text-white text-sm text-center line-clamp-6">
                            {status.text_content}
                          </p>
                        </div>
                      )}
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
                      
                      {/* Status Badge */}
                      <div className="absolute top-2 left-2">
                        {isExpired ? (
                          <Badge variant="secondary" className="text-[10px] bg-black/50">
                            Expired
                          </Badge>
                        ) : (
                          <Badge className="text-[10px] bg-green-500/80">
                            Active
                          </Badge>
                        )}
                      </div>
                      
                      {/* Stats */}
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="flex items-center justify-between text-white text-[10px]">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-0.5">
                              <Eye className="w-3 h-3" />
                              {status.view_count || 0}
                            </span>
                          </div>
                          <span>{formatDistanceToNow(new Date(status.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>

                      {/* Hover Actions */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingStatus({
                              id: user?.id || '',
                              user_id: user?.id || '',
                              avatar_url: null,
                              full_name: 'My Status',
                              store_name: null,
                              statuses: [status],
                              hasUnviewed: false
                            });
                          }}
                        >
                          <Eye className="w-5 h-5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10 rounded-full bg-red-500/50 hover:bg-red-500/70 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteStatusMutation.mutate(status.id);
                          }}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Selected Status Analytics */}
              <AnimatePresence>
                {selectedStatus && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                  >
                    <Card className="border-primary/20">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-primary" />
                            Status Analytics
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedStatus(null)}
                          >
                            Close
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="p-3 rounded-lg bg-muted/50 text-center">
                            <Eye className="w-5 h-5 mx-auto text-primary mb-1" />
                            <p className="text-xl font-bold">{statusViews.length}</p>
                            <p className="text-xs text-muted-foreground">Unique Views</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50 text-center">
                            <Heart className="w-5 h-5 mx-auto text-pink-500 mb-1" />
                            <p className="text-xl font-bold">
                              {statusViews.filter(v => v.reacted_with).length}
                            </p>
                            <p className="text-xs text-muted-foreground">Reactions</p>
                          </div>
                        </div>

                        {/* Viewers List */}
                        <div className="space-y-2">
                          <p className="text-sm font-medium mb-2">Recent Viewers</p>
                          {statusViews.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No views yet
                            </p>
                          ) : (
                            <ScrollArea className="h-[150px]">
                              <div className="space-y-2">
                                {statusViews.slice(0, 10).map((view: any) => (
                                  <div key={view.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={view.viewer?.avatar_url || ''} />
                                      <AvatarFallback className="text-xs bg-primary/20">
                                        {getInitials(view.viewer?.full_name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">
                                        {view.viewer?.full_name || 'Anonymous'}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {formatDistanceToNow(new Date(view.viewed_at), { addSuffix: true })}
                                      </p>
                                    </div>
                                    {view.reacted_with && (
                                      <span className="text-lg">{view.reacted_with}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* Followers Tab */}
        <TabsContent value="followers">
          {loadingFollowers ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
          ) : followers.length === 0 ? (
            <Card className="border-dashed border-2 border-muted">
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <h3 className="font-semibold mb-2">No followers yet</h3>
                <p className="text-sm text-muted-foreground">
                  Share your profile to get followers!
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {followers.map((follower: any) => (
                  <FollowerCard 
                    key={follower.id}
                    follower={follower}
                    type="follower"
                    onViewStatus={async (userId: string) => {
                      // Fetch follower's statuses and open viewer
                      const { data: userStatuses, error } = await supabase
                        .from('user_statuses')
                        .select('*')
                        .eq('user_id', userId)
                        .gt('expires_at', new Date().toISOString())
                        .order('created_at', { ascending: false });
                      
                      if (error || !userStatuses?.length) {
                        toast.error('No active statuses');
                        return;
                      }

                      setViewingStatus({
                        id: userId,
                        user_id: userId,
                        avatar_url: follower.profile?.avatar_url || null,
                        full_name: follower.profile?.full_name || 'User',
                        store_name: null,
                        statuses: userStatuses,
                        hasUnviewed: true
                      });
                    }}
                    onViewProfile={(userId: string) => navigate(`/profile/${userId}`)}
                    onRemove={() => removeFollowerMutation.mutate(follower.follower_id)}
                    getInitials={getInitials}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* Following Tab */}
        <TabsContent value="following">
          {loadingFollowing ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
          ) : following.length === 0 ? (
            <Card className="border-dashed border-2 border-muted">
              <CardContent className="p-8 text-center">
                <UserPlus className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <h3 className="font-semibold mb-2">Not following anyone</h3>
                <p className="text-sm text-muted-foreground">
                  Follow users to see their status updates!
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {following.map((follow: any) => (
                  <FollowerCard 
                    key={follow.id}
                    follower={follow}
                    type="following"
                    onViewStatus={async (userId: string) => {
                      // Fetch following user's statuses and open viewer
                      const { data: userStatuses, error } = await supabase
                        .from('user_statuses')
                        .select('*')
                        .eq('user_id', userId)
                        .gt('expires_at', new Date().toISOString())
                        .order('created_at', { ascending: false });
                      
                      if (error || !userStatuses?.length) {
                        toast.error('No active statuses');
                        return;
                      }

                      setViewingStatus({
                        id: userId,
                        user_id: userId,
                        avatar_url: follow.profile?.avatar_url || null,
                        full_name: follow.profile?.full_name || 'User',
                        store_name: null,
                        statuses: userStatuses,
                        hasUnviewed: true
                      });
                    }}
                    onViewProfile={(userId: string) => navigate(`/profile/${userId}`)}
                    onRemove={() => unfollowMutation.mutate(follow.following_id)}
                    getInitials={getInitials}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* Status Upload Modal */}
      {showUploadModal && (
        <StatusUploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            queryClient.invalidateQueries({ queryKey: ['my-statuses'] });
          }}
        />
      )}

      {/* Status Viewer */}
      {viewingStatus && (
        <StatusViewer
          user={viewingStatus}
          onClose={() => setViewingStatus(null)}
          onNext={() => setViewingStatus(null)}
        />
      )}

      {/* User Search Modal */}
      {showUserSearch && (
        <UserSearchModal
          onClose={() => setShowUserSearch(false)}
        />
      )}
    </motion.div>
  );
};

export default StatusTabContent;
