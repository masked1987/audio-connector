#!/usr/bin/env node
// MCP server (stdio) with one tool, `listen`: Claude hands over a YouTube link,
// an audio link or a file path, Gemini listens, and its description comes back.
// No dependencies; speaks newline-delimited JSON-RPC 2.0 as the MCP spec asks.

import { createInterface } from 'node:readline';
import { listen, ListenError } from './gemini.mjs';

const NAME = 'gemini-audio';
const VERSION = '1.0.0';
const PROTOCOLS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

const TOOL = {
  name: 'listen',
  title: 'Listen to audio (via Gemini)',
  description:
    'Listen to music or any audio and get a description back. Google Gemini does the listening; ' +
    'the answer is its report of what it heard (genre, tempo, key, instruments, vocals, mix, ' +
    'structure with timestamps, mood), or its answer to your question. Accepts a YouTube or ' +
    'YouTube Music link, a direct link to an audio file, or a local file path (mp3, wav, flac, ogg, ' +
    'm4a, aac, aiff, or a video file). Spotify and Apple Music links do not work (no audio). ' +
    'BPM and key are estimates; say so when passing them on.',
  inputSchema: {
    type: 'object',
    properties: {
      source: { type: 'string', description: 'YouTube link, direct audio file link, or local file path (absolute is safest).' },
      question: { type: 'string', description: 'What to listen for, e.g. "where does the drop hit and how does the bass change?". Leave out for a full description.' },
      start: { type: 'string', description: 'Optional: only listen from here, e.g. "1:30".' },
      end: { type: 'string', description: 'Optional: stop listening here, e.g. "2:15".' },
      model: { type: 'string', description: 'Optional Gemini model id. Default: GEMINI_MODEL, else gemini-flash-latest.' },
    },
    required: ['source'],
    additionalProperties: false,
  },
  annotations: { title: 'Listen to audio (via Gemini)', readOnlyHint: true, openWorldHint: true },
};

const INSTRUCTIONS =
  'Use the `listen` tool whenever the user wants you to hear something: a song, a mix, a beat, a voice ' +
  'note. You do not hear the audio yourself; Gemini listens and reports, so treat its answer as a ' +
  'second-hand description and say that to the user. For a follow-up question about the same audio, ' +
  'call `listen` again with the question.';

const running = new Map();   // request id -> AbortController, for notifications/cancelled

process.stdout.on('error', () => process.exit(0));   // client went away
const send = (msg) => process.stdout.write(JSON.stringify(msg) + '\n');
const reply = (id, result) => send({ jsonrpc: '2.0', id, result });
const fail = (id, code, message) => send({ jsonrpc: '2.0', id, error: { code, message } });

async function onRequest(id, method, params) {
  switch (method) {
    case 'initialize': {
      const asked = params?.protocolVersion;
      return reply(id, {
        protocolVersion: PROTOCOLS.includes(asked) ? asked : PROTOCOLS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: NAME, title: 'Gemini audio connector', version: VERSION },
        instructions: INSTRUCTIONS,
      });
    }
    case 'ping':
      return reply(id, {});
    case 'tools/list':
      return reply(id, { tools: [TOOL] });
    case 'tools/call': {
      if (params?.name !== TOOL.name) return fail(id, -32602, `Unknown tool: ${params?.name}`);
      const ctl = new AbortController();
      running.set(id, ctl);
      try {
        const r = await listen({ ...(params.arguments || {}), signal: ctl.signal });
        const note = `\n\n(Heard by ${r.model}; ${r.via}.)`;
        return reply(id, { content: [{ type: 'text', text: r.text + note }], isError: false });
      } catch (e) {
        if (ctl.signal.aborted) return;   // cancelled: the spec says not to answer
        const text = e instanceof ListenError ? e.message : `Something went wrong: ${e.message}`;
        if (!(e instanceof ListenError)) console.error(e);
        return reply(id, { content: [{ type: 'text', text }], isError: true });
      } finally {
        running.delete(id);
      }
    }
    default:
      return fail(id, -32601, `Method not found: ${method}`);
  }
}

function onMessage(msg) {
  if (!msg || typeof msg !== 'object' || typeof msg.method !== 'string') return;   // responses: we send no requests
  const { id, method, params } = msg;
  if (id === undefined || id === null) {
    if (method === 'notifications/cancelled') running.get(params?.requestId)?.abort();
    return;   // other notifications need no answer
  }
  onRequest(id, method, params).catch((e) => { console.error(e); fail(id, -32603, e.message); });
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', (line) => {
  if (!line.trim()) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); }
  for (const m of Array.isArray(msg) ? msg : [msg]) onMessage(m);
});
rl.on('close', () => {
  for (const c of running.values()) c.abort();
  process.exit(0);
});
