import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get VAPID keys from environment
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error('VAPID keys not configured');
    }

    // Initialize web push application server
    const appServer = await webpush.ApplicationServer.new({
      contactInformation: "mailto:admin@cartswift.com",
      vapidKeys: {
        publicKey: VAPID_PUBLIC_KEY,
        privateKey: VAPID_PRIVATE_KEY,
      },
    });

    const { notificationId, autoTrigger, triggerData } = await req.json();
    
    console.log('Processing notification request:', { notificationId, autoTrigger, triggerData });

    let notification;

    if (notificationId) {
      // Manual notification - fetch from database
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', notificationId)
        .single();

      if (error || !data) {
        throw new Error('Notification not found');
      }
      notification = data;
    } else if (autoTrigger && triggerData) {
      // Auto-triggered notification - check settings first
      const { data: setting } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('setting_key', autoTrigger)
        .single();

      if (!setting || !setting.is_enabled) {
        console.log(`Auto-trigger ${autoTrigger} is disabled`);
        return new Response(JSON.stringify({ sent: 0, message: 'Trigger disabled' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Build notification from template
      let title = setting.setting_value.title_template;
      let body = setting.setting_value.body_template;

      // Replace variables
      for (const [key, value] of Object.entries(triggerData)) {
        title = title.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
        body = body.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      }

      // Create notification record
      const { data: newNotification, error: createError } = await supabase
        .from('notifications')
        .insert({
          title,
          body,
          trigger_type: autoTrigger,
          trigger_data: triggerData,
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) throw createError;
      notification = newNotification;
    } else {
      throw new Error('Invalid request: provide notificationId or autoTrigger');
    }

    // Fetch all subscribers
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (subError) throw subError;

    console.log(`Found ${subscriptions?.length || 0} subscribers`);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No subscribers' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Prepare push payload
    const payload = JSON.stringify({
      title: `${notification.icon_emoji || '🔔'} ${notification.title}`,
      body: notification.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      image: notification.image_url,
      url: notification.link_url || '/'
    });

    let sentCount = 0;
    const failedEndpoints: string[] = [];

    // Send to each subscriber using real web push
    for (const sub of subscriptions) {
      try {
        // Create subscription object for web push
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          }
        };

        // Subscribe and send push message
        const subscriber = appServer.subscribe(pushSubscription);
        await subscriber.pushTextMessage(payload, {});

        console.log(`Push sent to ${sub.session_id}`);

        // Also create in-app notification as backup
        await supabase.from('in_app_notifications').insert({
          session_id: sub.session_id,
          notification_id: notification.id,
          title: notification.title,
          body: notification.body,
          icon_emoji: notification.icon_emoji,
          link_url: notification.link_url
        });

        sentCount++;
      } catch (error) {
        console.error(`Failed to send to ${sub.endpoint}:`, error);
        failedEndpoints.push(sub.endpoint);
      }
    }

    // Update notification stats
    await supabase
      .from('notifications')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        total_sent: sentCount
      })
      .eq('id', notification.id);

    // Clean up failed endpoints (expired subscriptions)
    if (failedEndpoints.length > 0) {
      console.log(`Removing ${failedEndpoints.length} failed endpoints`);
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', failedEndpoints);
    }

    console.log(`Successfully sent ${sentCount} push notifications`);

    return new Response(JSON.stringify({ 
      sent: sentCount, 
      failed: failedEndpoints.length,
      notificationId: notification.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
