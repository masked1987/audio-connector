# Notes for Claude

Read this first in every new session. Keep it up to date when something changes.

## What this is

Lets you "listen" to music: `gemini.mjs` sends audio to Google Gemini and returns
its description. You never hear the audio yourself; say that Gemini listened when
you pass the answer on, and that BPM / key are estimates.

When the owner asks you to listen to something:
- `node listen.mjs <source> [question] [--start m:ss] [--end m:ss]` works in any
  session that has this repo, right away (no restart, no approval).
- The MCP tool `listen` (server `gemini-audio`, from `.mcp.json`) does the same.
- Sources: YouTube / YouTube Music links (sent straight to Google), direct audio
  file links, local files. Spotify / Apple Music links can't work (no audio);
  ask for a YouTube link instead.
- Follow-up questions: call it again with the question, same source.
- Don't write out song lyrics; the prompt tells Gemini the same.

## How the owner works

- Not technical about this: plain language, short answers.
- Uses an Android phone (Claude app), dark mode.
- The key is `GEMINI_API_KEY` in the environment settings. Never ask for it in
  chat, never write it into the repo. `node listen.mjs --check` tests it.

## Things that bite

- No key / bad key / quota: the code turns Google's errors into a sentence that
  says what to do; pass that on as is.
- Requests up to 14 MB go inline; bigger ones use the Files API (resumable
  upload, wait for ACTIVE, delete afterwards).
- Default model is the alias `gemini-flash-latest`. If a model is missing (404),
  busy (5xx), out of free quota (429) or silent for 3 minutes, the next one is
  tried: newest stable `gemini-X-flash` from the model list, up to 4 models. The
  one that worked is remembered for 6 h (`$TMPDIR/gemini-audio-model.json`).
  `GEMINI_MODEL` pins one model (no swapping). `GEMINI_AUDIO_DEBUG=1` logs tries.
- `--check` sends a tiny real question: a model can be listed yet not answer.
- `node test/offline.mjs` must pass (fake Google in `test/fake-fetch.mjs`, no
  network).
- First live run 2026-10-31 worked (YouTube link + local wav). Seen that day:
  the alias (served as gemini-3.8-flash) was overloaded, 503s and ~150 s per
  answer; `gemini-3.6-flash` answered the same clip in ~12 s; `gemini-2.5-flash`
  is listed but 404s. BPM was right; key/chord on a test tone was wrong.
- The owner once committed the key as a file `GEMINI_API_KEY` to this public
  repo. It's in `.gitignore` now; if a key file shows up again, don't use or
  repeat it, tell them to delete that key in AI Studio and make a new one.
- Project MCP servers need a one-time approval in Claude Code; the CLI doesn't.
