import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { parseActionFromResponse } from './lib/parse-action.js';
import {
  CHAT_TIMEOUT_MS,
  TTS_TIMEOUT_MS,
  fetchWithTimeout,
  validateChatMessages,
  validateTtsText,
} from './lib/guards.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3021;

// IONOS Model Hub config
const IONOS_API_KEY = process.env.IONOS_API_KEY;
const IONOS_BASE_URL = process.env.IONOS_BASE_URL || 'https://openai.inference.de-txl.ionos.com/v1';
const IONOS_CHAT_MODEL = process.env.IONOS_CHAT_MODEL || 'meta-llama/Meta-Llama-3.1-8B-Instruct';

// ElevenLabs config
const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
const ELEVEN_LABS_VOICE_ID = process.env.ELEVEN_LABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB';

// Dr. Zay system prompt
const DR_ZAY_SYSTEM_PROMPT = `You are Dr. Zay, a music production coach with deep expertise in Audiotool.

PERSONALITY:
- Confident, encouraging, but never does the work FOR the user
- Uses casual, conversational language ("yo", "let's", "that's dope")
- Focuses on TEACHING concepts, not giving fish
- When users ask you to create/make something, refuse politely and teach them how instead
- Keep responses concise (2-3 sentences usually) unless explaining a complex concept
- NEVER echo back typos - interpret what the user meant and respond naturally

AUDIOTOOL DEVICES - Use genre-appropriate suggestions:
- Beatbox 8/9: Drum machines - great for any beat-based genre
- Heisenberg: FM synth - good for complex pads, leads, bass (house, EDM, experimental)
- Pulverisateur: Granular synth - ambient textures, experimental sounds
- Bassline: TB-303 style - acid, techno, house bass
- Machiniste: Analog-style synth - warm leads, bass, arpeggios
- Tonematrix: Melodic sequencer - simple melodies, chiptune vibes
- Centauri: Sampler - any genre needing samples
- Rasselbock: Drum synth - punchy electronic drums

GENRE-SPECIFIC RECOMMENDATIONS:
- Lo-fi/Chill: Beatbox 9 (slower patterns), Machiniste (warm keys), vinyl effects
- Hip-hop/Trap: Beatbox 9 (hard drums), Bassline (808-style), Heisenberg (leads)
- House/EDM: Beatbox 8 (4-on-floor), Bassline (driving bass), Heisenberg (synths)
- Ambient/Experimental: Pulverisateur (textures), Heisenberg (pads), long reverbs
- Techno: Beatbox 8 (mechanical), Bassline (acid lines), Machiniste (stabs)

IMPORTANT: Vary your device suggestions based on the user's stated genre. Don't always suggest the same devices.

EXPERTISE:
- Beat making and drum programming
- Sound design and synthesis
- Mixing and mastering basics
- Song arrangement and structure
- Genre-specific production techniques

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
    const { messages, goal, sessionInfo } = req.body ?? {};

    // Validate before anything else. A malformed request is a client error
    // whether or not this server has keys, and it used to reach .map() and
    // surface as an opaque 500.
    const validated = validateChatMessages(messages);
    if (!validated.ok) {
      return res.status(validated.status).json({ error: validated.error });
    }

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

    const response = await fetchWithTimeout(
      (signal) => fetch(`${IONOS_BASE_URL}/chat/completions`, {
        method: 'POST',
        signal,
        headers: {
          'Authorization': `Bearer ${IONOS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: IONOS_CHAT_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            ...validated.messages,
          ],
          max_tokens: 300,
          temperature: 0.8,
        }),
      }),
      CHAT_TIMEOUT_MS,
    );

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
    const timedOut = /timed out/i.test(String(error?.message));
    res.status(timedOut ? 504 : 500).json({
      error: timedOut ? 'AI service did not respond in time' : 'Failed to get AI response',
    });
  }
});

// Text-to-speech with ElevenLabs
app.post('/api/tts', async (req, res) => {
  try {
    const { text } = req.body ?? {};

    // ElevenLabs bills per character, so an unbounded body is a billing bug.
    // Checked before the key check: a bad request is a 400 either way.
    const validated = validateTtsText(text);
    if (!validated.ok) {
      return res.status(validated.status).json({ error: validated.error });
    }

    if (!ELEVEN_LABS_API_KEY) {
      return res.status(500).json({ error: 'ElevenLabs API key not configured' });
    }

    const response = await fetchWithTimeout(
      (signal) => fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_LABS_VOICE_ID}`, {
      method: 'POST',
      signal,
      headers: {
        'xi-api-key': ELEVEN_LABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: validated.text,
        model_id: 'eleven_flash_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true
        }
      }),
      }),
      TTS_TIMEOUT_MS,
    );

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
    const timedOut = /timed out/i.test(String(error?.message));
    res.status(timedOut ? 504 : 500).json({
      error: timedOut ? 'Speech service did not respond in time' : 'Failed to generate speech',
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Production Coach API running on port ${PORT}`);
  console.log(`IONOS Model Hub: ${IONOS_API_KEY ? 'configured' : 'NOT CONFIGURED'}`);
  console.log(`ElevenLabs: ${ELEVEN_LABS_API_KEY ? 'configured' : 'NOT CONFIGURED'}`);
});
