# Restructure Music Player to React + ytmusic-api

The existing "Dhun V1.0" was a vanilla HTML/CSS/JS music player with 17 local `.mp3` files. It has been **completely restructured** into a modern **React + Node.js** full-stack application that fetches songs from **YouTube Music** via `ytmusic-api` and streams audio via `youtube-dl-exec` (yt-dlp).

## Architecture

- **Backend (Express)** — Port `3001`. Proxies search/metadata requests to YouTube Music via `ytmusic-api`, extracts audio stream URLs via `yt-dlp`, and proxies audio to the frontend.
- **Frontend (React + Vite)** — Port `5173`. The player UI with search, results, and playback controls. API calls are proxied to the backend via Vite's dev server config.

> [!IMPORTANT]
> `ytmusic-api` is a **server-side** Node.js library and cannot run in the browser. Audio streaming uses `yt-dlp` (via `youtube-dl-exec`) to extract direct audio URLs from YouTube — this is unofficial and may be subject to YouTube's ToS.

## Project Structure

```
Music Player Advanced/
├── server/                          # Express backend
│   ├── package.json                 # express, cors, ytmusic-api, youtube-dl-exec
│   ├── index.js                     # Server entry (port 3001, CORS)
│   └── routes/
│       └── api.js                   # API: search, stream, suggestions, lyrics
├── client/                          # React frontend (Vite)
│   ├── package.json                 # react, react-dom, react-icons, vite
│   ├── vite.config.js               # React plugin + /api proxy
│   ├── index.html                   # Entry HTML with Google Fonts
│   └── src/
│       ├── main.jsx                 # React entry
│       ├── App.jsx / App.css        # Main layout + animated bg orbs
│       ├── index.css                # Design system (dark theme, tokens)
│       ├── api/musicApi.js          # Frontend fetch helpers
│       ├── context/PlayerContext.jsx # Global state (queue, playback, volume)
│       └── components/
│           ├── SearchBar.jsx/css    # Debounced search + suggestions
│           ├── SongList.jsx/css     # Results list + skeleton loading
│           ├── Player.jsx/css       # Fixed bottom player bar
│           └── ProgressBar.jsx/css  # Clickable progress with time
└── docs/                            # Project documentation
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search?q=<query>` | Search songs via `ytmusic.searchSongs()` |
| GET | `/api/suggestions?q=<query>` | Search suggestions via `ytmusic.getSearchSuggestions()` |
| GET | `/api/song/:videoId` | Song details via `ytmusic.getSong()` |
| GET | `/api/stream/:videoId` | Audio stream (yt-dlp → proxy) |
| GET | `/api/lyrics/:videoId` | Lyrics via `ytmusic.getLyrics()` |

## Audio Streaming Pipeline

1. Frontend sets `<audio src="/api/stream/{videoId}">`
2. Backend receives request → checks 30-min cache
3. If not cached, `extractAudioUrl()` tries:
   - 3 format options: `bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio` → `bestaudio*` → `best`
   - 2 URL sources: `music.youtube.com` → `youtube.com`
4. Extracted URL is cached and proxied (with Range header support for seeking)
5. Response: `206 Partial Content` with `audio/webm` content type

## How to Run

```bash
# Terminal 1 — Backend
cd server
npm install
npm run dev       # Starts on http://localhost:3001

# Terminal 2 — Frontend
cd client
npm install
npm run dev       # Starts on http://localhost:5173
```

## Dependencies

### Server

- `express` — HTTP server
- `cors` — Cross-origin resource sharing
- `ytmusic-api` — YouTube Music metadata scraper
- `youtube-dl-exec` — yt-dlp wrapper for audio URL extraction

### Client

- `react` / `react-dom` — UI framework
- `react-icons` — Icon library (Feather Icons)
- `vite` / `@vitejs/plugin-react` — Build tool
