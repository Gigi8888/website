// Cloudflare Worker Script (worker.js)

// Define the Gemini API endpoint (base URL without the key)
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export default {
  async fetch(request, env, ctx) {
    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // --- CORS Handling ---
    // Create headers for the response, allowing requests from any origin (*)
    // For production, you might want to restrict this to your actual website domain
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*', // Or 'https://your-website.com'
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight requests (OPTIONS method)
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    // --- End CORS Handling ---


    try {
      // Get the user's message from the request body
      const requestBody = await request.json();
      const userMessage = requestBody?.message;

      if (!userMessage) {
        return new Response(JSON.stringify({ error: 'Message is required in the request body' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // *** IMPORTANT: Get the API key from Cloudflare Secrets ***
      // You must set this secret named 'GEMINI_API_KEY' in your Worker's settings
      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) {
         console.error("GEMINI_API_KEY secret not set in Cloudflare Worker environment.");
        return new Response(JSON.stringify({ error: 'API key configuration error on server' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Construct the full Gemini API URL with the key
      const apiUrl = `${GEMINI_API_ENDPOINT}?key=${apiKey}`;

      // Prepare the payload for the Gemini API
      const geminiPayload = {
        contents: [{
          parts: [{ text: userMessage }],
        }],
      };

      // Make the request to the Gemini API
      const geminiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(geminiPayload),
      });

      // Check if the request to Gemini was successful
      if (!geminiResponse.ok) {
        const errorData = await geminiResponse.text(); // Get raw error text
        console.error(`Gemini API Error (${geminiResponse.status}): ${errorData}`);
        return new Response(JSON.stringify({ error: `Gemini API failed with status ${geminiResponse.status}` }), {
          status: geminiResponse.status, // Forward Gemini's error status
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get the JSON response from Gemini
      const geminiData = await geminiResponse.json();

      // Return the Gemini response data back to the frontend
      return new Response(JSON.stringify(geminiData), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Worker Error:', error);
      return new Response(JSON.stringify({ error: 'An internal server error occurred' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
}; 