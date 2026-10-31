// Offline tests: no key, no network, no quota. `node test/offline.mjs`
import './fake-fetch.mjs';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listen, check, parseTime, clock, youtubeUrl, prompt, forgetModel, ListenError } from '../gemini.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const dir = mkdtempSync(path.join(tmpdir(), 'audio-connector-'));
process.env.GEMINI_AUDIO_CACHE = path.join(dir, 'model.json');   // never touch the real one
const fast = { _retryMs: [1, 1], _pollMs: 1 };
let passed = 0;
const tests = [];
const test = (name, fn) => tests.push([name, fn]);
const reset = (key = 'test-key') => {
  globalThis.fakeCalls.length = 0;
  globalThis.fake = {};
  if (key) process.env.GEMINI_API_KEY = key; else delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;
  delete process.env.GEMINI_MODEL;
  forgetModel();
};
const rejects = (p, re) => assert.rejects(p, (e) => e instanceof ListenError && re.test(e.message));

// 1 second of a 440 Hz tone, as a real WAV file.
function wav(file, secs = 1) {
  const rate = 8000, n = rate * secs, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin(2 * Math.PI * 440 * i / rate) * 12000), 44 + i * 2);
  writeFileSync(file, b);
  return b;
}

test('times and links', () => {
  assert.equal(parseTime('1:30'), 90);
  assert.equal(parseTime('01:02:03'), 3723);
  assert.equal(parseTime('90'), 90);
  assert.equal(parseTime('90s'), 90);
  assert.equal(parseTime(''), undefined);
  assert.throws(() => parseTime('soon'), ListenError);
  assert.equal(clock(90), '1:30');
  assert.equal(clock(3723), '1:02:03');
  const W = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  for (const l of ['https://youtu.be/dQw4w9WgXcQ?si=abc', 'https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=x',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/shorts/dQw4w9WgXcQ', W]) {
    assert.equal(youtubeUrl(l), W, l);
  }
  assert.equal(youtubeUrl('https://example.com/watch?v=dQw4w9WgXcQ'), null);
  assert.equal(youtubeUrl('https://www.youtube.com/'), null);
});

test('default prompt asks for the full picture and no lyrics', () => {
  const p = prompt({});
  for (const w of ['BPM', 'key', 'Structure', 'timestamps', 'Do not write out song lyrics']) assert.match(p, new RegExp(w));
  assert.match(prompt({ question: 'is it in tune?', from: 90, to: 120 }), /from 1:30 to 2:00\.[\s\S]*is it in tune\?/);
  assert.doesNotMatch(prompt({ from: 90, youtube: true }), /Only consider/);   // YouTube clips use offsets instead
});

test('local wav goes inline, bytes intact', async () => {
  reset();
  const file = path.join(dir, 'tone.wav');
  const bytes = wav(file);
  const r = await listen({ source: file, ...fast });
  assert.match(r.text, new RegExp(`HEARD inline audio/wav ${bytes.length} bytes`));
  assert.equal(r.model, 'gemini-flash-latest');
  assert.match(r.via, /tone\.wav, 0\.0 MB sent directly/);
  const call = globalThis.fakeCalls.find((c) => c.url.includes(':generateContent'));
  assert.equal(call.headers['x-goog-api-key'], 'test-key');
  const sent = JSON.parse(call.body).contents[0].parts[0].inlineData.data;
  assert.deepEqual(Buffer.from(sent, 'base64'), bytes);
});

test('question and clip on a file', async () => {
  reset();
  const r = await listen({ source: path.join(dir, 'tone.wav'), question: 'what note is this?', start: '0:00', end: '0:01', ...fast });
  assert.match(r.text, /Only consider the part from 0:00 to 0:01\.[\s\S]*what note is this\?/);
});

test('YouTube link goes straight to Gemini, with clip offsets', async () => {
  reset();
  const r = await listen({ source: 'https://youtu.be/dQw4w9WgXcQ', start: '1:30', end: '2:00', ...fast });
  assert.match(r.text, /HEARD file - https:\/\/www\.youtube\.com\/watch\?v=dQw4w9WgXcQ clip 90s-120s/);
  assert.equal(r.via, 'YouTube link');
  assert.equal(globalThis.fakeCalls.length, 1);   // nothing downloaded
});

test('big file goes through the Files API and is deleted after', async () => {
  reset();
  globalThis.fake.processing = true;
  const file = path.join(dir, 'big.mp3');
  writeFileSync(file, Buffer.alloc(15 * 1024 * 1024, 3));
  const r = await listen({ source: file, ...fast });
  assert.match(r.text, /HEARD file audio\/mp3 https:\/\/generativelanguage\.googleapis\.com\/v1beta\/files\/abc/);
  assert.match(r.via, /uploaded/);
  const urls = globalThis.fakeCalls.map((c) => `${c.method} ${c.url.replace('https://generativelanguage.googleapis.com', '')}`);
  const start = globalThis.fakeCalls[0];
  assert.equal(start.headers['x-goog-upload-header-content-length'], String(15 * 1024 * 1024));
  assert.equal(start.headers['x-goog-upload-header-content-type'], 'audio/mp3');
  assert.ok(urls.includes('GET /v1beta/files/abc'), 'waited for processing');
  await new Promise((r) => setTimeout(r, 10));
  assert.ok(globalThis.fakeCalls.some((c) => c.method === 'DELETE'), 'upload removed afterwards');
});

test('audio links are downloaded; type from header', async () => {
  reset();
  assert.match((await listen({ source: 'https://example.com/song.mp3', ...fast })).text, /HEARD inline audio\/mp3 5000 bytes/);
  assert.match((await listen({ source: 'https://example.com/download?id=9', ...fast })).text, /HEARD inline audio\/flac 3000 bytes/);
});

test('helpful errors for links and files that will not work', async () => {
  reset();
  await rejects(listen({ source: 'https://open.spotify.com/track/abc', ...fast }), /doesn't hand out the audio.*YouTube/);
  await rejects(listen({ source: 'https://example.com/page', ...fast }), /web page, not an audio file/);
  await rejects(listen({ source: 'https://example.com/missing.mp3', ...fast }), /answered 404/);
  await rejects(listen({ source: 'https://unreachable.example/x.mp3', ...fast }), /couldn't download/);
  await rejects(listen({ source: path.join(dir, 'nope.mp3'), ...fast }), /can't find the file/);
  writeFileSync(path.join(dir, 'notes.txt'), 'hi');
  await rejects(listen({ source: path.join(dir, 'notes.txt'), ...fast }), /don't know how to play notes\.txt/);
  await rejects(listen({ source: '', ...fast }), /Tell me what to listen to/);
  await rejects(listen({ source: 'https://', ...fast }), /doesn't look like a complete link/);
  await rejects(listen({ source: 'https://youtu.be/dQw4w9WgXcQ', start: '2:00', end: '1:00', ...fast }), /end time must come after/);
});

test('missing or wrong key explains how to fix it', async () => {
  reset(null);
  await rejects(listen({ source: 'https://youtu.be/dQw4w9WgXcQ', ...fast }), /needs an API key.*aistudio\.google\.com\/apikey.*GEMINI_API_KEY/);
  reset('bad');
  await rejects(listen({ source: 'https://youtu.be/dQw4w9WgXcQ', ...fast }), /rejected the API key/);
  reset(null);
  process.env.GOOGLE_API_KEY = 'test-key';   // the other common name works too
  assert.match((await listen({ source: 'https://youtu.be/dQw4w9WgXcQ', ...fast })).text, /HEARD/);
});

test('retired default model: falls back to the newest stable Flash', async () => {
  reset();
  globalThis.fake.goneModels = ['gemini-flash-latest'];
  globalThis.fake.models = ['gemini-2.5-flash', 'gemini-3.5-flash-preview', 'gemini-3-flash', 'gemini-3-flash-lite',
    'gemini-3-pro', 'gemini-3-flash-image', 'gemini-3-flash-tts'];
  const r = await listen({ source: 'https://youtu.be/dQw4w9WgXcQ', ...fast });
  assert.equal(r.model, 'gemini-3-flash');
  reset();
  globalThis.fake.goneModels = ['nope-model'];
  await rejects(listen({ source: 'https://youtu.be/dQw4w9WgXcQ', model: 'nope-model', ...fast }), /no model called "nope-model"/);
  process.env.GEMINI_MODEL = 'gemini-3-pro';
  assert.equal((await listen({ source: 'https://youtu.be/dQw4w9WgXcQ', ...fast })).model, 'gemini-3-pro');
});

test('busy Gemini is retried; lyric block is explained', async () => {
  reset();
  globalThis.fake.busy = 2;
  assert.match((await listen({ source: 'https://youtu.be/dQw4w9WgXcQ', ...fast })).text, /HEARD/);
  reset();
  globalThis.fake.busy = 5;
  await rejects(listen({ source: 'https://youtu.be/dQw4w9WgXcQ', ...fast }), /\(503\): The model is overloaded/);
  reset();
  globalThis.fake.busyModels = ['gemini-flash-latest', 'gemini-3.8-flash'];
  globalThis.fake.models = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3-flash-preview'];
  assert.equal((await listen({ source: 'https://youtu.be/dQw4w9WgXcQ', ...fast })).model, 'gemini-3.5-flash');
  // The next request starts with the model that worked, and does not ask for the list again.
  globalThis.fakeCalls.length = 0;
  assert.equal((await listen({ source: 'https://youtu.be/dQw4w9WgXcQ', ...fast })).model, 'gemini-3.5-flash');
  assert.equal(globalThis.fakeCalls.length, 1);
  // A model the user picked is not swapped.
  process.env.GEMINI_MODEL = 'gemini-3.8-flash';
  await rejects(listen({ source: 'https://youtu.be/dQw4w9WgXcQ', ...fast }), /\(503\): This model is currently/);
  reset();
  globalThis.fake.busyModels = ['gemini-flash-latest', 'gemini-3.5-flash'];
  globalThis.fake.models = ['gemini-3.5-flash'];
  await rejects(listen({ source: 'https://youtu.be/dQw4w9WgXcQ', ...fast }), /\(503\): This model is currently/);
  reset();
  globalThis.fake.finish = 'RECITATION';
  await rejects(listen({ source: 'https://youtu.be/dQw4w9WgXcQ', ...fast }), /copyrighted material/);
});

test('slow answers time out with a plain message; a stuck model is swapped', async () => {
  reset();
  globalThis.fake.slowMs = 1000;
  await rejects(listen({ source: 'https://youtu.be/dQw4w9WgXcQ', _timeoutMs: 50, ...fast }), /more than 10 minutes/);
  reset();
  globalThis.fake.stuckModels = ['gemini-flash-latest'];
  globalThis.fake.models = ['gemini-3.5-flash'];
  assert.equal((await listen({ source: 'https://youtu.be/dQw4w9WgXcQ', _stallMs: 30, ...fast })).model, 'gemini-3.5-flash');
  reset();
  globalThis.fake.stuckModels = ['gemini-flash-latest'];
  await rejects(listen({ source: 'https://youtu.be/dQw4w9WgXcQ', _stallMs: 30, ...fast }), /didn't answer/);
});

test('setup check', async () => {
  reset();
  assert.match((await check()).text, /accepted the key\. Model gemini-flash-latest is ready\./);
  reset();
  globalThis.fake.busyModels = ['gemini-flash-latest'];
  globalThis.fake.models = ['gemini-3.5-flash'];
  const busy = await check(fast);
  assert.equal(busy.ok, true);
  assert.match(busy.text, /Model gemini-3\.5-flash is ready \(gemini-flash-latest didn't answer/);
  reset('bad');
  assert.match((await check()).text, /rejected the API key/);
  reset(null);
  const r = await check();
  assert.equal(r.ok, false);
  assert.match(r.text, /not set[\s\S]*needs an API key/);
});

// Talk to server.mjs the way Claude Code does: JSON lines over stdin/stdout.
function rpc(env = {}) {
  const child = spawn(process.execPath, ['--import', path.join(here, 'fake-fetch.mjs'), path.join(root, 'server.mjs')],
    { env: { ...process.env, GEMINI_API_KEY: 'test-key', ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
  let buf = '';
  const waiting = new Map();
  const got = [];
  child.stdout.on('data', (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const m = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1);
      got.push(m);
      waiting.get(m.id)?.(m);
    }
  });
  let err = '';
  child.stderr.on('data', (d) => { err += d; });
  const write = (m) => child.stdin.write(JSON.stringify(m) + '\n');
  const ask = (id, method, params) => new Promise((res) => { waiting.set(id, res); write({ jsonrpc: '2.0', id, method, params }); });
  return { child, ask, write, got, stderr: () => err };
}

test('MCP server: handshake, tool list, a call, errors', async () => {
  const s = rpc();
  const init = await s.ask(1, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0' } });
  assert.equal(init.result.protocolVersion, '2025-06-18');
  assert.equal(init.result.serverInfo.name, 'gemini-audio');
  assert.ok(init.result.capabilities.tools);
  s.write({ jsonrpc: '2.0', method: 'notifications/initialized' });
  const list = await s.ask(2, 'tools/list', {});
  assert.deepEqual(list.result.tools.map((t) => t.name), ['listen']);
  assert.deepEqual(list.result.tools[0].inputSchema.required, ['source']);
  const call = await s.ask(3, 'tools/call', { name: 'listen', arguments: { source: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', question: 'where is the chorus?' } });
  assert.equal(call.result.isError, false);
  assert.match(call.result.content[0].text, /HEARD file - https:\/\/www\.youtube\.com\/watch\?v=dQw4w9WgXcQ \| PROMPT [\s\S]*where is the chorus\?/);
  assert.match(call.result.content[0].text, /\(Heard by gemini-flash-latest; YouTube link\.\)$/);
  const bad = await s.ask(4, 'tools/call', { name: 'listen', arguments: { source: 'https://open.spotify.com/track/x' } });
  assert.equal(bad.result.isError, true);
  assert.match(bad.result.content[0].text, /Spotify|spotify/);
  assert.equal((await s.ask(5, 'tools/call', { name: 'sing', arguments: {} })).error.code, -32602);
  assert.equal((await s.ask(6, 'resources/list', {})).error.code, -32601);
  assert.deepEqual((await s.ask(7, 'ping')).result, {});
  const old = await s.ask(8, 'initialize', { protocolVersion: '2023-01-01' });
  assert.equal(old.result.protocolVersion, '2025-11-25');
  assert.ok(s.got.every((m) => m.jsonrpc === '2.0'));
  s.child.stdin.end();
  await new Promise((r) => s.child.on('exit', r));
  assert.equal(s.stderr(), '');
});

test('MCP server: cancelled call gets no answer, server keeps going', async () => {
  const s = rpc();
  await s.ask(1, 'initialize', { protocolVersion: '2025-06-18' });
  s.write({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'listen', arguments: { source: 'https://example.com/song.mp3' } } });
  s.write({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 2 } });
  assert.deepEqual((await s.ask(3, 'ping')).result, {});
  await new Promise((r) => setTimeout(r, 200));
  assert.ok(!s.got.some((m) => m.id === 2), 'no reply to the cancelled call');
  s.child.stdin.end();
  await new Promise((r) => s.child.on('exit', r));
});

for (const [name, fn] of tests) {
  try { await fn(); passed++; console.log(`ok  ${name}`); } catch (e) { console.log(`FAIL ${name}`); console.log(e); process.exitCode = 1; }
}
rmSync(dir, { recursive: true, force: true });
console.log(`\n${passed}/${tests.length} passed`);
