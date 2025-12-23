import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getSupabaseClient = (req: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are missing (SUPABASE_URL / SUPABASE_ANON_KEY)');
  }

  // Forward the caller's JWT so RLS can enforce admin-only access.
  const authHeader = req.headers.get('Authorization') || '';

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
    auth: { persistSession: false },
  });
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

// Country-based name data for realistic email generation
const namesByCountry: Record<string, { firstNames: string[], lastNames: string[] }> = {
  usa: {
    firstNames: ['james', 'john', 'michael', 'david', 'william', 'joseph', 'charles', 'emma', 'olivia', 'sophia', 'ava', 'isabella', 'mia', 'charlotte', 'amelia', 'harper', 'mason', 'liam', 'noah', 'ethan', 'lucas', 'aiden', 'jackson', 'logan', 'sebastian', 'caleb', 'benjamin', 'henry', 'alexander', 'daniel'],
    lastNames: ['smith', 'johnson', 'williams', 'brown', 'jones', 'miller', 'davis', 'wilson', 'anderson', 'taylor', 'thomas', 'moore', 'martin', 'jackson', 'white', 'harris', 'clark', 'lewis', 'walker', 'hall']
  },
  uk: {
    firstNames: ['oliver', 'george', 'harry', 'jack', 'charlie', 'thomas', 'jacob', 'alfie', 'oscar', 'james', 'amelia', 'isla', 'ava', 'emily', 'isabella', 'mia', 'poppy', 'ella', 'lily', 'grace', 'sophie', 'evie', 'scarlett', 'freya', 'chloe'],
    lastNames: ['smith', 'jones', 'taylor', 'brown', 'williams', 'wilson', 'johnson', 'davies', 'robinson', 'wright', 'thompson', 'evans', 'walker', 'white', 'roberts', 'green', 'hall', 'wood', 'jackson', 'clarke']
  },
  nigeria: {
    firstNames: ['chinedu', 'oluwaseun', 'emeka', 'adebayo', 'tunde', 'chioma', 'ngozi', 'funke', 'aisha', 'fatima', 'yusuf', 'ibrahim', 'musa', 'abdul', 'blessing', 'grace', 'peace', 'faith', 'joy', 'victor', 'emmanuel', 'samuel', 'daniel', 'david', 'peter', 'paul', 'mary', 'esther', 'ruth', 'deborah'],
    lastNames: ['okonkwo', 'adeyemi', 'okafor', 'ibrahim', 'mohammed', 'abubakar', 'musa', 'suleiman', 'bello', 'usman', 'adebayo', 'olawale', 'ogundimu', 'eze', 'nnamdi', 'chukwu', 'igwe', 'okoro', 'nwosu', 'obiora']
  },
  india: {
    firstNames: ['rahul', 'amit', 'vijay', 'raj', 'arun', 'suresh', 'priya', 'neha', 'anjali', 'pooja', 'sunita', 'kavita', 'deepa', 'rekha', 'arjun', 'krishna', 'ravi', 'sanjay', 'vikram', 'karan', 'rohan', 'ankit', 'shivani', 'divya', 'sneha'],
    lastNames: ['sharma', 'verma', 'gupta', 'singh', 'kumar', 'patel', 'shah', 'reddy', 'rao', 'nair', 'menon', 'iyyer', 'das', 'roy', 'mukherjee', 'banerjee', 'chatterjee', 'ghosh', 'joshi', 'desai']
  },
  germany: {
    firstNames: ['lukas', 'leon', 'finn', 'jonas', 'felix', 'noah', 'elias', 'paul', 'max', 'ben', 'emma', 'mia', 'hannah', 'sophia', 'anna', 'lea', 'marie', 'lena', 'laura', 'julia', 'sarah', 'lisa', 'jana', 'nina', 'eva'],
    lastNames: ['muller', 'schmidt', 'schneider', 'fischer', 'weber', 'meyer', 'wagner', 'becker', 'schulz', 'hoffmann', 'koch', 'richter', 'klein', 'wolf', 'schroder', 'neumann', 'schwarz', 'braun', 'hofmann', 'zimmermann']
  },
  brazil: {
    firstNames: ['lucas', 'pedro', 'gabriel', 'rafael', 'mateus', 'gustavo', 'felipe', 'bruno', 'thiago', 'diego', 'ana', 'julia', 'beatriz', 'maria', 'larissa', 'camila', 'fernanda', 'isabela', 'leticia', 'carolina', 'paula', 'bruna', 'amanda', 'jessica', 'natalia'],
    lastNames: ['silva', 'santos', 'oliveira', 'souza', 'rodrigues', 'ferreira', 'alves', 'pereira', 'lima', 'gomes', 'costa', 'ribeiro', 'martins', 'carvalho', 'almeida', 'lopes', 'soares', 'fernandes', 'vieira', 'barbosa']
  },
  global: {
    firstNames: ['alex', 'sam', 'chris', 'jordan', 'taylor', 'jamie', 'morgan', 'casey', 'riley', 'drew', 'max', 'leo', 'sky', 'kai', 'avery', 'blake', 'cameron', 'dakota', 'eden', 'finley', 'hayden', 'jesse', 'kendall', 'logan', 'parker', 'quinn', 'reese', 'sage', 'sydney', 'terry'],
    lastNames: ['wilson', 'moore', 'clark', 'king', 'wright', 'hill', 'scott', 'green', 'adams', 'baker', 'nelson', 'carter', 'mitchell', 'perez', 'roberts', 'turner', 'phillips', 'campbell', 'parker', 'evans']
  }
};

const randomChoice = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomNum = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

