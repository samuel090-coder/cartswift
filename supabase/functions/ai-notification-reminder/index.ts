import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // ACTION: generate - AI generates smart notification messages
    if (action === "generate") {
      const { category, context } = body;
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      const systemPrompt = `You are a marketing notification copywriter for CartSwift, an online shopping platform.
Generate short, engaging push notification messages that drive clicks and purchases.
Rules:
- Title: max 50 chars, include one relevant emoji at the start
- Body: max 120 chars, create urgency or excitement
- Be human, warm, and action-oriented
- Never be spammy or misleading
Return JSON: { "title": "...", "body": "...", "icon_emoji": "..." }`;

      const userPrompt = `Generate a ${category} notification.${context ? ` Context: ${context}` : ""}
Categories: new_arrival, flash_sale, restock, promo, abandoned_cart, price_drop, trending`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [{
            type: "function",
            function: {
              name: "create_notification",
              description: "Create a push notification with title and body",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Notification title with emoji, max 50 chars" },
                  body: { type: "string", description: "Notification body, max 120 chars" },
                  icon_emoji: { type: "string", description: "Single emoji for the notification icon" },
                },
                required: ["title", "body", "icon_emoji"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "create_notification" } },
        }),
      });

      if (!aiResp.ok) {
        const status = aiResp.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited, try again later" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI error: ${status}`);
      }

      const aiData = await aiResp.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      let notification;
      if (toolCall?.function?.arguments) {
        notification = JSON.parse(toolCall.function.arguments);
      } else {
        // Fallback: try to parse content
        const content = aiData.choices?.[0]?.message?.content || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        notification = jsonMatch ? JSON.parse(jsonMatch[0]) : { title: "🔔 Check this out!", body: "New deals await you on CartSwift!", icon_emoji: "🔔" };
      }

      return new Response(JSON.stringify({ notification }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: scan - Check for events that should trigger automated notifications
    if (action === "scan") {
      const results: string[] = [];

      // 1. New products in last 24h
      const { data: newItems } = await supabase
        .from("items")
        .select("id, title, price, currency, images")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(5);

      if (newItems && newItems.length > 0) {
        results.push(`new_arrivals:${newItems.length}`);
      }

      // 2. Active flash sales
      const { data: flashSales } = await supabase
        .from("flash_sales")
        .select("id, item_id, sale_price, original_price, ends_at")
        .eq("is_active", true)
        .gte("ends_at", new Date().toISOString())
        .limit(5);

      if (flashSales && flashSales.length > 0) {
        results.push(`flash_sales:${flashSales.length}`);
      }

      // 3. Recently restocked (seller products that were updated recently)
      const { data: restocked } = await supabase
        .from("seller_products")
        .select("id, title, stock_quantity")
        .eq("is_approved", true)
        .gt("stock_quantity", 0)
        .gte("updated_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(5);

      if (restocked && restocked.length > 0) {
        results.push(`restocked:${restocked.length}`);
      }

      // 4. Check notification log to avoid spam (no more than 3 auto notifications per day)
      const { count: todayCount } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("trigger_type", "ai_reminder")
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

      const canSend = (todayCount || 0) < 3;

      return new Response(JSON.stringify({ events: results, canSend, todaySent: todayCount || 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: send-reminder - Generate and send an AI notification
    if (action === "send-reminder") {
      const { category, context, link_url } = body;

      // Check daily limit
      const { count: todayCount } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("trigger_type", "ai_reminder")
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

      if ((todayCount || 0) >= 3) {
        return new Response(JSON.stringify({ error: "Daily notification limit reached (3/day)" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate AI message
      let notification = { title: "🔔 Don't miss out!", body: "New updates on CartSwift!", icon_emoji: "🔔" };
      if (LOVABLE_API_KEY) {
        try {
          const genResp = await fetch(`${supabaseUrl}/functions/v1/ai-notification-reminder`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ action: "generate", category, context }),
          });
          if (genResp.ok) {
            const genData = await genResp.json();
            if (genData.notification) notification = genData.notification;
          }
        } catch (e) {
          console.error("AI generation fallback:", e);
        }
      }

      // Save notification to DB
      const { data: savedNotification, error: saveError } = await supabase
        .from("notifications")
        .insert({
          title: notification.title,
          body: notification.body,
          icon_emoji: notification.icon_emoji,
          trigger_type: "ai_reminder",
          trigger_data: { category, context },
          link_url: link_url || "/",
          status: "pending",
        })
        .select()
        .single();

      if (saveError) throw saveError;

      // Dispatch via send-push-notification
      try {
        const pushResp = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ notificationId: savedNotification.id }),
        });
        const pushResult = await pushResp.json();
        console.log("Push result:", pushResult);

        return new Response(JSON.stringify({ success: true, notification: savedNotification, pushResult }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        console.error("Push send error:", e);
        return new Response(JSON.stringify({ success: true, notification: savedNotification, pushError: String(e) }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ACTION: unsubscribe - handled by existing push subscription system

    return new Response(JSON.stringify({ error: "Invalid action. Use: generate, scan, send-reminder" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
