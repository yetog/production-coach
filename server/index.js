import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { parseActionFromResponse } from './lib/parse-action.js';
import { buildChatRequest, describeProviders, resolveProvider } from './lib/chat-provider.js';
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

// Which model answers as Dr. Zay. OpenAI or IONOS, decided from the
// environment at boot - see lib/chat-provider.js for why the request body
// cannot simply be shared between them.
const CHAT_PROVIDER = resolveProvider(process.env);

// How many tokens a reply may use. Higher for OpenAI: on gpt-5.x this budget
// also covers the model's internal reasoning, so the old 300 left very little
// for the visible answer and truncated it mid-sentence.
const MAX_REPLY_TOKENS = Number(
  process.env.CHAT_MAX_TOKENS ?? (CHAT_PROVIDER.id === 'openai' ? 800 : 300),
);

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

COMMAND CENTER ACTIONS:
When the user is ready to add musical content to their session, guide them to use the Command Center (the input box above the chat). Available commands include:
- "add trap drums for 32 bars at bar 1" - adds drums with explicit duration
- "add house drums from bars 1-16" - adds drums with bar range
- "add a melody in C major for 16 bars" - adds melody with duration
- "add jazzy chords in Am from bars 17-32" - adds chords to specific bars
- "add a dark 808 for 32 bars" - adds bass line with duration

DURATION TIPS:
- Use "for X bars" to specify how long: "add drums for 32 bars"
- Use "bars X-Y" for exact range: "add melody from bars 1-16"
- Default is 16 bars if not specified

Available drum styles: trap, house, hip-hop, lo-fi, rock, pop, drill, dnb, techno.

Always encourage them to specify duration for longer sections: "How many bars do you want this to cover?"

Current context: You're coaching someone in their Audiotool session. Help them learn and grow as a producer.`;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  const chat = describeProviders(CHAT_PROVIDER);
  res.json({
    status: 'ok',
    services: {
      // Kept so existing callers do not break, but `chat` is the useful one:
      // it names which provider and model is actually answering.
      ionos: CHAT_PROVIDER.id === 'ionos',
      openai: CHAT_PROVIDER.id === 'openai',
      chat,
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

    if (CHAT_PROVIDER.id === 'none') {
      return res.status(500).json({ error: CHAT_PROVIDER.reason });
    }

    // Build context-aware system prompt
    let systemPrompt = DR_ZAY_SYSTEM_PROMPT;
    if (goal) {
      systemPrompt += `\n\nThe user's current production goal: "${goal}"`;
    }
    if (sessionInfo) {
      systemPrompt += `\n\nCurrent session info: BPM=${sessionInfo.bpm || '?'}, Key=${sessionInfo.key || '?'}, Devices: ${sessionInfo.devices?.length || 0}`;
    }

    const request = buildChatRequest(
      CHAT_PROVIDER,
      [{ role: 'system', content: systemPrompt }, ...validated.messages],
      MAX_REPLY_TOKENS,
    );

    const response = await fetchWithTimeout(
      (signal) => fetch(request.url, {
        method: 'POST',
        signal,
        headers: request.headers,
        body: request.body,
      }),
      CHAT_TIMEOUT_MS,
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`${CHAT_PROVIDER.id} API error:`, error);
      return res.status(response.status).json({ error: 'AI service error' });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "Yo, something went wrong. Let's try that again.";

    // Parse for potential device suggestions
    const action = parseActionFromResponse(content);

    res.json({
      content,
      action,
      model: CHAT_PROVIDER.model,
      provider: CHAT_PROVIDER.id
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
  console.log(
    CHAT_PROVIDER.id === 'none'
      ? `Chat: NOT CONFIGURED - ${CHAT_PROVIDER.reason}`
      : `Chat: ${CHAT_PROVIDER.id} / ${CHAT_PROVIDER.model} (max ${MAX_REPLY_TOKENS} tokens)`,
  );
  console.log(`ElevenLabs: ${ELEVEN_LABS_API_KEY ? 'configured' : 'NOT CONFIGURED'}`);
});
