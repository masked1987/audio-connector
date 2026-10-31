// Stand-in for Google and for audio links, so the tests run offline and never
// spend quota. Load with `node --import ./test/fake-fetch.mjs ...` or import it.
// Every request is kept in globalThis.fakeCalls; tweak behaviour via globalThis.fake.

const BASE = 'https://generativelanguage.googleapis.com';
globalThis.fakeCalls = [];
globalThis.fake = globalThis.fake || {};

const json = (obj, status = 200, headers = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...headers } });

// What Gemini "heard": a summary of the request, so tests can check what was sent.
function heard(body) {
  const parts = body.contents[0].parts;
  const media = parts[0];
  const text = parts.find((p) => p.text)?.text || '';
  let what;
  if (media.inlineData) what = `inline ${media.inlineData.mimeType} ${Buffer.from(media.inlineData.data, 'base64').length} bytes`;
  else if (media.fileData) what = `file ${media.fileData.mimeType || '-'} ${media.fileData.fileUri}`;
  const clip = media.videoMetadata ? ` clip ${media.videoMetadata.startOffset || ''}-${media.videoMetadata.endOffset || ''}` : '';
  return `HEARD ${what}${clip} | PROMPT ${text}`;
}

const realFetch = globalThis.fetch;
let polls = 0;
globalThis.fetch = async (input, init = {}) => {
  const url = String(input instanceof Request ? input.url : input);
  const headers = Object.fromEntries(Object.entries(init.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
  const call = { url, method: init.method || 'GET', headers, body: init.body };
  globalThis.fakeCalls.push(call);
  const f = globalThis.fake;
  if (init.signal?.aborted) throw init.signal.reason;

  if (url.startsWith(BASE)) {
    if (!headers['x-goog-api-key']) {
      return json({ error: { code: 403, status: 'PERMISSION_DENIED',
        message: "Method doesn't allow unregistered callers (callers without established identity). Please use API Key or other form of API consumer identity to call this API." } }, 403);
    }
    if (headers['x-goog-api-key'] === 'bad') {
      return json({ error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT',
        details: [{ reason: 'API_KEY_INVALID' }] } }, 400);
    }
    const gen = url.match(/\/v1beta\/models\/([^:/]+):generateContent$/);
    if (gen) {
      const model = decodeURIComponent(gen[1]);
      if ((f.goneModels || []).includes(model)) return json({ error: { code: 404, message: `models/${model} is not found`, status: 'NOT_FOUND' } }, 404);
      if (f.busy > 0) { f.busy--; return json({ error: { code: 503, message: 'The model is overloaded.', status: 'UNAVAILABLE' } }, 503); }
      if (f.slowMs) await new Promise((r, j) => { const t = setTimeout(r, f.slowMs); init.signal?.addEventListener('abort', () => { clearTimeout(t); j(init.signal.reason); }); });
      if (f.finish === 'RECITATION') return json({ candidates: [{ finishReason: 'RECITATION', content: { parts: [] } }] });
      const body = JSON.parse(init.body);
      return json({ candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ text: heard(body) }] } }],
        usageMetadata: { promptTokenCount: 1234 }, modelVersion: model });
    }
    if (url === `${BASE}/v1beta/models?pageSize=1000`) {
      return json({ models: (f.models || []).map((n) => ({ name: `models/${n}`, supportedGenerationMethods: ['generateContent'] })) });
    }
    const one = url.match(/\/v1beta\/models\/([^:/?]+)$/);
    if (one && call.method === 'GET') {
      const model = decodeURIComponent(one[1]);
      if ((f.goneModels || []).includes(model)) return json({ error: { code: 404, message: 'not found', status: 'NOT_FOUND' } }, 404);
      return json({ name: `models/${model}`, displayName: `Fake ${model}` });
    }
    if (url === `${BASE}/upload/v1beta/files`) {
      return json({}, 200, { 'x-goog-upload-url': `${BASE}/upload/v1beta/files?upload_id=xyz` });
    }
    if (url === `${BASE}/upload/v1beta/files?upload_id=xyz`) {
      polls = 0;
      const mimeType = 'audio/mp3';
      return json({ file: { name: 'files/abc', uri: `${BASE}/v1beta/files/abc`, mimeType, state: f.processing ? 'PROCESSING' : 'ACTIVE' } });
    }
    if (url === `${BASE}/v1beta/files/abc`) {
      if (call.method === 'DELETE') return json({});
      polls++;
      return json({ name: 'files/abc', uri: `${BASE}/v1beta/files/abc`, mimeType: 'audio/mp3', state: polls >= 2 ? 'ACTIVE' : 'PROCESSING' });
    }
    return json({ error: { code: 404, message: `fake: no route for ${url}` } }, 404);
  }

  if (url === 'https://example.com/song.mp3') {
    return new Response(Buffer.alloc(5000, 7), { status: 200, headers: { 'content-type': 'audio/mpeg', 'content-length': '5000' } });
  }
  if (url === 'https://example.com/download?id=9') {   // no extension, type only in the header
    return new Response(Buffer.alloc(3000, 1), { status: 200, headers: { 'content-type': 'audio/flac' } });
  }
  if (url === 'https://example.com/page') {
    return new Response('<html>hi</html>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }
  if (url === 'https://example.com/missing.mp3') return new Response('nope', { status: 404 });
  if (f.passThrough) return realFetch(input, init);
  throw new TypeError('fetch failed (fake: offline)');
};
