import OpenAI from 'openai';

exports.handler = async (event, context) => {
  // ... (Method check code) ...

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const WORKFLOW_ID = process.env.CHATKIT_WORKFLOW_ID;

  // 1. Log that the function started and has keys
  console.log('Function started. Keys available:', !!OPENAI_API_KEY && !!WORKFLOW_ID);

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  try {
    let userData = {};
    try {
        userData = JSON.parse(event.body || '{}');
    } catch (e) { /* ignore */ }

    const session = await openai.chatkit.sessions.create({
      workflow_id: WORKFLOW_ID,
      user: { id: userData.deviceId || 'anonymous-user', name: 'Web User' },
    });

    // 2. Log successful session creation
    console.log('Session created successfully. Client secret length:', session.client_secret.length);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_secret: session.client_secret }),
    };

  } catch (error) {
    // 3. Log the actual OpenAI error
    console.error('OpenAI ChatKit Session API Failed:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create ChatKit session.' }),
    };
  }
};