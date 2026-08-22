import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseActionFromResponse } from './lib/parse-action.js';
import { buildChatRequest, describeProviders, resolveProvider } from './lib/chat-provider.js';
import { createProviderModel, runDrZayTurn } from './lib/agent-loop.js';
import { createProducerTools, ProducerToolError } from './lib/producer-tools.js';
import { createAgentBridgeClient, AgentBridgeError } from './lib/agent-bridge-client.js';
import {
  CHAT_TIMEOUT_MS,
  TTS_TIMEOUT_MS,
  fetchWithTimeout,
  validateChatMessages,
  validateTtsText,
} from './lib/guards.js';

dotenv.config();

// Logging setup
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGS_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

function logChat(entry) {
  const date = new Date().toISOString().split('T')[0];
  const logFile = path.join(LOGS_DIR, `chat-${date}.jsonl`);
  const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() }) + '\n';
  fs.appendFileSync(logFile, line);
}

function logNexus(entry) {
  const date = new Date().toISOString().split('T')[0];
  const logFile = path.join(LOGS_DIR, `nexus-${date}.jsonl`);
  const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() }) + '\n';
  fs.appendFileSync(logFile, line);
}

const app = express();
const PORT = process.env.PORT || 3021;

// Which model answers as Dr. Zay. OpenAI or IONOS, decided from the
// environment at boot - see lib/chat-provider.js for why the request body
// cannot simply be shared between them.
const CHAT_PROVIDER = resolveProvider(process.env);
const AGENT_BRIDGE_URL = process.env.AGENT_BRIDGE_URL || 'http://127.0.0.1:3022/api';

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

PROACTIVE MOVES (explain first, then the app offers a one-click button):
- When the genre calls for low end, propose a concrete 808 move in plain language,
  explaining WHY it fits the vibe FIRST, then name the move so the app can offer it.
- Phrase the move so it is actionable, e.g. "add a dark 808 under the drop" for
  trap weight, or "put an 808 at bar 33" to anchor a section. Always say the word
  "808" and, when you mean a section, "under the drop" or a specific "bar N".
- Only propose a move you are actually recommending — if you are advising against
  more low end, don't name an 808 to add.

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

/**
 * Agent chat: Dr. Zay can use typed producer tools. This route is additive to
 * /api/chat while the clients migrate; it deliberately keeps apply behind the
 * application's approval callback rather than allowing model text to mutate.
 */
app.post('/api/agent/chat', async (req, res) => {
  try {
    const { messages, goal, sessionInfo, project } = req.body ?? {};
    const validated = validateChatMessages(messages);
    if (!validated.ok) return res.status(validated.status).json({ error: validated.error });
    if (CHAT_PROVIDER.id === 'none') {
      return res.status(500).json({ error: CHAT_PROVIDER.reason });
    }

    let system = DR_ZAY_SYSTEM_PROMPT + `\n\nTOOL POLICY:
- For a producer change, call plan_change before suggesting Apply.
- Never claim a change was made from text alone.
- Do not call apply_plan unless the application has recorded explicit user approval.
- Ask a clarification question when the plan cannot identify a safe target.`;
    if (goal) system += `\n\nThe user's current production goal: "${goal}"`;
    if (sessionInfo) system += `\n\nClient session hint: BPM=${sessionInfo.bpm || '?'}, Key=${sessionInfo.key || '?'}, Devices=${sessionInfo.devices?.length || 0}`;

    const bridge = createAgentBridgeClient({ baseUrl: AGENT_BRIDGE_URL });
    const tools = createProducerTools({
      agent: bridge,
      project,
      // Approval is intentionally false for this first request. The client
      // must call the explicit producer apply endpoint after rendering a plan.
      approveApply: () => false,
    });
    const result = await runDrZayTurn({
      model: createProviderModel(CHAT_PROVIDER),
      system,
      messages: validated.messages,
      tools,
      maxOutputTokens: MAX_REPLY_TOKENS,
    });

    const steps = (result.steps || []).map((step) => ({
      toolCalls: step.toolCalls || [],
      toolResults: step.toolResults || [],
      finishReason: step.finishReason,
    }));
    const planResult = (result.steps || [])
      .flatMap((step) => step.toolResults || [])
      .map((toolResult) => toolResult.output ?? toolResult.result)
      .find((output) => output && typeof output === 'object' && typeof output.planId === 'string');
    res.json({
      content: result.text || "Yo, I need a little more detail before I make a move.",
      mode: 'agent',
      model: CHAT_PROVIDER.model,
      provider: CHAT_PROVIDER.id,
      plan: planResult,
      steps,
    });
  } catch (error) {
    const known = error instanceof ProducerToolError || error instanceof AgentBridgeError;
    console.error('Agent chat error:', error);
    res.status(known ? (error.status || 409) : 500).json({
      error: known ? error.message : 'Failed to run Dr. Zay agent',
      code: known ? error.code : 'agent_error',
    });
  }
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

    // Log chat for eval/fine-tuning
    logChat({
      type: 'chat',
      goal: goal || null,
      sessionInfo: sessionInfo || null,
      userMessage: validated.messages[validated.messages.length - 1]?.content || '',
      response: content,
      action: action,
      model: CHAT_PROVIDER.model,
      provider: CHAT_PROVIDER.id,
    });

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

// View chat logs (for eval/fine-tuning)
app.get('/api/logs/chat', (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const logFile = path.join(LOGS_DIR, `chat-${date}.jsonl`);

    if (!fs.existsSync(logFile)) {
      return res.json({ date, entries: [], message: 'No logs for this date' });
    }

    const content = fs.readFileSync(logFile, 'utf-8');
    const entries = content.trim().split('\n').filter(Boolean).map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);

    res.json({ date, entries, count: entries.length });
  } catch (error) {
    console.error('Error reading logs:', error);
    res.status(500).json({ error: 'Failed to read logs' });
  }
});

// View NEXUS logs
app.get('/api/logs/nexus', (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const logFile = path.join(LOGS_DIR, `nexus-${date}.jsonl`);

    if (!fs.existsSync(logFile)) {
      return res.json({ date, entries: [], message: 'No logs for this date' });
    }

    const content = fs.readFileSync(logFile, 'utf-8');
    const entries = content.trim().split('\n').filter(Boolean).map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);

    res.json({ date, entries, count: entries.length });
  } catch (error) {
    console.error('Error reading logs:', error);
    res.status(500).json({ error: 'Failed to read logs' });
  }
});

// Log NEXUS calls (called from frontend or bridge)
app.post('/api/logs/nexus', (req, res) => {
  try {
    const { type, command, plan, result, project } = req.body || {};
    logNexus({ type, command, plan, result, project });
    res.json({ ok: true });
  } catch (error) {
    console.error('Error writing nexus log:', error);
    res.status(500).json({ error: 'Failed to write log' });
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
