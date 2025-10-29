/**
 * Netlify Function to securely generate a ChatKit client_secret.
 * This version is updated to correctly use environment variables and handle unique user IDs.
 */
exports.handler = async (event) => {
    // 1. Method Check: Ensure the request is a POST.
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' }),
        };
    }

    // 2. Securely get secrets from Netlify Environment Variables.
    const { OPENAI_API_KEY, CHATKIT_WORKFLOW_ID } = process.env;

    if (!OPENAI_API_KEY || !CHATKIT_WORKFLOW_ID) {
        console.error("Missing critical environment variables: OPENAI_API_KEY or CHATKIT_WORKFLOW_ID.");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server configuration error: Missing API keys.' }),
        };
    }

    try {
        let userId = 'anonymous-fallback-user'; // A default, though client should always provide one.
        try {
            // 3. Parse the unique user ID sent from the frontend.
            const body = JSON.parse(event.body || '{}');
            if (body.userId) {
                userId = body.userId;
            } else {
                console.warn("Request received without a userId. A fallback will be used.");
            }
        } catch (e) {
            console.error("Could not parse request body:", e);
            // Proceed with fallback userId.
        }

        // 4. Make the direct REST API call to OpenAI.
        const response = await fetch("https://api.openai.com/v1/chatkit/sessions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                // This header is CRITICAL for accessing the ChatKit beta feature.
                "OpenAI-Beta": "chatkit_beta=v1",
            },
            body: JSON.stringify({
                workflow: {
                    // **FIX:** Use the WORKFLOW_ID from your environment variables, not a hardcoded string.
                    id: CHATKIT_WORKFLOW_ID
                },
                // **FIX:** Use the unique userId from the client request.
                user: userId
            }),
        });

        // 5. Handle non-200 API responses (e.g., 401 Unauthorized, 404 Not Found).
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`OpenAI API Failure Status: ${response.status}`);
            console.error('OpenAI API Failure Details:', errorText);
            
            return { 
                statusCode: 500, 
                body: JSON.stringify({ 
                    error: "Failed to create a session token. See Netlify function logs for details." 
                }) 
            };
        }

        // 6. Success: Return the client_secret to the frontend.
        const { client_secret } = await response.json();
        console.log(`Successfully created client secret for user: ${userId}`);
        
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ client_secret }),
        };

    } catch (error) {
        console.error('FATAL FUNCTION CRASH:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'A fatal server error occurred.' }),
        };
    }
};