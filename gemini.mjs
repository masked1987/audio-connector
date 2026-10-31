// Core of the audio connector: send a piece of audio to Google Gemini and get
// back, in words, what it hears. Used by server.mjs (MCP tool) and listen.mjs (CLI).
// No dependencies: Node 18+ (built-in fetch).

import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const BASE = 'https://generativelanguage.googleapis.com';
export const DEFAULT_MODEL = 'gemini-flash-latest';   // Google's alias for its newest Flash model
const INLINE_MAX = 14 * 1024 * 1024;                 // up to this many bytes go inside the request
const FILE_MAX = 2 * 1024 * 1024 * 1024;             // Files API limit per file
const DOWNLOAD_MAX = 300 * 1024 * 1024;              // refuse bigger downloads from links

// File types Gemini can hear. Video files work too (it listens to the sound track).
export const MIME = {
  mp3: 'audio/mp3', wav: 'audio/wav', aif: 'audio/aiff', aiff: 'audio/aiff',
  aac: 'audio/aac', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg',
  flac: 'audio/flac', m4a: 'audio/mp4',
  mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/mov', webm: 'video/webm',
  mpeg: 'video/mpeg', mpg: 'video/mpg', avi: 'video/avi', '3gp': 'video/3gpp',
};
const MIME_ALIAS = { 'audio/mpeg': 'audio/mp3', 'audio/mpeg3': 'audio/mp3', 'audio/x-mp3': 'audio/mp3',
  'audio/x-wav': 'audio/wav', 'audio/wave': 'audio/wav', 'audio/vnd.wave': 'audio/wav',
  'audio/x-flac': 'audio/flac', 'audio/x-aiff': 'audio/aiff', 'audio/x-m4a': 'audio/mp4',
  'audio/m4a': 'audio/mp4', 'audio/vorbis': 'audio/ogg', 'audio/opus': 'audio/ogg',
  'video/quicktime': 'video/mov' };

const KEY_HELP = 'Get a free key at https://aistudio.google.com/apikey and save it as GEMINI_API_KEY ' +
  '(Claude Code cloud: the environment settings, under the cloud environment menu in the session ' +
  'title bar, then Edit; on a computer: an environment variable). A new session picks it up.';

// A problem worth telling the user about in plain words (not a crash).
export class ListenError extends Error {}

const apiKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function auth(extra = {}) {
  const h = { ...extra };
  const k = apiKey();
  if (k) h['x-goog-api-key'] = k;   // without it the request still goes out, in case the network adds the key
  return h;
}

// "1:30" / "01:02:03" / "90" / "90s" -> seconds.
export function parseTime(t) {
  if (t === undefined || t === null || t === '') return undefined;
  if (typeof t === 'number' && t >= 0) return t;
  const s = String(t).trim().replace(/s$/i, '');
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  const m = s.match(/^(?:(\d+):)?(\d{1,2}):(\d{2}(?:\.\d+)?)$/);
  if (!m) throw new ListenError(`"${t}" isn't a time I understand. Use minutes:seconds, like 1:30.`);
  return (Number(m[1] || 0) * 3600) + Number(m[2]) * 60 + Number(m[3]);
}

export function clock(sec) {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}

// Any YouTube / YouTube Music link -> the plain watch URL Gemini accepts, else null.
export function youtubeUrl(link) {
  let u;
  try { u = new URL(link); } catch { return null; }
  const host = u.hostname.replace(/^(www|m|music)\./, '');
  let id = null;
  if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = u.searchParams.get('v') || (u.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/) || [])[1];
  } else return null;
  if (!id || !/^[\w-]{6,}$/.test(id)) return null;
  return `https://www.youtube.com/watch?v=${id}`;
}

const NO_AUDIO_SITES = /(^|\.)(spotify\.com|music\.apple\.com|tidal\.com|deezer\.com|music\.amazon\.[a-z.]+)$/i;

function mimeFromName(name) {
  const ext = path.extname(name).slice(1).toLowerCase();
  return MIME[ext] || null;
}

function cleanMime(ct) {
  const m = String(ct || '').split(';')[0].trim().toLowerCase();
  return MIME_ALIAS[m] || m;
}

const SUPPORTED = 'mp3, wav, flac, ogg, m4a, aac, aiff (or a video file: mp4, mov, webm)';

async function loadFile(p) {
  const file = p.startsWith('file://') ? fileURLToPath(p) : path.resolve(p);
  let info;
  try { info = await stat(file); } catch { throw new ListenError(`I can't find the file ${file}.`); }
  if (!info.isFile()) throw new ListenError(`${file} is a folder, not an audio file.`);
  if (info.size > FILE_MAX) throw new ListenError(`${path.basename(file)} is over 2 GB, Gemini's limit per file.`);
  const mime = mimeFromName(file);
  if (!mime) throw new ListenError(`I don't know how to play ${path.basename(file)}. Supported: ${SUPPORTED}.`);
  return { bytes: await readFile(file), mime, name: path.basename(file) };
}

