import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type Item = Database['public']['Tables']['items']['Row'];
type AdminNotification = Database['public']['Tables']['admin_notifications']['Row'];

interface OrderWithDetails extends Order {
  order_items: (OrderItem & { items: Item })[];
}

interface NotificationData extends AdminNotification {
  orders: OrderWithDetails;
}

interface NotificationContextType {
  notifications: NotificationData[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
  adminUserId?: string;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ 
  children, 
  adminUserId 
}) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (!adminUserId) return;

    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select(`
          *,
          orders (
            *,
            order_items (
              *,
              items (*)
            )
          )
        `)
        .eq('admin_user_id', adminUserId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      const typedData = data as NotificationData[];
      setNotifications(typedData);
      setUnreadCount(typedData.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error in fetchNotifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error in markAsRead:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!adminUserId) return;

    try {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('admin_user_id', adminUserId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      setNotifications(prev => 
        prev.map(n => ({ 
          ...n, 
          is_read: true, 
          read_at: new Date().toISOString() 
        }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
    }
  };

  const refreshNotifications = async () => {
    await fetchNotifications();
  };

  // Setup realtime subscription for new orders
  useEffect(() => {
    if (!adminUserId) return;

    console.log('Setting up realtime subscription for admin notifications...');

    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('New order detected:', payload);
          
          // Show toast notification
          toast({
            title: "🛒 New Order Received!",
            description: `Order from ${payload.new.full_name} - $${payload.new.total_amount}`,
            duration: 5000,
          });

          // Play notification sound if available
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMeBDOo1O/AfywFLYPP8tlKNEBE1');
            audio.volume = 0.3;
            audio.play().catch(() => {}); // Silently fail if audio can't play
          } catch (error) {
            // Ignore audio errors
          }

          // Refresh notifications to get the new one
          setTimeout(() => {
            fetchNotifications();
          }, 1000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications',
          filter: `admin_user_id=eq.${adminUserId}`
        },
        (payload) => {
          console.log('New notification for admin:', payload);
          // Refresh notifications
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [adminUserId]);

  // Initial fetch
  useEffect(() => {
    if (adminUserId) {
      fetchNotifications();
    }
  }, [adminUserId]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        refreshNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};