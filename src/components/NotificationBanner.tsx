import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface InAppNotification {
  id: string;
  title: string;
  body: string;
  icon_emoji: string;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
}

export const NotificationBanner = () => {
  const queryClient = useQueryClient();
  const { isSubscribed, subscribe, isSupported, loading } = usePushNotifications();
  const [showSubscribePrompt, setShowSubscribePrompt] = useState(false);
  const [currentNotification, setCurrentNotification] = useState<InAppNotification | null>(null);

  const getSessionId = () => {
    return localStorage.getItem('session_id') || '';
  };

  // Fetch unread in-app notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['in-app-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('in_app_notifications')
        .select('*')
        .or(`session_id.eq.${getSessionId()},session_id.is.null`)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as InAppNotification[];
    },
    refetchInterval: 30000 // Check every 30 seconds
  });

  // Mark as read mutation
  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('in_app_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['in-app-notifications'] });
    }
  });

  // Show subscribe prompt after 10 seconds if not subscribed
  useEffect(() => {
    if (isSupported && !isSubscribed) {
      const hasSeenPrompt = localStorage.getItem('notification_prompt_seen');
      if (!hasSeenPrompt) {
        const timer = setTimeout(() => {
          setShowSubscribePrompt(true);
        }, 10000);
        return () => clearTimeout(timer);
      }
    }
  }, [isSupported, isSubscribed]);

  // Show notifications one at a time
  useEffect(() => {
    if (notifications.length > 0 && !currentNotification) {
      setCurrentNotification(notifications[0]);
    }
  }, [notifications, currentNotification]);

  const handleDismissNotification = () => {
    if (currentNotification) {
      markAsRead.mutate(currentNotification.id);
      setCurrentNotification(null);
    }
  };

  const handleNotificationClick = () => {
    if (currentNotification) {
      markAsRead.mutate(currentNotification.id);
      if (currentNotification.link_url) {
        window.location.href = currentNotification.link_url;
      }
      setCurrentNotification(null);
    }
  };

  const handleSubscribe = async () => {
    await subscribe();
    setShowSubscribePrompt(false);
    localStorage.setItem('notification_prompt_seen', 'true');
  };

  const handleDismissPrompt = () => {
    setShowSubscribePrompt(false);
    localStorage.setItem('notification_prompt_seen', 'true');
  };

  return (
    <>
      {/* Subscribe Prompt */}
      <AnimatePresence>
        {showSubscribePrompt && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50"
          >
            <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl shadow-2xl p-4 text-primary-foreground">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white/20 rounded-full">
                  <Bell className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-lg">🔔 Stay Updated!</h4>
                  <p className="text-sm opacity-90 mt-1">
                    Get notified about flash sales, new products, and exclusive deals!
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={handleSubscribe}
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? 'Enabling...' : 'Enable Notifications'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={handleDismissPrompt}
                      className="text-primary-foreground hover:bg-white/20"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* In-App Notification Banner */}
      <AnimatePresence>
        {currentNotification && !showSubscribePrompt && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50"
          >
            <div 
              className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
              onClick={handleNotificationClick}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{currentNotification.icon_emoji}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-foreground truncate">
                      {currentNotification.title}
                    </h4>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {currentNotification.body}
                    </p>
                    {currentNotification.link_url && (
                      <div className="flex items-center gap-1 text-primary text-sm mt-2">
                        <span>View</span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismissNotification();
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {/* Progress bar for auto-dismiss */}
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 8, ease: 'linear' }}
                onAnimationComplete={handleDismissNotification}
                className="h-1 bg-primary origin-left"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
