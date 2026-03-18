# Restructure Music Player to React + ytmusic-api

## Planning

- [x] Explore existing project structure
- [x] Research ytmusic-api package capabilities
- [x] Write implementation plan
- [x] Get user approval on plan

## Execution

- [x] Delete old vanilla HTML/CSS/JS files
- [x] Initialize React project with Vite in the workspace
- [x] Set up Express backend with ytmusic-api + audio streaming
- [x] Build React components (Player, SearchBar, SongList, ProgressBar)
- [x] Implement API service layer connecting frontend to backend
- [x] Style the app with premium modern design (dark theme, glassmorphism)
- [x] Add playback controls, progress bar, volume, queue management

## Bug Fixes

- [x] Fix audio streaming (play-dl → @distube/ytdl-core → youtube-dl-exec)
- [x] Fix `addHeader` argument parsing issue on Windows
- [x] Add retry logic with 3 format fallbacks × 2 URL sources
- [x] Add audio URL caching (30-min TTL)

## Verification

- [x] Start backend server and verify API endpoints work
- [x] Start frontend dev server and verify UI renders
- [x] Test search → select song → play flow end-to-end in browser
- [x] Verify play/pause, next/prev, progress bar, volume controls
- [x] Verify audio streams with 206 Partial Content response
