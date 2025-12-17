import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = 'https://qcfsnqumydfminvmqyfp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZnNucXVteWRmbWludm1xeWZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMzcwMDIsImV4cCI6MjA2NjcxMzAwMn0.u9yL-M4ePbFxrkifl5GQlExtib5FCU3-84BiBYxCDCE';

export const getSessionId = () => {
  let sessionId = localStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('session_id', sessionId);
  }
  return sessionId;
};

// Singleton instance - created once, reused everywhere
let sessionSupabaseInstance: SupabaseClient<Database> | null = null;

export const createSessionSupabaseClient = (): SupabaseClient<Database> => {
  if (!sessionSupabaseInstance) {
    sessionSupabaseInstance = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          'x-session-id': getSessionId(),
        },
      },
    });
  }
  return sessionSupabaseInstance;
};
