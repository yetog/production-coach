import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3021;

// IONOS Model Hub config
const IONOS_API_KEY = process.env.IONOS_API_KEY;
const IONOS_BASE_URL = process.env.IONOS_BASE_URL || 'https://openai.inference.de-txl.ionos.com/v1';
const IONOS_CHAT_MODEL = process.env.IONOS_CHAT_MODEL || 'meta-llama/llama-3.1-8b-instruct';

// ElevenLabs config
const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
const ELEVEN_LABS_VOICE_ID = process.env.ELEVEN_LABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB';

// Dr. Zay system prompt
const DR_ZAY_SYSTEM_PROMPT = `You are Dr. Zay, a music production coach with deep expertise in Audiotool.
Your personality:
- Confident, encouraging, but never does the work FOR the user
- Uses casual, conversational language ("yo", "let's", "that's dope")
- Focuses on TEACHING concepts, not giving fish
- When users ask you to create/make something, refuse politely and teach them how instead
- Keep responses concise (2-3 sentences usually) unless explaining a complex concept
- Reference Audiotool devices by name: Beatbox 8/9, Heisenberg, Pulverisateur, Bassline, etc.
- You can suggest adding devices to their session when relevant

Your expertise includes:
- Beat making and drum programming
- Sound design and synthesis
- Mixing and mastering basics
- Song arrangement and structure
- Genre-specific production techniques (lo-fi, house, trap, ambient, etc.)

Current context: You're coaching someone in their Audiotool session. Help them learn and grow as a producer.`;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    services: {
      ionos: !!IONOS_API_KEY,
      elevenlabs: !!ELEVEN_LABS_API_KEY
    }
  });
});

// Chat completion with IONOS Model Hub
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, goal, sessionInfo } = req.body;

    if (!IONOS_API_KEY) {
      return res.status(500).json({ error: 'IONOS API key not configured' });
    }

    // Build context-aware system prompt
    let systemPrompt = DR_ZAY_SYSTEM_PROMPT;
    if (goal) {
      systemPrompt += `\n\nThe user's current production goal: "${goal}"`;
    }
    if (sessionInfo) {
      systemPrompt += `\n\nCurrent session info: BPM=${sessionInfo.bpm || '?'}, Key=${sessionInfo.key || '?'}, Devices: ${sessionInfo.devices?.length || 0}`;
    }

    const response = await fetch(`${IONOS_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${IONOS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: IONOS_CHAT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({
            role: m.role === 'coach' ? 'assistant' : m.role,
            content: m.content
          }))
        ],
        max_tokens: 300,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('IONOS API error:', error);
      return res.status(response.status).json({ error: 'AI service error' });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "Yo, something went wrong. Let's try that again.";

    // Parse for potential device suggestions
    const action = parseActionFromResponse(content);

    res.json({
      content,
      action,
      model: IONOS_CHAT_MODEL
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

// Text-to-speech with ElevenLabs
app.post('/api/tts', async (req, res) => {
  try {
    const { text } = req.body;

    if (!ELEVEN_LABS_API_KEY) {
      return res.status(500).json({ error: 'ElevenLabs API key not configured' });
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_LABS_VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVEN_LABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_flash_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true
        }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs API error:', error);
      return res.status(response.status).json({ error: 'TTS service error' });
    }

    // Stream the audio back
    res.setHeader('Content-Type', 'audio/mpeg');
    response.body.pipe(res);

  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
});

// Parse AI response for actionable suggestions
function parseActionFromResponse(content) {
  const lowerContent = content.toLowerCase();

  // Check for device suggestions
  const devicePatterns = [
    { pattern: /beatbox\s*8/i, device: 'beatbox8', name: 'Beatbox 8' },
    { pattern: /beatbox\s*9/i, device: 'beatbox9', name: 'Beatbox 9' },
    { pattern: /heisenberg/i, device: 'heisenberg', name: 'Heisenberg' },
    { pattern: /pulverisateur/i, device: 'pulverisateur', name: 'Pulverisateur' },
    { pattern: /bassline/i, device: 'bassline', name: 'Bassline' },
    { pattern: /machiniste/i, device: 'machiniste', name: 'Machiniste' },
    { pattern: /tonematrix/i, device: 'tonematrix', name: 'Tonematrix' },
  ];

  for (const { pattern, device, name } of devicePatterns) {
    if (pattern.test(content) && /add|try|use|grab|throw/i.test(lowerContent)) {
      return {
        type: 'add_device',
        label: `Add ${name}`,
        description: `Add ${name} to your session`,
        params: { deviceType: device, displayName: name }
      };
    }
  }

  return null;
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Production Coach API running on port ${PORT}`);
  console.log(`IONOS Model Hub: ${IONOS_API_KEY ? 'configured' : 'NOT CONFIGURED'}`);
  console.log(`ElevenLabs: ${ELEVEN_LABS_API_KEY ? 'configured' : 'NOT CONFIGURED'}`);
});