async function loadUrl(link, signal) {
  let host;
  try { host = new URL(link).hostname; } catch { throw new ListenError(`"${link}" doesn't look like a complete link.`); }
  if (NO_AUDIO_SITES.test(host)) {
    throw new ListenError(`${host} doesn't hand out the audio, so I can't listen through that link. ` +
      'Send a YouTube link to the same song, or a direct link to an audio file.');
  }
  let res;
  try { res = await fetch(link, { redirect: 'follow', signal }); } catch (e) {
    if (e.name === 'AbortError' || e.name === 'TimeoutError') throw e;
    throw new ListenError(`I couldn't download ${link} (${e.cause?.code || e.message}).`);
  }
  if (!res.ok) throw new ListenError(`I couldn't download ${link} (the site answered ${res.status}).`);
  const ct = cleanMime(res.headers.get('content-type'));
  if (/^(text\/|application\/(json|xhtml|xml))/.test(ct)) {
    throw new ListenError('That link opens a web page, not an audio file. Send a YouTube link or a direct ' +
      'link to the file (one that ends in .mp3, .wav and so on, or starts a download).');
  }
  const size = Number(res.headers.get('content-length') || 0);
  if (size > DOWNLOAD_MAX) throw new ListenError(`That file is ${Math.round(size / 1e6)} MB; I stop at ${DOWNLOAD_MAX / 1e6} MB for links.`);
  const pathname = new URL(res.url || link).pathname;
  const mime = (/^(audio|video)\//.test(ct) && ct) || mimeFromName(pathname);
  if (!mime) throw new ListenError(`I can't tell what kind of file ${link} is. Supported: ${SUPPORTED}.`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > DOWNLOAD_MAX) throw new ListenError(`That file is over ${DOWNLOAD_MAX / 1e6} MB; I stop there for links.`);
  return { bytes, mime, name: path.basename(pathname) || 'audio' };
}

// Turn a failed Gemini answer into a sentence the user can act on.
async function apiError(res, what) {
  let body = {};
  try { body = await res.json(); } catch { /* not JSON */ }
  const msg = body?.error?.message || res.statusText || '';
  const why = JSON.stringify(body?.error?.details || '');
  if (res.status === 403 && /unregistered callers|API key/i.test(msg)) {
    return new ListenError(`Gemini needs an API key and none was sent. ${KEY_HELP}`);
  }
  if (/API_KEY_INVALID|API key not valid|API_KEY_/i.test(msg + why)) {
    return new ListenError(`Gemini rejected the API key (it may be mistyped or deleted). ${KEY_HELP}`);
  }
  if (res.status === 429) {
    return new ListenError('Gemini says the key is out of quota for now (free keys have a per-minute and a ' +
      'per-day limit). Try again in a minute, or tomorrow if the daily limit is used up.');
  }
  if (res.status === 403) return new ListenError(`Gemini refused ${what} (403): ${msg}`);
  const err = new ListenError(`Gemini couldn't ${what} (${res.status}): ${msg}`);
  err.status = res.status;
  return err;
}

// fetch with up to 2 retries when Gemini is busy (500/503 happen at peak times).
async function call(url, init, what, opt) {
  const waits = opt._retryMs ?? [2000, 6000];
  for (let i = 0; ; i++) {
    let res;
    try {
      res = await fetch(url, { ...init, signal: opt.signal });
    } catch (e) {
      if (e.name === 'AbortError' || e.name === 'TimeoutError') throw e;
      if (i < waits.length) { await sleep(waits[i]); continue; }
      throw new ListenError(`I couldn't reach Gemini (${e.cause?.code || e.message}).`);
    }
    if (res.ok) return res;
    if ([500, 502, 503, 504].includes(res.status) && i < waits.length) { await sleep(waits[i]); continue; }
    throw await apiError(res, what);
  }
}

// Big files go through Google's Files API (kept 48 h, deleted by us when done).
async function upload(media, opt) {
  const start = await call(`${BASE}/upload/v1beta/files`, {
    method: 'POST',
    headers: auth({
      'X-Goog-Upload-Protocol': 'resumable', 'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(media.bytes.length),
      'X-Goog-Upload-Header-Content-Type': media.mime, 'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ file: { display_name: media.name.slice(0, 120) } }),
  }, 'start the upload', opt);
  const target = start.headers.get('x-goog-upload-url');
  if (!target) throw new ListenError('Gemini did not give an upload address; try again.');
  const done = await call(target, {
    method: 'POST',
    headers: auth({ 'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Command': 'upload, finalize' }),
    body: media.bytes,
  }, 'take the upload', opt);
  let file = (await done.json()).file;
  const pollMs = opt._pollMs ?? 2000;
  for (let i = 0; file?.state === 'PROCESSING'; i++) {
    if (i * pollMs > 180000) throw new ListenError('Gemini is still processing the upload after 3 minutes; try again later.');
    await sleep(pollMs);
    file = await (await call(`${BASE}/v1beta/${file.name}`, { headers: auth() }, 'check the upload', opt)).json();
  }
  if (!file || file.state === 'FAILED') throw new ListenError('Gemini could not read that file. Converting it to mp3 usually helps.');
  return file;
}

function forget(file) {
  if (!file?.name) return;
  fetch(`${BASE}/v1beta/${file.name}`, { method: 'DELETE', headers: auth() }).catch(() => {});
}

// If Google retires the alias, pick its newest stable Flash model that can answer.
let fallbackModel = null;
export async function newestFlash(opt = {}) {
  const res = await fetch(`${BASE}/v1beta/models?pageSize=1000`, { headers: auth(), signal: opt.signal });
  if (!res.ok) return null;
  const { models = [] } = await res.json();
  const names = models
    .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map((m) => m.name.replace(/^models\//, ''))
    .filter((n) => /^gemini-\d+(\.\d+)?-flash/.test(n) && !/(lite|image|tts|live|audio|embed|exp)/.test(n));
  const ver = (n) => parseFloat(n.match(/^gemini-(\d+(?:\.\d+)?)/)[1]);
  names.sort((a, b) => (/preview/.test(a) - /preview/.test(b)) || ver(b) - ver(a) || a.length - b.length);
  return names[0] || null;
}

const QUOTE_RULE = 'Do not write out song lyrics; describe what they are about and quote at most a few words.';

export function prompt({ question, from, to, youtube }) {
  const clip = (from !== undefined || to !== undefined) && !youtube
    ? `Only consider the part from ${clock(from ?? 0)} to ${to !== undefined ? clock(to) : 'the end'}.\n` : '';
  if (question && question.trim()) {
    return `${clip}Listen to the audio carefully and answer this:\n${question.trim()}\n\n` +
      `Point at moments with m:ss timestamps. Say when you are unsure. ${QUOTE_RULE}`;
  }
  return `${clip}Listen to this recording carefully and describe it for someone who cannot hear it. ` +
    'Be concrete, give estimates where asked, and say how sure you are.\n\n' +
    '1. What it is: genre and sub-genre, the era it sounds like, the overall vibe in one line. If you ' +
    'recognise the song or artist, say so and how sure you are; if not, say you do not know.\n' +
    '2. Tempo in BPM, time signature, key and major/minor (estimates).\n' +
    '3. Instruments and sounds; vocals (voice type, language, style, effects) or "instrumental".\n' +
    '4. Production and mix: polished or raw, loudness, bass, space and reverb, anything unusual.\n' +
    '5. Structure with m:ss timestamps (intro, verse, chorus, drop, bridge, outro) and how the energy moves.\n' +
    `6. Lyrics: what they are about, in your own words. ${QUOTE_RULE}\n` +
    '7. Standout moments, and what it sounds similar to (styles or artists).';
}

// Where the audio comes from -> the part Gemini receives (plus a cleanup step).
async function mediaPart(source, from, to, opt) {
  const s = String(source || '').trim();
  if (!s) throw new ListenError('Tell me what to listen to: a YouTube link, a link to an audio file, or a file path.');
  if (/^https?:\/\//i.test(s)) {
    const yt = youtubeUrl(s);
    if (yt) {
      const part = { fileData: { fileUri: yt } };
      if (from !== undefined || to !== undefined) {
        part.videoMetadata = {};
        if (from !== undefined) part.videoMetadata.startOffset = `${from}s`;
        if (to !== undefined) part.videoMetadata.endOffset = `${to}s`;
      }
      return { part, via: 'YouTube link', youtube: true };
    }
    return asPart(await loadUrl(s, opt.signal), opt);
  }
  return asPart(await loadFile(s), opt);
}

async function asPart(media, opt) {
  const mb = (media.bytes.length / 1e6).toFixed(1);
  if (media.bytes.length <= INLINE_MAX) {
    return { part: { inlineData: { mimeType: media.mime, data: media.bytes.toString('base64') } },
      via: `${media.name}, ${mb} MB sent directly` };
  }
  const file = await upload(media, opt);
  return { part: { fileData: { mimeType: file.mimeType || media.mime, fileUri: file.uri } },
    via: `${media.name}, ${mb} MB uploaded`, cleanup: () => forget(file) };
}

function answerText(data) {
  const cand = data?.candidates?.[0];
  if (!cand) {
    const why = data?.promptFeedback?.blockReason;
    throw new ListenError(why ? `Gemini refused to answer (${why}).` : 'Gemini sent back an empty answer; try again.');
  }
  const text = (cand.content?.parts || []).filter((p) => p.text && !p.thought).map((p) => p.text).join('').trim();
  const end = cand.finishReason;
  if (!text) {
    if (end === 'RECITATION') {
      throw new ListenError('Gemini stopped because its answer would repeat copyrighted material (usually ' +
        'lyrics). Ask for a description of the song instead of its words.');
    }
    if (end === 'SAFETY' || end === 'PROHIBITED_CONTENT' || end === 'BLOCKLIST') {
      throw new ListenError(`Gemini refused to describe this audio (${end}).`);
    }
    throw new ListenError(`Gemini sent back no text (${end || 'no reason given'}); try again.`);
  }
  return end === 'MAX_TOKENS' ? `${text}\n\n(Gemini's answer was cut off here.)` : text;
}

/**
 * Listen to audio through Gemini.
 * @param {object} a
 * @param {string} a.source    YouTube link, direct audio link, or local file path
 * @param {string} [a.question] what to listen for; empty = full description
 * @param {string|number} [a.start] [a.end]  clip, e.g. "1:30"
 * @param {string} [a.model]   Gemini model id (default GEMINI_MODEL or gemini-flash-latest)
 * @returns {Promise<{text: string, model: string, via: string, tokens?: number}>}
 */
export async function listen(a = {}) {
  const limit = AbortSignal.timeout(a._timeoutMs ?? 10 * 60 * 1000);
  const signal = a.signal && AbortSignal.any ? AbortSignal.any([a.signal, limit]) : (a.signal || limit);
  try {
    return await listenOnce(a, { signal, _retryMs: a._retryMs, _pollMs: a._pollMs });
  } catch (e) {
    if (e.name === 'TimeoutError' || (e.name === 'AbortError' && limit.aborted)) {
      throw new ListenError('Gemini took more than 10 minutes, so I gave up. A shorter clip (start/end) helps.');
    }
    throw e;
  }
}

async function listenOnce(a, opt) {
  const from = parseTime(a.start), to = parseTime(a.end);
  if (from !== undefined && to !== undefined && to <= from) throw new ListenError('The end time must come after the start time.');
  const media = await mediaPart(a.source, from, to, opt);
  const chosen = a.model || process.env.GEMINI_MODEL || '';
  let model = chosen || fallbackModel || DEFAULT_MODEL;
  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [media.part, { text: prompt({ question: a.question, from, to, youtube: media.youtube }) }] }],
    generationConfig: { temperature: 0.4 },
  });
  try {
    for (let tries = 0; ; tries++) {
      try {
        const res = await call(`${BASE}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST', headers: auth({ 'Content-Type': 'application/json' }), body,
        }, 'listen to it', opt);
        const data = await res.json();
        return { text: answerText(data), model: data.modelVersion || model, via: media.via,
          tokens: data.usageMetadata?.promptTokenCount };
      } catch (e) {
        if (e.status === 404 && !chosen && tries === 0) {
          const next = await newestFlash(opt);
          if (next && next !== model) { model = fallbackModel = next; continue; }
        }
        if (e.status === 404) {
          throw new ListenError(`Gemini has no model called "${model}" for this key. Set GEMINI_MODEL to one ` +
            'from https://ai.google.dev/gemini-api/docs/models (for example a "flash" model).');
        }
        throw e;
      }
    }
  } finally {
    media.cleanup?.();
  }
}

// Quick setup check without any audio: is a key there, does Gemini accept it, which model answers.
export async function check(opt = {}) {
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const lines = [apiKey() ? 'GEMINI_API_KEY is set.' : 'GEMINI_API_KEY is not set (trying anyway, in case the network adds it).'];
  const res = await fetch(`${BASE}/v1beta/models/${encodeURIComponent(model)}`, { headers: auth(), signal: opt.signal });
  if (res.ok) {
    const m = await res.json();
    lines.push(`Gemini accepted the key. Model ${model} is ready (${m.displayName || m.name}).`);
    return { ok: true, text: lines.join('\n') };
  }
  if (res.status === 404) {
    const next = await newestFlash(opt);
    if (next) {
      lines.push(`Gemini accepted the key. ${model} isn't offered, so I'll use ${next}.`);
      return { ok: true, text: lines.join('\n') };
    }
  }
  lines.push((await apiError(res, 'check the key')).message);
  return { ok: false, text: lines.join('\n') };
}
