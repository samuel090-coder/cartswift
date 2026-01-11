import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, ChevronLeft, ChevronRight, Heart, Send, Eye, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

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

const StatusViewer = ({ user, onClose, onNext }: StatusViewerProps) => {
  const { user: currentUser } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [showViewers, setShowViewers] = useState(false);

  const currentStatus = user.statuses[currentIndex];
  const isOwner = currentUser?.id === user.user_id;

  // Auto-progress timer
  useEffect(() => {
    if (isPaused) return;
    
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
  }, [currentIndex, isPaused, user.statuses.length, onNext]);

  // Record view
  useEffect(() => {
    const recordView = async () => {
      if (!currentUser || isOwner) return;
      try {
        await supabase.from('status_views').upsert({
          status_id: currentStatus.id,
          viewer_id: currentUser.id
        }, { onConflict: 'status_id,viewer_id' });
      } catch (error) {
        console.error('Error recording view:', error);
      }
    };
    recordView();
  }, [currentStatus?.id, currentUser, isOwner]);

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
    if (!currentUser) return;
    try {
      await supabase.from('status_reactions').insert({
        status_id: currentStatus.id,
        user_id: currentUser.id,
        reaction_type: reaction
      });
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
      setReplyText('');
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          className="relative w-full max-w-md h-[90vh] bg-black rounded-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress bars */}
          <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
            {user.statuses.map((_, idx) => (
              <div key={idx} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-50"
                  style={{
                    width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-4 left-0 right-0 z-20 flex items-center justify-between px-4 pt-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-white/50">
                <AvatarImage src={user.avatar_url || ''} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-pink-vibrant text-white text-xs">
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
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
                onClick={() => setIsPaused(!isPaused)}
              >
                {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
              </Button>
              {currentStatus.content_type === 'video' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10"
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div 
            className="h-full flex items-center justify-center"
            style={{ backgroundColor: currentStatus.background_color || '#000' }}
          >
            {currentStatus.content_type === 'text' && (
              <div className="p-8 text-center">
                <p className="text-white text-2xl font-bold leading-relaxed">
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
          </div>

          {/* Caption */}
          {currentStatus.caption && (
            <div className="absolute bottom-24 left-0 right-0 px-4">
              <p className="text-white text-center text-sm bg-black/40 rounded-lg p-3">
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

          {/* Footer - View count for owner, Reply for others */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            {isOwner ? (
              <button
                onClick={() => setShowViewers(true)}
                className="flex items-center gap-2 text-white/80 hover:text-white"
              >
                <Eye className="h-5 w-5" />
                <span className="text-sm">{currentStatus.view_count || 0} views</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:text-primary"
                  onClick={() => handleReact('❤️')}
                >
                  <Heart className="h-6 w-6" />
                </Button>
                <Input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Send a reply..."
                  className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:text-primary"
                  onClick={handleReply}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StatusViewer;
