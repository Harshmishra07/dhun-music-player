# Dhun v2.0 — Feature Roadmap

## 🔥 High Impact

- [x] **Lyrics View** — Slide-up lyrics panel in the Player using existing `/api/lyrics/:videoId` endpoint
- [x] **Queue View** — Slide-out panel showing current queue with drag-to-reorder and remove
- [x] **Recently Played** — Store last 20 played songs in `localStorage`, show as home page section

## ✨ Polish & UX

- [x] **Keyboard Shortcuts** — Space (play/pause), arrows (seek), N/P (next/prev), M (mute)
- [x] **Mobile Responsive Player** — Full-screen expandable player view on mobile
- [x] **Song Queue Auto-play from Home** — Clicking a trending song auto-queues the entire section

## 🎨 Visual Upgrades

- [x] **Dynamic Background** — Extract dominant color from song thumbnail, tint background orbs
- [x] **Now Playing Animation** — Waveform/visualizer behind player bar using Web Audio API

## 🛠️ Technical

- [x] **Error Recovery** — Toast notifications on streaming failure with retry button
- [x] **PWA Support** — `manifest.json` + service worker for installable mobile app
