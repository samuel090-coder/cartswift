import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { createSessionSupabaseClient, getSessionId } from '@/lib/sessionSupabase';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushNotifications = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission);

        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
        } catch (error) {
          console.error('Error checking subscription:', error);
        }
      }
    };

    checkSupport();
  }, []);

  const fetchVapidPublicKey = useCallback(async () => {
    const sessionSupabase = createSessionSupabaseClient();
    const { data, error } = await sessionSupabase.functions.invoke('get-vapid-public-key');
    if (error) throw error;
    if (!data?.publicKey) throw new Error('Missing VAPID public key');
    return data.publicKey as string;
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      toast({ title: 'Push notifications not supported', variant: 'destructive' });
      return false;
    }

    setLoading(true);

    try {
      // Ensure we have a stable session id for RLS + targeting
      const sessionId = getSessionId();

      // Request permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        toast({
          title: 'Permission denied',
          description: 'Please enable notifications in your browser settings',
          variant: 'destructive',
        });
        return false;
      }

      // Register service worker if not already
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
      }

      const vapidPublicKey = await fetchVapidPublicKey();

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const subscriptionJson = subscription.toJSON();

      // Save to database using a session-scoped client that always sends x-session-id
      const sessionSupabase = createSessionSupabaseClient();
      const { error } = await sessionSupabase
        .from('push_subscriptions')
        .upsert(
          {
            session_id: sessionId,
            endpoint: subscriptionJson.endpoint!,
            p256dh: subscriptionJson.keys!.p256dh,
            auth: subscriptionJson.keys!.auth,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'endpoint' },
        );

      if (error) throw error;

      setIsSubscribed(true);
      toast({ title: '🔔 Notifications enabled!', description: "You'll receive updates about deals and orders" });
      return true;
    } catch (error: any) {
      console.error('Error subscribing:', error);
      toast({ title: 'Error enabling notifications', description: error.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchVapidPublicKey, isSupported]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from database (requires x-session-id header for RLS)
        const sessionSupabase = createSessionSupabaseClient();
        await sessionSupabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
      }

      setIsSubscribed(false);
      toast({ title: 'Notifications disabled' });
      return true;
    } catch (error: any) {
      console.error('Error unsubscribing:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    isSubscribed,
    isSupported,
    permission,
    loading,
    subscribe,
    unsubscribe,
  };
};