const generateRandomEmail = (country: string = 'global'): string => {
  const countryData = namesByCountry[country.toLowerCase()] || namesByCountry.global;
  const firstName = randomChoice(countryData.firstNames);
  const lastName = randomChoice(countryData.lastNames);
  
  // More realistic year suffixes (birth years, graduation years)
  const yearSuffixes = [
    () => String(randomNum(85, 99)), // 85-99 (birth years 1985-1999)
    () => '0' + randomNum(0, 9), // 00-09 (birth years 2000-2009)
    () => String(randomNum(10, 24)), // 10-24 (recent years)
    () => String(randomNum(1985, 2005)), // Full birth year
  ];
  
  const getYear = () => randomChoice(yearSuffixes)();

  // More realistic, human-like email patterns (like samuelsunday1234, jamesandrill)
  const patterns = [
    // firstname + lastname (most common)
    () => `${firstName}${lastName}@gmail.com`,
    // firstname + lastname + small number
    () => `${firstName}${lastName}${randomNum(1, 99)}@gmail.com`,
    // firstname + lastname + 3-4 digits (very common)
    () => `${firstName}${lastName}${randomNum(100, 9999)}@gmail.com`,
    // firstname + lastname + year
    () => `${firstName}${lastName}${getYear()}@gmail.com`,
    // lastname + firstname 
    () => `${lastName}${firstName}@gmail.com`,
    // lastname + firstname + digits
    () => `${lastName}${firstName}${randomNum(1, 999)}@gmail.com`,
    // firstname only + year (very common pattern)
    () => `${firstName}${getYear()}@gmail.com`,
    // firstname + digits (common)
    () => `${firstName}${randomNum(1, 9999)}@gmail.com`,
    // firstname + firstname (double name like jamesdavid)
    () => `${firstName}${randomChoice(countryData.firstNames)}@gmail.com`,
    // firstname + firstname + digits
    () => `${firstName}${randomChoice(countryData.firstNames)}${randomNum(1, 999)}@gmail.com`,
    // initial + lastname + digits
    () => `${firstName[0]}${lastName}${randomNum(1, 999)}@gmail.com`,
    // firstname underscore lastname (occasional)
    () => `${firstName}_${lastName}@gmail.com`,
    // firstname underscore lastname + digits
    () => `${firstName}_${lastName}${randomNum(1, 99)}@gmail.com`,
    // the + firstname + lastname (like thejamessmith)
    () => `the${firstName}${lastName}@gmail.com`,
    // firstname + lastname initial + digits
    () => `${firstName}${lastName[0]}${randomNum(1, 999)}@gmail.com`,
    // real + firstname (like realjames)
    () => `real${firstName}${randomNum(1, 99)}@gmail.com`,
    // firstname + official
    () => `${firstName}official${randomNum(1, 99)}@gmail.com`,
  ];
  
  return randomChoice(patterns)();
};

const chunk = <T>(arr: T[], size: number) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const body = await req.json();
    const { action, topic, category, customPrompt, message, history } = body;
    console.log("AI Notification Assistant request:", { action, topic, category });

    if (action === 'getTemplates') {
      return new Response(JSON.stringify({ templates: notificationTemplates }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'generateEmails') {
      const { count: emailCount = 1000, country = 'global' } = body || {};
      const finalCount = Math.min(emailCount || 1000, 5000);

      console.log(`Generating ${finalCount} emails for country: ${country}`);

      const supabase = getSupabaseClient(req);

      // Generate a larger candidate pool, then filter out any previously-generated emails.
      const candidatesWanted = Math.min(finalCount * 4, 20000);
      const candidateSet = new Set<string>();
      while (candidateSet.size < candidatesWanted) {
        candidateSet.add(generateRandomEmail(country));
      }
      const candidates = Array.from(candidateSet);

      const existing = new Set<string>();
      for (const part of chunk(candidates, 200)) {
        const { data, error } = await supabase
          .from('marketing_emails')
          .select('email')
          .in('email', part);
        if (error) throw error;
        (data || []).forEach((r: any) => existing.add(r.email));
      }

      const fresh = candidates.filter((e) => !existing.has(e)).slice(0, finalCount);

      // Persist fresh emails so they are never returned again.
      if (fresh.length > 0) {
        const rows = fresh.map((email) => ({ email, country }));
        const { error } = await supabase
          .from('marketing_emails')
          .upsert(rows, { onConflict: 'email', ignoreDuplicates: true });

        // If this fails (usually admin auth/RLS), we must surface it; otherwise duplicates can reappear.
        if (error) {
          console.error('Upsert marketing_emails error:', error);
          throw error;
        }
      }

      return new Response(
        JSON.stringify({
          emails: fresh,
          country,
          availableCountries: Object.keys(namesByCountry),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
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
      console.log("Image response received:", JSON.stringify(imageData).substring(0, 500));
      
      // Check multiple possible paths for the generated image
      let generatedImage = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      
      // Alternative path: direct image_url in message
      if (!generatedImage) {
        generatedImage = imageData.choices?.[0]?.message?.image_url?.url;
      }
      
      // Alternative: images array at top level of message
      if (!generatedImage && imageData.choices?.[0]?.message?.images?.length > 0) {
        const img = imageData.choices[0].message.images[0];
        generatedImage = typeof img === 'string' ? img : img?.url || img?.image_url?.url;
      }
      
      // Alternative: content contains base64 image
      if (!generatedImage) {
        const content = imageData.choices?.[0]?.message?.content;
        if (typeof content === 'string' && content.startsWith('data:image')) {
          generatedImage = content;
        }
      }
      
      console.log("Extracted image URL:", generatedImage ? "Found (length: " + generatedImage.length + ")" : "Not found");
      
      return new Response(JSON.stringify({ 
        success: true,
        imageUrl: generatedImage || null,
        message: generatedImage ? "Image generated successfully" : "No image in response"
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