import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ArrowLeft, Plus, Eye, Heart, Trash2, Users, 
  UserPlus, UserMinus, Image, Clock, MessageCircle,
  BarChart3, Settings
} from 'lucide-react';
import Header from '@/components/Header';
import StatusUploadModal from '@/components/StatusUploadModal';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const StatusManagement = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<any>(null);

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

  // Fetch followers
  const { data: followers = [], isLoading: loadingFollowers } = useQuery({
    queryKey: ['my-followers', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_followers')
        .select(`
          id,
          created_at,
          follower_id,
          profiles!user_followers_follower_id_fkey(id, full_name, avatar_url, bio)
        `)
        .eq('following_id', user?.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch following
  const { data: following = [], isLoading: loadingFollowing } = useQuery({
    queryKey: ['my-following', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_followers')
        .select(`
          id,
          created_at,
          following_id,
          profiles!user_followers_following_id_fkey(id, full_name, avatar_url, bio)
        `)
        .eq('follower_id', user?.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch status views for selected status
  const { data: statusViews = [] } = useQuery({
    queryKey: ['status-views', selectedStatus?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('status_views')
        .select(`
          id,
          viewed_at,
          reacted_with,
          viewer_id
        `)
        .eq('status_id', selectedStatus?.id)
        .order('viewed_at', { ascending: false });
      if (error) throw error;
      
      // Fetch viewer profiles separately
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
      return data || [];
    },
    enabled: !!selectedStatus?.id,
  });

  // Fetch status reactions for selected status
  const { data: statusReactions = [] } = useQuery({
    queryKey: ['status-reactions', selectedStatus?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('status_reactions')
        .select(`
          id,
          reaction_type,
          message,
          created_at,
          user_id
        `)
        .eq('status_id', selectedStatus?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      // Fetch reactor profiles separately
      if (data && data.length > 0) {
        const userIds = data.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);
        
        return data.map(reaction => ({
          ...reaction,
          user: profiles?.find(p => p.id === reaction.user_id)
        }));
      }
      return data || [];
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
  const expiredStatuses = statuses.filter(s => new Date(s.expires_at) <= new Date());
  const totalViews = statuses.reduce((acc, s) => acc + (s.view_count || 0), 0);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-soft via-background to-peach/20">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Login Required</h2>
          <p className="text-muted-foreground mb-4">Please login to manage your statuses and followers.</p>
          <Button onClick={() => navigate('/auth')} className="bg-primary">
            Login Now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-soft via-background to-peach/20">
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Status & Followers</h1>
              <p className="text-sm text-muted-foreground">Manage your content and connections</p>
            </div>
          </div>
          <Button
            onClick={() => setShowUploadModal(true)}
            className="bg-gradient-to-r from-primary to-pink-vibrant gap-2"
          >
            <Plus className="w-4 h-4" />
            New Status
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-primary/10 to-pink-vibrant/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/20">
                  <Image className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeStatuses.length}</p>
                  <p className="text-xs text-muted-foreground">Active Status</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-500/20">
                  <Eye className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalViews}</p>
                  <p className="text-xs text-muted-foreground">Total Views</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/20">
                  <Users className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{followers.length}</p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-purple-500/20">
                  <UserPlus className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{following.length}</p>
                  <p className="text-xs text-muted-foreground">Following</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="statuses" className="space-y-6">
          <TabsList className="bg-background/80 backdrop-blur-sm border border-primary/20 grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="statuses" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Image className="w-4 h-4" />
              Statuses
            </TabsTrigger>
            <TabsTrigger value="followers" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Users className="w-4 h-4" />
              Followers
            </TabsTrigger>
            <TabsTrigger value="following" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <UserPlus className="w-4 h-4" />
              Following
            </TabsTrigger>
          </TabsList>

          {/* Statuses Tab */}
          <TabsContent value="statuses" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Status List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Image className="w-5 h-5 text-primary" />
                    Your Statuses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingStatuses ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                    </div>
                  ) : statuses.length === 0 ? (
                    <div className="text-center py-8">
                      <Image className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground">No statuses yet</p>
                      <Button
                        onClick={() => setShowUploadModal(true)}
                        className="mt-4 gap-2"
                        variant="outline"
                      >
                        <Plus className="w-4 h-4" />
                        Create First Status
                      </Button>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-3">
                        {statuses.map((status: any) => {
                          const isExpired = new Date(status.expires_at) <= new Date();
                          return (
                            <motion.div
                              key={status.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                selectedStatus?.id === status.id
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              } ${isExpired ? 'opacity-60' : ''}`}
                              onClick={() => setSelectedStatus(status)}
                            >
                              <div className="flex items-start gap-3">
                                <div 
                                  className="w-14 h-20 rounded-lg overflow-hidden flex-shrink-0"
                                  style={{ backgroundColor: status.background_color || '#1a1a2e' }}
                                >
                                  {status.content_type === 'image' && status.content_url ? (
                                    <img 
                                      src={status.content_url} 
                                      alt="Status" 
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center p-1">
                                      <p className="text-white text-[8px] text-center line-clamp-3">
                                        {status.text_content}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    {isExpired ? (
                                      <Badge variant="outline" className="text-muted-foreground text-[10px]">
                                        Expired
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-green-500/20 text-green-600 text-[10px]">
                                        Active
                                      </Badge>
                                    )}
                                    <span className="text-[10px] text-muted-foreground">
                                      {formatDistanceToNow(new Date(status.created_at), { addSuffix: true })}
                                    </span>
                                  </div>
                                  {status.caption && (
                                    <p className="text-sm line-clamp-2 mb-2">{status.caption}</p>
                                  )}
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Eye className="w-3 h-3" />
                                      {status.view_count || 0}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {!isExpired && formatDistanceToNow(new Date(status.expires_at))}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              {/* Status Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Status Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedStatus ? (
                    <div className="space-y-4">
                      {/* Preview */}
                      <div 
                        className="aspect-[9/16] max-w-[200px] mx-auto rounded-2xl overflow-hidden"
                        style={{ backgroundColor: selectedStatus.background_color || '#1a1a2e' }}
                      >
                        {selectedStatus.content_type === 'image' && selectedStatus.content_url ? (
                          <img 
                            src={selectedStatus.content_url} 
                            alt="Status" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-4">
                            <p className="text-white text-sm text-center">
                              {selectedStatus.text_content}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Views */}
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          Views ({statusViews.length})
                        </h4>
                        <ScrollArea className="h-32">
                          {statusViews.length > 0 ? (
                            <div className="space-y-2">
                              {statusViews.map((view: any) => (
                                <div key={view.id} className="flex items-center gap-2 text-sm">
                                  <Avatar className="w-6 h-6">
                                    <AvatarImage src={view.viewer?.avatar_url || ''} />
                                    <AvatarFallback className="text-[10px]">
                                      {getInitials(view.viewer?.full_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="flex-1 truncate">{view.viewer?.full_name || 'User'}</span>
                                  {view.reacted_with && (
                                    <span>{view.reacted_with}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground text-sm">No views yet</p>
                          )}
                        </ScrollArea>
                      </div>

                      {/* Reactions */}
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Heart className="w-4 h-4" />
                          Reactions ({statusReactions.length})
                        </h4>
                        <ScrollArea className="h-32">
                          {statusReactions.length > 0 ? (
                            <div className="space-y-2">
                              {statusReactions.map((reaction: any) => (
                                <div key={reaction.id} className="flex items-center gap-2 text-sm">
                                  <Avatar className="w-6 h-6">
                                    <AvatarImage src={reaction.user?.avatar_url || ''} />
                                    <AvatarFallback className="text-[10px]">
                                      {getInitials(reaction.user?.full_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="flex-1 truncate">{reaction.user?.full_name || 'User'}</span>
                                  <span>{reaction.reaction_type}</span>
                                  {reaction.message && (
                                    <MessageCircle className="w-3 h-3 text-primary" />
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground text-sm">No reactions yet</p>
                          )}
                        </ScrollArea>
                      </div>

                      {/* Delete Button */}
                      <Button
                        variant="destructive"
                        onClick={() => deleteStatusMutation.mutate(selectedStatus.id)}
                        disabled={deleteStatusMutation.isPending}
                        className="w-full gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Status
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground">Select a status to view analytics</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Followers Tab */}
          <TabsContent value="followers">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Your Followers ({followers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingFollowers ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                  </div>
                ) : followers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No followers yet</h3>
                    <p className="text-muted-foreground">
                      Share your profile to get more followers!
                    </p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {followers.map((follower: any) => (
                      <motion.div
                        key={follower.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl border border-border hover:border-primary/30 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar 
                            className="w-12 h-12 cursor-pointer"
                            onClick={() => navigate(`/profile/${follower.follower_id}`)}
                          >
                            <AvatarImage src={follower.profiles?.avatar_url || ''} />
                            <AvatarFallback className="bg-gradient-to-br from-primary to-pink-vibrant text-white">
                              {getInitials(follower.profiles?.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p 
                              className="font-medium truncate cursor-pointer hover:text-primary"
                              onClick={() => navigate(`/profile/${follower.follower_id}`)}
                            >
                              {follower.profiles?.full_name || 'User'}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {follower.profiles?.bio || 'No bio'}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Followed {formatDistanceToNow(new Date(follower.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFollowerMutation.mutate(follower.follower_id)}
                            disabled={removeFollowerMutation.isPending}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Following Tab */}
          <TabsContent value="following">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Following ({following.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingFollowing ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                  </div>
                ) : following.length === 0 ? (
                  <div className="text-center py-12">
                    <UserPlus className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Not following anyone</h3>
                    <p className="text-muted-foreground">
                      Follow users to see their status updates!
                    </p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {following.map((follow: any) => (
                      <motion.div
                        key={follow.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl border border-border hover:border-primary/30 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar 
                            className="w-12 h-12 cursor-pointer"
                            onClick={() => navigate(`/profile/${follow.following_id}`)}
                          >
                            <AvatarImage src={follow.profiles?.avatar_url || ''} />
                            <AvatarFallback className="bg-gradient-to-br from-primary to-pink-vibrant text-white">
                              {getInitials(follow.profiles?.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p 
                              className="font-medium truncate cursor-pointer hover:text-primary"
                              onClick={() => navigate(`/profile/${follow.following_id}`)}
                            >
                              {follow.profiles?.full_name || 'User'}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {follow.profiles?.bio || 'No bio'}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Following since {format(new Date(follow.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => unfollowMutation.mutate(follow.following_id)}
                            disabled={unfollowMutation.isPending}
                            className="gap-1"
                          >
                            <UserMinus className="w-4 h-4" />
                            Unfollow
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

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
    </div>
  );
};

export default StatusManagement;
