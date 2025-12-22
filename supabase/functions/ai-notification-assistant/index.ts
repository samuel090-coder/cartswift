import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Premium notification templates by category
const notificationTemplates = {
  morning: [
    { title: "☀️ Good Morning!", body: "Start your day with amazing deals waiting for you!", icon_emoji: "🌅" },
    { title: "🌤️ Rise & Shop", body: "Early bird catches the best deals! Check out what's new.", icon_emoji: "☀️" },
    { title: "☕ Morning Deals", body: "Fresh morning, fresh offers! Don't miss out today.", icon_emoji: "🌞" },
  ],
  afternoon: [
    { title: "🌞 Afternoon Flash!", body: "Midday savings are here! Limited time only.", icon_emoji: "⚡" },
    { title: "🍽️ Lunch Break Deals", body: "Take a break and browse our latest offers!", icon_emoji: "🛍️" },
    { title: "🎯 Today's Hot Picks", body: "Don't let these deals slip away this afternoon!", icon_emoji: "🔥" },
  ],
  evening: [
    { title: "🌙 Evening Exclusives", body: "Wind down with these special evening offers!", icon_emoji: "✨" },
    { title: "🌆 Sunset Sale", body: "As the day ends, the savings begin!", icon_emoji: "💫" },
    { title: "🛒 Tonight Only!", body: "Exclusive evening deals you can't miss!", icon_emoji: "🌟" },
  ],
  night: [
    { title: "🌃 Night Owl Deals", body: "Can't sleep? Shop our midnight specials!", icon_emoji: "🦉" },
    { title: "💤 Before You Sleep...", body: "Quick peek at tomorrow's best deals!", icon_emoji: "🌙" },
    { title: "✨ Midnight Magic", body: "Exclusive late-night offers just for you!", icon_emoji: "🔮" },
  ],
  reminder: [
    { title: "⏰ Don't Forget!", body: "Items in your wishlist are waiting for you!", icon_emoji: "💭" },
    { title: "🔔 Friendly Reminder", body: "Complete your purchase before it's gone!", icon_emoji: "⌛" },
    { title: "📌 Still Interested?", body: "Your cart misses you! Come back and checkout.", icon_emoji: "🛒" },
  ],
  newProduct: [
    { title: "🆕 Just Dropped!", body: "Be the first to check out our newest arrivals!", icon_emoji: "🎁" },
    { title: "🚀 New Launch Alert", body: "Fresh products are here! Don't miss the launch.", icon_emoji: "✨" },
    { title: "🎉 New & Exclusive", body: "Just in! Check out what's new in store.", icon_emoji: "🆕" },
  ],
  sale: [
    { title: "🔥 FLASH SALE!", body: "Massive discounts for a limited time only!", icon_emoji: "💥" },
    { title: "💰 Price Drop Alert", body: "Your wishlist items are now on sale!", icon_emoji: "📉" },
    { title: "🎊 MEGA SALE LIVE", body: "Up to 70% OFF! Shop now before it ends!", icon_emoji: "🛍️" },
  ],
  urgency: [
    { title: "⚡ LAST CHANCE!", body: "Only a few hours left! Grab yours now!", icon_emoji: "⏳" },
    { title: "🚨 Selling Fast!", body: "Limited stock remaining. Act now!", icon_emoji: "🔴" },
    { title: "⌛ Ending Soon!", body: "Don't miss out - offer expires today!", icon_emoji: "💨" },
  ],
  loyalty: [
    { title: "💎 VIP Exclusive", body: "Special offer just for our loyal customers!", icon_emoji: "👑" },
    { title: "🎁 Reward Unlocked", body: "You've earned a special discount! Claim it now.", icon_emoji: "🏆" },
    { title: "⭐ Thank You!", body: "As a valued customer, enjoy this exclusive offer.", icon_emoji: "💝" },
  ],
  seasonal: [
    { title: "🎄 Holiday Special", body: "Celebrate the season with amazing deals!", icon_emoji: "🎅" },
    { title: "🌸 Spring Collection", body: "Fresh styles for the new season!", icon_emoji: "🌷" },
    { title: "☀️ Summer Vibes", body: "Hot deals for the summer season!", icon_emoji: "🏖️" },
  ],
};

// Common first names for email generation
const firstNames = ['james', 'john', 'robert', 'michael', 'david', 'william', 'richard', 'joseph', 'thomas', 'charles', 'mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan', 'jessica', 'sarah', 'karen', 'alex', 'chris', 'sam', 'jordan', 'taylor', 'casey', 'morgan', 'riley', 'drew', 'jamie', 'max', 'leo', 'emma', 'olivia', 'ava', 'sophia', 'mia', 'luna', 'chloe', 'ella'];
const lastNames = ['smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller', 'davis', 'rodriguez', 'martinez', 'wilson', 'anderson', 'thomas', 'taylor', 'moore', 'jackson', 'martin', 'lee', 'perez', 'white', 'harris', 'clark', 'lewis', 'walker', 'hall', 'allen', 'young', 'king', 'wright', 'scott'];

