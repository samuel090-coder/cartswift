import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  X, ChevronLeft, ChevronRight, Heart, Send, Eye, 
  Pause, Play, Volume2, VolumeX, MessageCircle, 
  MoreVertical, Share2, Trash2, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useQuery } from '@tanstack/react-query';

interface StatusViewerProps {
  user: {
    id: string;
    user_id: string;
    avatar_url: string | null;
    full_name: string | null;
    store_name: string | null;
    statuses: any[];
    hasUnviewed: boolean;
  };
  onClose: () => void;
  onNext: () => void;
}

const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '🔥', '👏', '💯'];

const StatusViewer = ({ user, onClose, onNext }: StatusViewerProps) => {
  const { user: currentUser } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [showViewers, setShowViewers] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  const currentStatus = user.statuses[currentIndex];
  const isOwner = currentUser?.id === user.user_id;

  // Fetch viewers for status owner
  const { data: viewers = [] } = useQuery({
    queryKey: ['status-viewers', currentStatus?.id],
    queryFn: async () => {
      if (!isOwner || !currentStatus) return [];
      const { data, error } = await supabase
        .from('status_views')
        .select('*, profiles:viewer_id(full_name, avatar_url)')
        .eq('status_id', currentStatus.id)
        .order('viewed_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: isOwner && !!currentStatus,
  });

  // Fetch reactions for status owner
  const { data: reactions = [] } = useQuery({
    queryKey: ['status-reactions', currentStatus?.id],
    queryFn: async () => {
      if (!currentStatus) return [];
      const { data, error } = await supabase
        .from('status_reactions')
        .select('*, profiles:user_id(full_name, avatar_url)')
        .eq('status_id', currentStatus.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentStatus,
  });

  // Auto-progress timer
  useEffect(() => {
    if (isPaused || showViewers) return;
    
    const duration = currentStatus?.content_type === 'video' ? 15000 : 5000;
    const interval = 50;
    const increment = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentIndex < user.statuses.length - 1) {
            setCurrentIndex(currentIndex + 1);
            return 0;
          } else {
            onNext();
            return 100;
          }
        }
        return prev + increment;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex, isPaused, showViewers, user.statuses.length, onNext]);

  // Record view and credit earnings
  useEffect(() => {
    const recordViewAndEarnings = async () => {
      if (!currentUser || isOwner || !currentStatus) return;
      try {
        // Check if already viewed
        const { data: existingView } = await supabase
          .from('status_views')
          .select('id')
          .eq('status_id', currentStatus.id)
          .eq('viewer_id', currentUser.id)
          .maybeSingle();

        if (!existingView) {
          // Insert the view
          await supabase.from('status_views').insert({
            status_id: currentStatus.id,
            viewer_id: currentUser.id
          });

          // Credit $0.50 to status owner's wallet bonus
          const { data: ownerWallet } = await supabase
            .from('wallets')
            .select('id, bonus_balance, total_earned')
            .eq('user_id', user.user_id)
            .maybeSingle();

          if (ownerWallet) {
            await supabase
              .from('wallets')
              .update({
                bonus_balance: (ownerWallet.bonus_balance || 0) + 0.50,
                total_earned: (ownerWallet.total_earned || 0) + 0.50
              })
              .eq('id', ownerWallet.id);
          } else {
            await supabase
              .from('wallets')
              .insert({
                user_id: user.user_id,
                bonus_balance: 0.50,
                total_earned: 0.50
              });
          }

          // Record the earning
          await supabase.from('status_view_earnings').insert({
            status_id: currentStatus.id,
            viewer_id: currentUser.id,
            owner_id: user.user_id,
            amount: 0.50
          });

          // Update view count
          await supabase
            .from('user_statuses')
            .update({ view_count: (currentStatus.view_count || 0) + 1 })
            .eq('id', currentStatus.id);
        }
      } catch (error) {
        console.error('Error recording view:', error);
      }
    };
    recordViewAndEarnings();
  }, [currentStatus?.id, currentUser, isOwner, user.user_id]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  const handleNext = () => {
    if (currentIndex < user.statuses.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onNext();
    }
  };

  const handleReact = async (reaction: string) => {
    if (!currentUser) {
      toast.error('Please log in to react');
      return;
    }
    try {
      await supabase.from('status_reactions').insert({
        status_id: currentStatus.id,
        user_id: currentUser.id,
        reaction_type: reaction
      });
      toast.success(`Reacted with ${reaction}`);
      setShowReactions(false);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleReply = async () => {
    if (!currentUser || !replyText.trim()) return;
    try {
      await supabase.from('status_reactions').insert({
        status_id: currentStatus.id,
        user_id: currentUser.id,
        reaction_type: 'reply',
        message: replyText.trim()
      });
      toast.success('Reply sent!');
      setReplyText('');
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  const handleDelete = async () => {
    if (!isOwner) return;
    try {
      await supabase
        .from('user_statuses')
        .delete()
        .eq('id', currentStatus.id);
      toast.success('Status deleted');
      if (user.statuses.length === 1) {
        onClose();
      } else {
        handleNext();
      }
    } catch (error) {
      toast.error('Failed to delete status');
    }
  };

  const handleShare = () => {
    navigator.share?.({
      title: `${user.store_name || user.full_name}'s Status`,
      url: window.location.href,
    }).catch(() => {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied!');
    });
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-md h-full md:h-[90vh] md:rounded-2xl overflow-hidden bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress bars */}
            <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-3 pt-4">
              {user.statuses.map((_, idx) => (
                <div key={idx} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-white"
                    style={{
                      width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-6 left-0 right-0 z-20 flex items-center justify-between px-4 pt-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 ring-2 ring-white/30">
                  <AvatarImage src={user.avatar_url || ''} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-pink-vibrant text-white text-xs font-bold">
                    {getInitials(user.store_name || user.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-semibold text-sm">
                    {user.store_name || user.full_name || 'User'}
                  </p>
                  <p className="text-white/60 text-xs">
                    {formatDistanceToNow(new Date(currentStatus.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 h-9 w-9"
                  onClick={() => setIsPaused(!isPaused)}
                >
                  {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                </Button>
                {currentStatus.content_type === 'video' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/10 h-9 w-9"
                    onClick={() => setIsMuted(!isMuted)}
                  >
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-9 w-9">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
                    <DropdownMenuItem onClick={handleShare} className="text-white hover:bg-white/10">
                      <Share2 className="h-4 w-4 mr-2" /> Share
                    </DropdownMenuItem>
                    {isOwner && (
                      <DropdownMenuItem onClick={handleDelete} className="text-red-400 hover:bg-red-500/10">
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 h-9 w-9"
                  onClick={onClose}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div 
              className="h-full flex items-center justify-center"
              style={{ 
                background: currentStatus.background_color?.startsWith('linear') 
                  ? currentStatus.background_color 
                  : undefined,
                backgroundColor: !currentStatus.background_color?.startsWith('linear') 
                  ? (currentStatus.background_color || '#000') 
                  : undefined
              }}
            >
              {currentStatus.content_type === 'text' && (
                <div className="p-8 text-center max-w-sm">
                  <p className="text-white text-2xl md:text-3xl font-bold leading-relaxed drop-shadow-lg">
                    {currentStatus.text_content}
                  </p>
                </div>
              )}
              {currentStatus.content_type === 'image' && currentStatus.content_url && (
                <img
                  src={currentStatus.content_url}
                  alt="Status"
                  className="w-full h-full object-contain"
                />
              )}
              {currentStatus.content_type === 'video' && currentStatus.content_url && (
                <video
                  src={currentStatus.content_url}
                  className="w-full h-full object-contain"
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                />
              )}
              {currentStatus.content_type === 'voice' && currentStatus.content_url && (
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                    <Volume2 className="w-12 h-12 text-white" />
                  </div>
                  <audio src={currentStatus.content_url} controls autoPlay className="w-64" />
                </div>
              )}
            </div>

            {/* Caption */}
            {currentStatus.caption && (
              <div className="absolute bottom-24 left-0 right-0 px-4">
                <p className="text-white text-center text-sm bg-black/50 backdrop-blur-sm rounded-xl p-3">
                  {currentStatus.caption}
                </p>
              </div>
            )}

            {/* Navigation Tap Areas */}
            <button
              className="absolute left-0 top-20 bottom-24 w-1/3"
              onClick={handlePrev}
            />
            <button
              className="absolute right-0 top-20 bottom-24 w-1/3"
              onClick={handleNext}
            />

            {/* Navigation Arrows (visible on hover) */}
            {currentIndex > 0 && (
              <button
                onClick={handlePrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            {currentIndex < user.statuses.length - 1 && (
              <button
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
              {isOwner ? (
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowViewers(true)}
                    className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                  >
                    <Eye className="h-5 w-5" />
                    <span className="text-sm font-medium">{currentStatus.view_count || 0} views</span>
                  </button>
                  <button
                    onClick={() => setShowViewers(true)}
                    className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                  >
                    <Users className="h-5 w-5" />
                    <span className="text-sm font-medium">{viewers.length} viewers</span>
                  </button>
                  {reactions.length > 0 && (
                    <div className="flex items-center gap-1 text-white/80">
                      <Heart className="h-5 w-5 text-pink-500" />
                      <span className="text-sm">{reactions.length}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {/* Quick Reactions */}
                  <AnimatePresence>
                    {showReactions && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-16 left-4 flex gap-2 bg-black/80 backdrop-blur-sm rounded-full p-2"
                      >
                        {REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReact(emoji)}
                            className="text-2xl hover:scale-125 transition-transform"
                          >
                            {emoji}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:text-pink-400 h-10 w-10"
                    onClick={() => setShowReactions(!showReactions)}
                  >
                    <Heart className="h-6 w-6" />
                  </Button>
                  
                  <div className="flex-1 flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                    <Input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Reply..."
                      className="flex-1 bg-transparent border-none text-white placeholder:text-white/50 focus-visible:ring-0 h-8 p-0"
                      onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:text-primary h-8 w-8"
                      onClick={handleReply}
                      disabled={!replyText.trim()}
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Viewers Sheet */}
      <Sheet open={showViewers} onOpenChange={setShowViewers}>
        <SheetContent side="bottom" className="h-[70vh] bg-gray-900 border-t border-gray-700 rounded-t-3xl">
          <SheetHeader className="pb-4 border-b border-gray-700">
            <SheetTitle className="text-white flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Viewers ({viewers.length})
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3 overflow-y-auto max-h-[50vh]">
            {viewers.length === 0 ? (
              <p className="text-center text-white/60 py-8">No viewers yet</p>
            ) : (
              viewers.map((viewer: any) => (
                <div key={viewer.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={viewer.profiles?.avatar_url || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-pink-vibrant text-white text-xs">
                      {getInitials(viewer.profiles?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">
                      {viewer.profiles?.full_name || 'User'}
                    </p>
                    <p className="text-white/60 text-xs">
                      {formatDistanceToNow(new Date(viewer.viewed_at), { addSuffix: true })}
                    </p>
                  </div>
                  {viewer.reacted_with && (
                    <span className="text-xl">{viewer.reacted_with}</span>
                  )}
                </div>
              ))
            )}
            
            {/* Reactions Section */}
            {reactions.length > 0 && (
              <>
                <div className="border-t border-gray-700 pt-4 mt-4">
                  <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                    <Heart className="h-4 w-4 text-pink-500" />
                    Reactions ({reactions.length})
                  </h4>
                  {reactions.map((reaction: any) => (
                    <div key={reaction.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={reaction.profiles?.avatar_url || ''} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-pink-vibrant text-white text-xs">
                          {getInitials(reaction.profiles?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-white font-medium text-sm">
                          {reaction.profiles?.full_name || 'User'}
                        </p>
                        {reaction.message && (
                          <p className="text-white/60 text-xs">{reaction.message}</p>
                        )}
                      </div>
                      <span className="text-xl">{reaction.reaction_type}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default StatusViewer;