#!/usr/bin/env node
// Command line: let Claude (or you) listen to audio through Gemini.
//   node listen.mjs <youtube link | audio link | file> [question...] [--start 1:30] [--end 2:00] [--model id]
//   node listen.mjs --check      is the key set up and working?

import { listen, check, ListenError } from './gemini.mjs';

const USAGE = `Listen to audio through Google Gemini.

  node listen.mjs <source> [question] [--start m:ss] [--end m:ss] [--model id]
  node listen.mjs --check

  source    a YouTube / YouTube Music link, a direct link to an audio file,
            or a file path (mp3, wav, flac, ogg, m4a, aac, aiff, mp4, mov, webm)
  question  what to listen for; leave out for a full description

Needs GEMINI_API_KEY (free key: https://aistudio.google.com/apikey).`;

const args = process.argv.slice(2);
const flags = {};
const rest = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '-h' || a === '--help') flags.help = true;
  else if (a === '--check') flags.check = true;
  else if (/^--(start|end|model)$/.test(a)) flags[a.slice(2)] = args[++i];
  else if (/^--(start|end|model)=/.test(a)) { const [k, v] = a.slice(2).split(/=(.*)/s); flags[k] = v; }
  else rest.push(a);
}

try {
  if (flags.check) {
    const r = await check();
    console.log(r.text);
    process.exit(r.ok ? 0 : 1);
  }
  if (flags.help || !rest.length) {
    console.log(USAGE);
    process.exit(flags.help ? 0 : 2);
  }
  const [source, ...q] = rest;
  const r = await listen({ source, question: q.join(' '), start: flags.start, end: flags.end, model: flags.model });
  console.log(r.text);
  console.error(`\n(Heard by ${r.model}; ${r.via}${r.tokens ? `; ${r.tokens} tokens in` : ''}.)`);
} catch (e) {
  console.error(e instanceof ListenError ? e.message : e);
  process.exit(1);
}
