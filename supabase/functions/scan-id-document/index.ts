import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    // Support both camelCase and snake_case for flexibility
    const image_url = body.image_url || body.imageUrl;
    
    if (!image_url) {
      console.error('Request body:', JSON.stringify(body));
      throw new Error('Image URL is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Scanning ID document from URL:', image_url);

    // Call Lovable AI Gateway to analyze the ID document
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that extracts information from ID documents. 
            Analyze the provided ID document image and extract the following information if visible:
            - Full Name
            - Date of Birth (in YYYY-MM-DD format)
            - Gender (male, female, or other)
            - Country/Nationality
            - ID Number
            - ID Type (passport, driver's license, national ID, voter's card, etc.)
            - Expiry Date (in YYYY-MM-DD format if visible)
            
            Return ONLY a JSON object with these fields. Use null for any field you cannot extract.
            Example response format:
            {
              "full_name": "John Doe",
              "date_of_birth": "1990-01-15",
              "gender": "male",
              "country": "United States",
              "id_number": "ABC123456",
              "id_type": "passport",
              "expiry_date": "2025-01-15",
              "has_photo": true
            }
            
            If the image is not a valid ID document, return:
            {"error": "Invalid ID document", "valid": false}
            
            Be accurate and only extract information that is clearly visible in the document.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please analyze this ID document and extract all visible information. Return the data as a JSON object.'
              },
              {
                type: 'image_url',
                image_url: { url: image_url }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI service error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    console.log('AI Response:', content);

    // Parse the JSON response from AI
    let extractedData;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      extractedData = {
        error: 'Could not parse ID information',
        raw_response: content
      };
    }

    // Validate the extracted data
    if (extractedData.error || extractedData.valid === false) {
      return new Response(
        JSON.stringify({
          success: false,
          message: extractedData.error || 'Invalid ID document',
          data: null
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'ID document scanned successfully',
        data: {
          full_name: extractedData.full_name || null,
          date_of_birth: extractedData.date_of_birth || null,
          gender: extractedData.gender || null,
          country: extractedData.country || null,
          id_number: extractedData.id_number || null,
          id_type: extractedData.id_type || null,
          expiry_date: extractedData.expiry_date || null,
          has_photo: extractedData.has_photo || false,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error scanning ID:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Failed to scan ID document',
        data: null
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
