import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

type NotificationType = 'follow' | 'status_view' | 'status_reaction' | 'earnings' | 'system' | 'promo';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  iconEmoji?: string;
  linkUrl?: string;
  relatedUserId?: string;
  relatedStatusId?: string;
  relatedItemId?: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createNotification = useCallback(async ({
    userId,
    type,
    title,
    body,
    iconEmoji = '🔔',
    linkUrl,
    relatedUserId,
    relatedStatusId,
    relatedItemId,
  }: CreateNotificationParams) => {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .insert({
          user_id: userId,
          type,
          title,
          body,
          icon_emoji: iconEmoji,
          link_url: linkUrl,
          related_user_id: relatedUserId,
          related_status_id: relatedStatusId,
          related_item_id: relatedItemId,
        });

      if (error) throw error;

      // Invalidate the notifications query if it's for the current user
      if (userId === user?.id) {
        queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
      }

      return true;
    } catch (error) {
      console.error('Error creating notification:', error);
      return false;
    }
  }, [user?.id, queryClient]);

  const notifyFollow = useCallback(async (followedUserId: string, followerName: string) => {
    return createNotification({
      userId: followedUserId,
      type: 'follow',
      title: '👤 New Follower!',
      body: `${followerName} started following you`,
      iconEmoji: '👤',
      linkUrl: `/profile/${user?.id}`,
      relatedUserId: user?.id,
    });
  }, [createNotification, user?.id]);

  const notifyStatusReaction = useCallback(async (
    statusOwnerId: string, 
    reactorName: string, 
    reactionEmoji: string,
    statusId: string
  ) => {
    return createNotification({
      userId: statusOwnerId,
      type: 'status_reaction',
      title: `${reactionEmoji} Reaction!`,
      body: `${reactorName} reacted to your status`,
      iconEmoji: reactionEmoji,
      linkUrl: '/profile',
      relatedUserId: user?.id,
      relatedStatusId: statusId,
    });
  }, [createNotification, user?.id]);

  const notifyStatusView = useCallback(async (
    statusOwnerId: string,
    viewerName: string,
    statusId: string
  ) => {
    return createNotification({
      userId: statusOwnerId,
      type: 'status_view',
      title: '👀 Status Viewed!',
      body: `${viewerName} viewed your status`,
      iconEmoji: '👀',
      linkUrl: '/profile',
      relatedUserId: user?.id,
      relatedStatusId: statusId,
    });
  }, [createNotification, user?.id]);

  const notifyEarnings = useCallback(async (
    userId: string,
    amount: number,
    earningType: 'view' | 'reaction'
  ) => {
    return createNotification({
      userId,
      type: 'earnings',
      title: `💰 You earned $${amount.toFixed(3)}!`,
      body: earningType === 'view' ? 'Someone viewed your status' : 'Someone reacted to your status',
      iconEmoji: '💰',
      linkUrl: '/profile',
    });
  }, [createNotification]);

  const notifyPromo = useCallback(async (
    userId: string,
    title: string,
    body: string,
    linkUrl?: string
  ) => {
    return createNotification({
      userId,
      type: 'promo',
      title,
      body,
      iconEmoji: '🎉',
      linkUrl,
    });
  }, [createNotification]);

  const notifySystem = useCallback(async (
    userId: string,
    title: string,
    body: string,
    linkUrl?: string
  ) => {
    return createNotification({
      userId,
      type: 'system',
      title,
      body,
      iconEmoji: '🔔',
      linkUrl,
    });
  }, [createNotification]);

  return {
    createNotification,
    notifyFollow,
    notifyStatusReaction,
    notifyStatusView,
    notifyEarnings,
    notifyPromo,
    notifySystem,
  };
};
