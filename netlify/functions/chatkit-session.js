/**
 * Netlify Function to securely generate a ChatKit client_secret using the OpenAI REST API.
 * This bypasses the unstable OpenAI JS SDK methods to ensure compatibility.
 */
exports.handler = async (event, context) => {
    // 1. Method Check
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' }),
        };
    }

    // 2. Get secret keys securely from Netlify Environment Variables
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const WORKFLOW_ID = process.env.CHATKIT_WORKFLOW_ID;

    if (!OPENAI_API_KEY || !WORKFLOW_ID) {
        console.error("Missing critical environment variables.");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server configuration error: Missing API keys.' }),
        };
    }

    try {
        let userData = {};
        try {
            // Optional: Parse user-specific data from the frontend fetch request
            userData = JSON.parse(event.body || '{}');
        } catch (e) {
            // Invalid body data
        }

        // 3. Make the direct REST API call to OpenAI
        const response = await fetch("https://api.openai.com/v1/chatkit/sessions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Pass the secure API key in the Authorization header
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                // This header is CRITICAL for accessing the ChatKit beta feature
                "OpenAI-Beta": "chatkit_beta=v1",
            },
            body: JSON.stringify({
                workflow_id: WORKFLOW_ID,
                user: {
                    id: userData.deviceId || 'anonymous-user', 
                    name: 'Web User' 
                },
            }),
        });

        // 4. Handle non-200 API responses (e.g., 401 Unauthorized, 404 Not Found)
        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenAI API Failure Status:', response.status);
            console.error('OpenAI API Failure Details:', errorText);
            
            // Return a generic 500 status to the client, but log details on the server
            return { 
                statusCode: 500, 
                body: JSON.stringify({ 
                    error: "Failed to get secret token. Check Netlify logs for API error." 
                }) 
            };
        }

        // 5. Success: Return the client_secret to the frontend
        const { client_secret } = await response.json();

        console.log('Successfully created client secret.');
        
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ client_secret }),
        };

    } catch (error) {
        console.error('FATAL FUNCTION CRASH:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Fatal server error during processing.' }),
        };
    }
};
