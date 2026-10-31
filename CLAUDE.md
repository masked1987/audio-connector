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

## Animation project (Veyron Hollow)

The owner also uses these sessions for an animated story. Its characters,
places and gear are saved in the owner's Higgsfield account. Read
`animation/veyron-hollow.md` first; it has every name, Higgsfield element ID,
who looks after whom, and the open questions. Keep it up to date. Never spend
Higgsfield credits without the owner's go-ahead and a stated price.

## Things that bite

- No key / bad key / quota: the code turns Google's errors into a sentence that
  says what to do; pass that on as is.
- Requests up to 14 MB go inline; bigger ones use the Files API (resumable
  upload, wait for ACTIVE, delete afterwards).
- Default model is the alias `gemini-flash-latest`; on 404 it falls back to the
  newest stable `gemini-X-flash` from the model list. `GEMINI_MODEL` overrides.
- `node test/offline.mjs` must pass (fake Google in `test/fake-fetch.mjs`, no
  network). Not yet tried with a real key: the first live run is still to do.
- Project MCP servers need a one-time approval in Claude Code; the CLI doesn't.
