# Dhun v2.0 — Comprehensive Testing & Bug Fixes

## Summary

Performed end-to-end testing of all Dhun v2.0 features. Found and fixed **2 bugs**. All core features verified working.

---

## Bugs Fixed

### Bug #1: Duplicate Time Display in Expanded Player

The `ProgressBar` component already renders `currentTime` and `duration` labels. The expanded player in `Player.jsx` was adding a second `player-expanded-times` div with the same values — causing times to appear twice.

**Fix:** Removed the redundant `player-expanded-times` div from the expanded player in `Player.jsx`.

---

### Bug #2: Artist Name Showing as Song Title

ytmusic-api sometimes returns `song.artist.name` equal to `song.name`, causing the artist field to display the song title. This affected search results, home sections, genre, playlist, and album endpoints.

**Fix:** Added a `resolveArtistName()` helper function in `server/routes/api.js` that:

1. Checks if `artist.name === song.name`
2. Falls back to the `artists[]` array (plural)
3. Falls back to `'Unknown Artist'`

Applied across **all 10 song-mapping locations** in `api.js`.

---

## Test Results

### ✅ All Passing

| Area | Tests | Status |
|------|-------|--------|
| **Home Page** | Trending sections, Recently Played, Liked Songs, Playlists, Albums, Recommendations | ✅ |
| **Search** | Debounced suggestions, search results, clear search | ✅ |
| **Genre Bar** | Pop, Hip-Hop, R&B, Rock, Bollywood filters | ✅ |
| **Playback** | Play/pause, progress bar seek, volume, audio streaming | ✅ |
| **Expanded Player** | Rotating thumbnail, controls, single time row | ✅ |
| **Queue Panel** | Opens, shows songs, badge count | ✅ |
| **Lyrics Panel** | Opens, shows lyrics or "No lyrics" fallback | ✅ |
| **Add to Playlist** | Modal with existing playlists + create new | ✅ |
| **Console** | No JavaScript errors | ✅ |
