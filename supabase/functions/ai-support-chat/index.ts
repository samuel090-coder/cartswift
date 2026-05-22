import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { chat_id, message, image_url } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Identify user from chat
    const { data: chat } = await supabase.from("support_chats").select("user_id").eq("id", chat_id).single();
    if (!chat) throw new Error("Chat not found");
    const userId = chat.user_id;

    // Gather context in parallel
    const [profileRes, ordersRes, cartRes, wishlistRes, walletRes, recentMsgsRes, historyRes] = await Promise.all([
      supabase.from("profiles").select("full_name, email, country, city, is_seller, total_sales").eq("id", userId).maybeSingle(),
      supabase.from("orders").select("id, tracking_code, status, total_amount, currency, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
      supabase.from("cart_items").select("item_id, quantity, items(title, price)").eq("user_id", userId).limit(20).then(r => r).catch(() => ({ data: [] })),
      supabase.from("wishlists").select("item_id, items(title, price)").eq("user_id", userId).limit(20).then(r => r).catch(() => ({ data: [] })),
      supabase.from("user_wallets").select("balance, currency").eq("user_id", userId).maybeSingle().then(r => r).catch(() => ({ data: null })),
      supabase.from("messages").select("content, created_at").or(`sender_id.eq.${userId},recipient_id.eq.${userId}`).order("created_at", { ascending: false }).limit(5).then(r => r).catch(() => ({ data: [] })),
      supabase.from("support_messages").select("sender, content, image_url").eq("chat_id", chat_id).order("created_at", { ascending: true }).limit(30),
    ]);

    const profile = profileRes.data;
    const orders = ordersRes.data || [];
    const cart = (cartRes as any).data || [];
    const wishlist = (wishlistRes as any).data || [];
    const wallet = (walletRes as any).data;
    const recentMsgs = (recentMsgsRes as any).data || [];
    const history = historyRes.data || [];

    const systemPrompt = `You are a friendly, professional human-like customer support agent for CartSwift, an online marketplace.

You sound warm, empathetic, and natural — never robotic. Use casual professional tone, sometimes emojis sparingly. Keep replies concise (2-4 sentences usually). Never reveal you are an AI unless directly asked. Address the user by first name when you know it.

CUSTOMER CONTEXT (use it naturally, do not dump it):
- Name: ${profile?.full_name || "(unknown)"}, Email: ${profile?.email || "(unknown)"}
- Location: ${[profile?.city, profile?.country].filter(Boolean).join(", ") || "(unknown)"}
- Is seller: ${profile?.is_seller ? "Yes" : "No"}${profile?.is_seller ? `, total sales: ${profile?.total_sales}` : ""}
- Wallet: ${wallet ? `${wallet.balance} ${wallet.currency}` : "no wallet"}
- Recent orders (${orders.length}): ${orders.map(o => `${o.tracking_code || o.id.slice(0,6)} - ${o.status} - ${o.total_amount} ${o.currency}`).join(" | ") || "none"}
- Cart items: ${cart.length}${cart.length ? " (" + cart.slice(0,5).map((c: any) => c.items?.title).filter(Boolean).join(", ") + ")" : ""}
- Wishlist items: ${wishlist.length}
- Recent activity messages: ${recentMsgs.length}

STORE POLICIES:
- Shipping: 3-5 business days standard
- 30-day return policy
- VIP members get free shipping over $25
- Track orders at /track using tracking code

If user sends an image, briefly acknowledge what you see and help accordingly. If you cannot resolve something (refunds, account issues), promise to escalate to a human agent and tell them they'll hear back soon.`;

    const chatHistory = history.map((m: any) => {
      const role = m.sender === "user" ? "user" : "assistant";
      const parts: any[] = [];
      if (m.content) parts.push({ type: "text", text: m.content });
      if (m.image_url) parts.push({ type: "image_url", image_url: { url: m.image_url } });
      return { role, content: parts.length > 1 ? parts : (m.content || "[image]") };
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...chatHistory],
      }),
    });

    if (!response.ok) {
      const txt = await response.text();
      console.error("AI gateway error", response.status, txt);
      if (response.status === 429) {
        await supabase.from("support_messages").insert({ chat_id, sender: "ai", content: "I'm getting a lot of messages right now — please give me a moment and try again 🙏" });
      } else if (response.status === 402) {
        await supabase.from("support_messages").insert({ chat_id, sender: "ai", content: "Our support assistant is temporarily unavailable. A human agent will reply shortly." });
      }
      return new Response(JSON.stringify({ error: "AI error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const json = await response.json();
    const reply = json.choices?.[0]?.message?.content || "I'm here to help — could you tell me a bit more?";

    await supabase.from("support_messages").insert({ chat_id, sender: "ai", content: reply });
    await supabase.from("support_chats").update({ last_message_at: new Date().toISOString() }).eq("id", chat_id);

    return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-support-chat error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
