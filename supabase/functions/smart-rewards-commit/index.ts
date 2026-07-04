import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SHIPPING_NGN = 10000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { userId, sessionId, chosenReward } = await req.json();
    if (!userId || !chosenReward?.title) {
      return new Response(JSON.stringify({ error: 'userId and chosenReward required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // If a claim already exists (race), return it.
    const { data: existing } = await admin
      .from('reward_claims')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ claim: existing, existing: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data, error } = await admin.from('reward_claims').insert({
      session_id: sessionId || crypto.randomUUID(),
      user_id: userId,
      primary_reward: chosenReward,
      shipping_fee: SHIPPING_NGN,
      currency: 'NGN',
      status: 'pending',
      expires_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    }).select().single();

    if (error) {
      if (String(error.message).includes('reward_claims_user_id_unique')) {
        const { data: again } = await admin.from('reward_claims').select('*').eq('user_id', userId).maybeSingle();
        return new Response(JSON.stringify({ claim: again, existing: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw error;
    }

    // Clean up mystery state — claim is final.
    await admin.from('reward_mystery_state').delete().eq('user_id', userId);

    return new Response(JSON.stringify({ claim: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('commit error', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
