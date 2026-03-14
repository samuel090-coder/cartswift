import { useEffect, useRef } from 'react';
import { usePushNotifications } from './usePushNotifications';

/**
 * Auto-prompts push notification subscription on first visit.
 * Browsers require user gesture for some cases, but many allow
 * requestPermission() on page load. We attempt it once per device.
 */
export const useAutoSubscribe = () => {
  const { isSupported, isSubscribed, permission, subscribe, loading } = usePushNotifications();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    if (!isSupported || isSubscribed || loading) return;
    // Don't re-prompt if already denied
    if (permission === 'denied') return;
    // Only auto-prompt once per browser
    const alreadyPrompted = localStorage.getItem('push_auto_prompted');
    if (alreadyPrompted) return;

    attempted.current = true;

    // Small delay to let page render first
    const timer = setTimeout(async () => {
      localStorage.setItem('push_auto_prompted', '1');
      try {
        await subscribe();
      } catch (e) {
        console.log('Auto push subscribe failed (expected on some browsers):', e);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isSupported, isSubscribed, permission, subscribe, loading]);
};