const generateRandomEmail = (): string => {
  const patterns = [
    () => `${randomChoice(firstNames)}${randomChoice(lastNames)}${randomNum(100, 9999)}@gmail.com`,
    () => `${randomChoice(firstNames)}.${randomChoice(lastNames)}${randomNum(1, 99)}@gmail.com`,
    () => `${randomChoice(firstNames)}${randomNum(1990, 2005)}@gmail.com`,
    () => `${randomChoice(lastNames)}.${randomChoice(firstNames)}${randomNum(1, 999)}@gmail.com`,
    () => `${randomChoice(firstNames)[0]}${randomChoice(lastNames)}${randomNum(10, 9999)}@gmail.com`,
  ];
  return randomChoice(patterns)();
};

const randomChoice = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomNum = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { action, topic, category, customPrompt, message, history, count } = await req.json();
    console.log("AI Notification Assistant request:", { action, topic, category });

    if (action === 'getTemplates') {
      return new Response(JSON.stringify({ templates: notificationTemplates }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'generateEmails') {
      const emailCount = Math.min(count || 100, 500);
      const emails: string[] = [];
      const usedEmails = new Set<string>();
      
      while (emails.length < emailCount) {
        const email = generateRandomEmail();
        if (!usedEmails.has(email)) {
          usedEmails.add(email);
          emails.push(email);
        }
      }
      
      return new Response(JSON.stringify({ emails }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'chat') {
      const systemPrompt = `You are a helpful AI assistant for creating push notifications for an e-commerce store called CARTSWIFT.

Your job is to:
1. Understand what kind of notification the user wants
2. Create engaging, concise notification content
3. Keep titles under 50 characters and body under 100 characters
4. Use appropriate emojis
5. Make content feel urgent but not spammy

When you create a notification, ALWAYS include it in your response using this exact JSON format at the END of your message:
---NOTIFICATION---
{"title": "Your Title Here", "body": "Your message here", "icon_emoji": "🔔"}
---END---

Be conversational and helpful. Ask clarifying questions if needed.`;

      const messages = [
        { role: "system", content: systemPrompt },
        ...(history || []),
        { role: "user", content: message }
      ];

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Chat error:", response.status, errorText);
        throw new Error(`Chat failed: ${response.status}`);
      }

      const data = await response.json();
      let responseText = data.choices?.[0]?.message?.content || "I couldn't generate a response.";
      
      // Extract notification if present
      let notification = null;
      const notificationMatch = responseText.match(/---NOTIFICATION---\s*([\s\S]*?)\s*---END---/);
      if (notificationMatch) {
        try {
          notification = JSON.parse(notificationMatch[1].trim());
          responseText = responseText.replace(/---NOTIFICATION---[\s\S]*?---END---/, '').trim();
        } catch (e) {
          console.error("Failed to parse notification:", e);
        }
      }

      return new Response(JSON.stringify({ response: responseText, notification }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'generateImage') {
      const imagePrompt = customPrompt || `Create a professional, eye-catching notification banner image for: ${topic}. Style: modern, clean, vibrant colors, suitable for mobile push notification. No text in the image, just visual elements.`;
      
      console.log("Generating image with prompt:", imagePrompt);
      
      const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: imagePrompt
            }
          ],
          modalities: ["image", "text"]
        }),
      });

      if (!imageResponse.ok) {
        const errorText = await imageResponse.text();
        console.error("Image generation error:", imageResponse.status, errorText);
        throw new Error(`Image generation failed: ${imageResponse.status}`);
      }

      const imageData = await imageResponse.json();
      console.log("Image response received");
      
      const generatedImage = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      
      return new Response(JSON.stringify({ 
        success: true,
        imageUrl: generatedImage || null,
        message: generatedImage ? "Image generated successfully" : "No image generated"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'suggest') {
      const systemPrompt = `You are a professional push notification copywriter for an e-commerce store called CARTSWIFT. 
Generate engaging, concise push notification content that drives user engagement and clicks.
Keep titles under 50 characters and body under 100 characters.
Use appropriate emojis sparingly.
Make the content feel urgent but not spammy.`;

      const userPrompt = topic 
        ? `Generate 3 unique push notification variations for this topic: "${topic}". 
Return as JSON array with objects containing: title, body, icon_emoji`
        : category 
        ? `Generate 3 unique push notification variations for the "${category}" category.
Return as JSON array with objects containing: title, body, icon_emoji`
        : `Generate 3 unique, engaging push notification ideas for a general e-commerce store.
Return as JSON array with objects containing: title, body, icon_emoji`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "suggest_notifications",
                description: "Return 3 push notification suggestions",
                parameters: {
                  type: "object",
                  properties: {
                    suggestions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string", description: "Notification title (max 50 chars)" },
                          body: { type: "string", description: "Notification body (max 100 chars)" },
                          icon_emoji: { type: "string", description: "Single emoji for the notification icon" }
                        },
                        required: ["title", "body", "icon_emoji"],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ["suggestions"],
                  additionalProperties: false
                }
              }
            }
          ],
          tool_choice: { type: "function", function: { name: "suggest_notifications" } }
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const errorText = await response.text();
        console.error("AI suggestion error:", response.status, errorText);
        throw new Error(`AI suggestion failed: ${response.status}`);
      }

      const data = await response.json();
      console.log("AI response:", JSON.stringify(data));
      
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      let suggestions = [];
      
      if (toolCall?.function?.arguments) {
        try {
          const parsed = JSON.parse(toolCall.function.arguments);
          suggestions = parsed.suggestions || [];
        } catch (e) {
          console.error("Failed to parse tool arguments:", e);
        }
      }

      return new Response(JSON.stringify({ suggestions }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("AI Notification Assistant error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});