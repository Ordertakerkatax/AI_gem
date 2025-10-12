import OpenAI from 'openai';

// This is the handler function for the Netlify Serverless Function
exports.handler = async (event, context) => {
  // Only allow POST requests for security and to handle the session creation request
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' }),
    };
  }

  // 1. Get secret keys securely from Netlify environment variables
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const WORKFLOW_ID = process.env.CHATKIT_WORKFLOW_ID;

  if (!OPENAI_API_KEY || !WORKFLOW_ID) {
    console.error("Missing critical environment variables.");
    return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server configuration error: Missing API keys.' }),
    };
  }

  // 2. Initialize the OpenAI client with the secret key
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  
  try {
    // Optional: Parse user-specific data if sent from frontend (e.g., user ID)
    let userData = {};
    try {
        userData = JSON.parse(event.body || '{}');
    } catch (e) {
        // Ignore if body is not valid JSON
    }

    // 3. Create the ChatKit session using the Agent Workflow ID
    const session = await openai.beta.chatkit.sessions.create({
      workflow_id: WORKFLOW_ID,
      // Pass a user ID to the session for better analytics and thread management
      user: { id: userData.deviceId || 'anonymous-user', name: 'Web User' },
    });

    // 4. Return ONLY the client_secret to the browser (secure!)
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ client_secret: session.client_secret }),
    };

  } catch (error) {
    console.error('OpenAI ChatKit Session Creation Failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create ChatKit session.' }),
    };
  }
};