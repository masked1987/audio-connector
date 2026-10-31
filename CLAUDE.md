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
- Default model is the alias `gemini-flash-latest`; on 404 it falls back to the
  newest stable `gemini-X-flash` from the model list. `GEMINI_MODEL` overrides.
- Free keys get 20 requests per model per day. When Google says the day's limit
  is spent, it switches to `gemini-flash-lite-latest` (its own 20) and adds a note
  saying so and when the main model is back; pass that on. Per-minute limits
  don't switch, they just say to wait a minute. Don't fire many calls at once.
- `node test/offline.mjs` must pass (fake Google in `test/fake-fetch.mjs`, no
  network). Works with the owner's real key (local mp3 files, 2026-10-31).
- Project MCP servers need a one-time approval in Claude Code; the CLI doesn't.
