import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Updates the current user's `last_seen` timestamp every 30 seconds
 * so other users can determine real online/offline status.
 */
const usePresence = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const update = () => {
      supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id)
        .then(() => {});
    };

    update();
    const interval = setInterval(update, 30000);

    return () => clearInterval(interval);
  }, [user]);
};

export default usePresence;
