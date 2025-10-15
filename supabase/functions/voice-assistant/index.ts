import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected websocket", { status: 426 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  let openaiWs: WebSocket | null = null;

  socket.onopen = async () => {
    console.log("Client connected");
    
    // Connect to OpenAI Realtime API
    const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
    openaiWs = new WebSocket(url, {
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "realtime=v1",
      },
    });

    openaiWs.onopen = () => {
      console.log("Connected to OpenAI");
    };

    openaiWs.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("OpenAI event:", data.type);

      // Send session.update after receiving session.created
      if (data.type === 'session.created') {
        const sessionConfig = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: `You are a helpful shopping assistant for CartSwift, an e-commerce platform. 
            Help users search for products, filter items, add to cart, place orders, and track shipments.
            Be conversational, friendly, and efficient. When users ask to perform actions, confirm what you understood before executing.`,
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 1000
            },
            tools: [
              {
                type: 'function',
                name: 'search_products',
                description: 'Search for products by keyword, category, or price range',
                parameters: {
                  type: 'object',
                  properties: {
                    query: { type: 'string', description: 'Search keyword' },
                    category: { type: 'string', description: 'Product category' },
                    max_price: { type: 'number', description: 'Maximum price' },
                    min_price: { type: 'number', description: 'Minimum price' }
                  }
                }
              },
              {
                type: 'function',
                name: 'add_to_cart',
                description: 'Add a product to the shopping cart',
                parameters: {
                  type: 'object',
                  properties: {
                    item_id: { type: 'string', description: 'Product ID to add' },
                    quantity: { type: 'number', description: 'Quantity to add', default: 1 }
                  },
                  required: ['item_id']
                }
              },
              {
                type: 'function',
                name: 'track_order',
                description: 'Track the status of an order',
                parameters: {
                  type: 'object',
                  properties: {
                    order_id: { type: 'string', description: 'Order ID to track' }
                  }
                }
              },
              {
                type: 'function',
                name: 'checkout',
                description: 'Proceed to checkout with items in cart',
                parameters: {
                  type: 'object',
                  properties: {
                    confirm: { type: 'boolean', description: 'Confirm checkout' }
                  }
                }
              }
            ],
            tool_choice: 'auto',
            temperature: 0.8,
          }
        };
        
        openaiWs?.send(JSON.stringify(sessionConfig));
        console.log("Session configuration sent");
      }

      // Forward all messages to client
      socket.send(JSON.stringify(data));
    };

    openaiWs.onerror = (error) => {
      console.error("OpenAI WebSocket error:", error);
      socket.send(JSON.stringify({ type: 'error', error: 'OpenAI connection error' }));
    };

    openaiWs.onclose = () => {
      console.log("OpenAI connection closed");
      socket.close();
    };
  };

  socket.onmessage = (event) => {
    if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
      openaiWs.send(event.data);
    }
  };

  socket.onclose = () => {
    console.log("Client disconnected");
    if (openaiWs) {
      openaiWs.close();
    }
  };

  socket.onerror = (error) => {
    console.error("Client socket error:", error);
  };

  return response;
});
