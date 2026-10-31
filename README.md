# Audio connector (Claude listens through Gemini)

Claude can't hear audio. Google Gemini can. This connector sends a song (or any
audio) to Gemini and hands its description back to Claude: genre, tempo, key,
instruments, vocals, mix, structure with timestamps, mood, or the answer to a
specific question ("where does the drop hit?").

It's a second-hand report: Claude reads what Gemini heard. BPM and key are estimates.

## What it can listen to

- **YouTube and YouTube Music links**: passed straight to Google, nothing downloaded.
  Public videos only.
- **Direct links to audio files** (a link that ends in `.mp3`, `.wav`… or starts a download).
- **Files** in the session: mp3, wav, flac, ogg, m4a, aac, aiff, or a video file
  (mp4, mov, webm; Gemini listens to the sound track).
- Not Spotify / Apple Music / Tidal links: those sites don't give out the audio.
  Use a YouTube link to the same song instead.

Optional: `start` / `end` (like `1:30`) to listen to one part only, and a
`question` to ask for something specific. Long files are fine (they go through
Google's Files API and are deleted right after).

## Setup (once)

1. Get a free Gemini API key: https://aistudio.google.com/apikey
2. Save it as **`GEMINI_API_KEY`**:
   - Claude Code on the web / phone: the environment settings (cloud environment
     menu in the session title bar, then Edit). New sessions pick it up.
   - On a computer: an environment variable.
   Never paste the key into a chat or commit it.
3. Check it: `node listen.mjs --check`

Optional: `GEMINI_MODEL` picks another model (default `gemini-flash-latest`, Google's
name for its newest Flash model; if Google ever drops that name, the newest stable
Flash model is picked automatically).

## Using it

**In a Claude Code session with this repo**, just ask: "listen to
https://youtu.be/… and tell me the BPM and where the chorus starts". Claude runs:

```
node listen.mjs <link or file> [question] [--start 1:30] [--end 2:00]
```

**As an MCP tool** (`listen`): `.mcp.json` registers the `gemini-audio` server
for sessions that open this repo as their main folder. Claude Code may ask once
to approve it; if the tool doesn't show up, the command line above does the same job. On your own computer, to have it everywhere:

```
claude mcp add --scope user gemini-audio -- node /full/path/to/audio-connector/server.mjs
```

Claude Desktop (`claude_desktop_config.json`):

```json
{ "mcpServers": { "gemini-audio": {
    "command": "node", "args": ["/full/path/to/audio-connector/server.mjs"],
    "env": { "GEMINI_API_KEY": "your key" } } } }
```

## Files

| File | What it does |
| --- | --- |
| `gemini.mjs` | The core: reads the file / link, sends it to Gemini, turns errors into plain sentences |
| `server.mjs` | MCP server (stdio) with one tool, `listen` |
| `listen.mjs` | Command line version |
| `test/offline.mjs` | Tests with a fake Google (no key, no network): `node test/offline.mjs` |

No dependencies, Node 20 or newer. Cost: a free key covers casual use; Gemini
counts about 32 tokens per second of audio (a 4-minute song ≈ 8,000 tokens).
