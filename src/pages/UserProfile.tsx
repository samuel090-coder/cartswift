import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, User, MapPin, Globe, Calendar, Users,
  Verified, Package, MessageCircle, Heart, Share2, 
  UserPlus, UserMinus, Image, Plus, Settings, Play
} from 'lucide-react';
import Header from '@/components/Header';
import StatusUploadModal from '@/components/StatusUploadModal';
import StatusViewer from '@/components/StatusViewer';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showStatusUpload, setShowStatusUpload] = useState(false);
  const [viewingStatus, setViewingStatus] = useState<any>(null);
  // Fetch user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Check if current user is following this user
  const { data: isFollowing = false, refetch: refetchFollowing } = useQuery({
    queryKey: ['is-following', user?.id, userId],
    queryFn: async () => {
      if (!user || user.id === userId) return false;
      const { data, error } = await supabase
        .from('user_followers')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!userId && user.id !== userId,
  });

  // Fetch user's statuses
  const { data: statuses = [] } = useQuery({
    queryKey: ['user-statuses', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_statuses')
        .select('*')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Please log in');
      
      const { error } = await supabase
        .from('user_followers')
        .insert({
          follower_id: user.id,
          following_id: userId
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Following! 💕');
      refetchFollowing();
      queryClient.invalidateQueries({ queryKey: ['user-profile', userId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to follow');
    },
  });

  // Unfollow mutation
  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Please log in');
      
      const { error } = await supabase
        .from('user_followers')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Unfollowed');
      refetchFollowing();
      queryClient.invalidateQueries({ queryKey: ['user-profile', userId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to unfollow');
    },
  });

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleShare = () => {
    navigator.share?.({
      title: profile?.full_name || 'User Profile',
      url: window.location.href,
    }).catch(() => {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied! 📋');
    });
  };

  const isOwnProfile = user?.id === userId;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-soft via-background to-peach/20">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-soft via-background to-peach/20">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">User not found</h2>
          <p className="text-muted-foreground mb-4">This profile doesn't exist.</p>
          <Button onClick={() => navigate('/')} className="bg-primary">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
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
        style={profile.background_image_url ? {
          backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.1)), url(${profile.background_image_url})`,
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
        {/* User Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-lg bg-background/95 backdrop-blur-sm mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <Avatar className="h-24 w-24 border-4 border-background ring-4 ring-primary/20 shadow-lg">
                  <AvatarImage src={profile.avatar_url || ''} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-pink-vibrant text-white text-2xl font-bold">
                    {getInitials(profile.full_name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl md:text-3xl font-bold">{profile.full_name || 'User'}</h1>
                    {profile.seller_verified && (
                      <Badge className="bg-primary gap-1">
                        <Verified className="w-3 h-3" /> Verified
                      </Badge>
                    )}
                  </div>
                  
                  {profile.bio && (
                    <p className="text-muted-foreground mt-1">{profile.bio}</p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span className="font-semibold text-foreground">{profile.followers_count || 0}</span>
                      Followers
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span className="font-semibold text-foreground">{profile.following_count || 0}</span>
                      Following
                    </span>
                    {profile.country && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {profile.city && `${profile.city}, `}{profile.country}
                      </span>
                    )}
                    {profile.created_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Joined {format(new Date(profile.created_at), 'MMM yyyy')}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Follow/Unfollow Button - Always visible for other users */}
                {!isOwnProfile && (
                  <div className="flex gap-2 w-full md:w-auto">
                    {user ? (
                      <>
                        <Button 
                          onClick={() => isFollowing ? unfollowMutation.mutate() : followMutation.mutate()}
                          disabled={followMutation.isPending || unfollowMutation.isPending}
                          className={`flex-1 md:flex-none gap-2 ${isFollowing ? 'bg-muted text-foreground hover:bg-muted/80' : 'bg-gradient-to-r from-primary to-pink-vibrant text-white hover:opacity-90'}`}
                          variant={isFollowing ? 'secondary' : 'default'}
                        >
                          {followMutation.isPending || unfollowMutation.isPending ? (
                            <span className="animate-pulse">...</span>
                          ) : isFollowing ? (
                            <>
                              <UserMinus className="w-4 h-4" />
                              Following
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4" />
                              Follow
                            </>
                          )}
                        </Button>
                        <Button variant="outline" className="flex-1 md:flex-none gap-2 border-primary/30 text-primary hover:bg-primary/10">
                          <MessageCircle className="w-4 h-4" />
                          Message
                        </Button>
                      </>
                    ) : (
                      <Button 
                        onClick={() => navigate('/auth')}
                        className="flex-1 md:flex-none gap-2 bg-gradient-to-r from-primary to-pink-vibrant text-white"
                      >
                        <UserPlus className="w-4 h-4" />
                        Login to Follow
                      </Button>
                    )}
                  </div>
                )}

                {/* Manage Status & Followers for Own Profile */}
                {isOwnProfile && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowStatusUpload(true)}
                      className="bg-gradient-to-r from-primary to-pink-vibrant gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Status
                    </Button>
                    <Button
                      onClick={() => navigate('/status-management')}
                      variant="outline"
                      className="gap-2 border-primary/30"
                    >
                      <Settings className="w-4 h-4" />
                      Manage
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Content Tabs */}
        <Tabs defaultValue="statuses" className="mb-8">
          <TabsList className="bg-background/80 backdrop-blur-sm border border-primary/20 mb-6">
            <TabsTrigger value="statuses" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Image className="w-4 h-4" />
              Statuses ({statuses.length})
            </TabsTrigger>
            <TabsTrigger value="about" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <User className="w-4 h-4" />
              About
            </TabsTrigger>
          </TabsList>

          <TabsContent value="statuses">
            {statuses.length > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {statuses.map((status: any, index) => (
                  <motion.div
                    key={status.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="aspect-[9/16] rounded-xl overflow-hidden relative bg-muted cursor-pointer hover:ring-2 ring-primary transition-all group"
                    style={{ backgroundColor: status.background_color || undefined }}
                    onClick={() => {
                      setViewingStatus({
                        id: userId,
                        user_id: userId,
                        avatar_url: profile?.avatar_url || null,
                        full_name: profile?.full_name || 'User',
                        store_name: profile?.store_name || null,
                        statuses: statuses,
                        hasUnviewed: false
                      });
                    }}
                  >
                    {status.content_type === 'text' ? (
                      <div className="w-full h-full flex items-center justify-center p-2">
                        <p className="text-white text-xs font-medium text-center line-clamp-4">
                          {status.text_content}
                        </p>
                      </div>
                    ) : status.content_type === 'image' && status.content_url ? (
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
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="w-8 h-8 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="absolute bottom-1 left-1 right-1 text-[10px] text-white/80 bg-black/30 rounded px-1">
                      {status.view_count || 0} views
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Image className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No active statuses</h3>
                <p className="text-muted-foreground">
                  {isOwnProfile 
                    ? 'Share your first status! Only your followers can view them.'
                    : 'This user hasn\'t posted any statuses yet.'}
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="about">
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-lg mb-3">About</h3>
                <p className="text-muted-foreground">
                  {profile.bio || 'No bio yet.'}
                </p>
                
                {profile.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {profile.website}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Status Upload Modal */}
      {showStatusUpload && (
        <StatusUploadModal
          onClose={() => setShowStatusUpload(false)}
          onSuccess={() => {
            setShowStatusUpload(false);
            queryClient.invalidateQueries({ queryKey: ['user-statuses', userId] });
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
    </div>
  );
};

export default UserProfile;
