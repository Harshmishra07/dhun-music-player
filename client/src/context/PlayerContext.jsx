import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { getStreamUrl, getRecommendations, prefetchSong } from '../api/musicApi.js';

const PlayerContext = createContext(null);

export function usePlayer() {
    const ctx = useContext(PlayerContext);
    if (!ctx) throw new Error('usePlayer must be inside PlayerProvider');
    return ctx;
}

// ─── Recently Played helpers ─────────────────────────────────────────
const RECENTLY_PLAYED_KEY = 'dhun-recently-played';
const MAX_RECENTLY_PLAYED = 20;

function loadRecentlyPlayed() {
    try {
        const raw = localStorage.getItem(RECENTLY_PLAYED_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveRecentlyPlayed(list) {
    try {
        localStorage.setItem(RECENTLY_PLAYED_KEY, JSON.stringify(list));
    } catch { /* quota exceeded, ignore */ }
}

// ─── User Playlists helpers ──────────────────────────────────────────
const USER_PLAYLISTS_KEY = 'dhun-user-playlists';

function loadUserPlaylists() {
    try {
        const raw = localStorage.getItem(USER_PLAYLISTS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveUserPlaylists(playlists) {
    try {
        localStorage.setItem(USER_PLAYLISTS_KEY, JSON.stringify(playlists));
    } catch { /* ignore */ }
}

// ─── Favourites helpers ──────────────────────────────────────────────
const FAVOURITES_KEY = 'dhun-favourites';

function loadFavourites() {
    try {
        const raw = localStorage.getItem(FAVOURITES_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveFavourites(list) {
    try {
        localStorage.setItem(FAVOURITES_KEY, JSON.stringify(list));
    } catch { /* ignore */ }
}

// ─── Dominant color extraction ───────────────────────────────────────
const colorCache = new Map();

function extractDominantColor(thumbnailUrl) {
    return new Promise((resolve) => {
        if (!thumbnailUrl) {
            resolve(null);
            return;
        }

        // Return cached color if we already extracted it
        if (colorCache.has(thumbnailUrl)) {
            resolve(colorCache.get(thumbnailUrl));
            return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const size = 10; // sample small area for speed
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, size, size);
                const data = ctx.getImageData(0, 0, size, size).data;

                let r = 0, g = 0, b = 0, count = 0;
                for (let i = 0; i < data.length; i += 4) {
                    // Skip very dark & very light pixels
                    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    if (brightness > 30 && brightness < 230) {
                        r += data[i];
                        g += data[i + 1];
                        b += data[i + 2];
                        count++;
                    }
                }

                if (count > 0) {
                    const color = `${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)}`;
                    colorCache.set(thumbnailUrl, color);
                    resolve(color);
                } else {
                    resolve(null);
                }
            } catch {
                resolve(null); // CORS tainted canvas
            }
        };
        img.onerror = () => resolve(null);
        img.src = thumbnailUrl;
    });
}

// ─── Toast ID counter ────────────────────────────────────────────────
let toastIdCounter = 0;

export function PlayerProvider({ children }) {
    const audioRef = useRef(new Audio());
    const [currentSong, setCurrentSong] = useState(null);
    const [queue, setQueue] = useState([]);
    const [queueIndex, setQueueIndex] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolumeState] = useState(0.7);
    const [isLoading, setIsLoading] = useState(false);
    const [shuffle, setShuffle] = useState(false);
    const [repeat, setRepeat] = useState('off'); // 'off' | 'all' | 'one'

    // ─── Recently Played ─────────────────────────────────────────────
    const [recentlyPlayed, setRecentlyPlayed] = useState(loadRecentlyPlayed);

    // ─── User Playlists ──────────────────────────────────────────────
    const [userPlaylists, setUserPlaylists] = useState(loadUserPlaylists);

    // ─── Favourites ──────────────────────────────────────────────────
    const [favourites, setFavourites] = useState(loadFavourites);

    // ─── Dominant Color ──────────────────────────────────────────────
    const [dominantColor, setDominantColor] = useState(null);

    // ─── Toasts ──────────────────────────────────────────────────────
    const [toasts, setToasts] = useState([]);

    const audio = audioRef.current;
    const handleNextRef = useRef(null);

    // Add toast helper
    const addToast = useCallback((message, type = 'info', options = {}) => {
        const id = ++toastIdCounter;
        setToasts(prev => [...prev.slice(-4), { id, message, type, ...options }]);
        return id;
    }, []);

    const dismissToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Audio event listeners
    useEffect(() => {
        const a = audio;

        const onTimeUpdate = () => setCurrentTime(a.currentTime);
        const onLoadedMetadata = () => {
            setDuration(a.duration);
            setIsLoading(false);
        };
        const onEnded = () => {
            if (handleNextRef.current) handleNextRef.current();
        };
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onWaiting = () => setIsLoading(true);
        const onCanPlay = () => setIsLoading(false);
        const onError = (e) => {
            setIsLoading(false);
            if (a.src && a.src !== '') {
                addToast('Streaming failed. The song may be unavailable.', 'error', { retry: true });
            }
        };

        a.addEventListener('timeupdate', onTimeUpdate);
        a.addEventListener('loadedmetadata', onLoadedMetadata);
        a.addEventListener('ended', onEnded);
        a.addEventListener('play', onPlay);
        a.addEventListener('pause', onPause);
        a.addEventListener('waiting', onWaiting);
        a.addEventListener('canplay', onCanPlay);
        a.addEventListener('error', onError);

        return () => {
            a.removeEventListener('timeupdate', onTimeUpdate);
            a.removeEventListener('loadedmetadata', onLoadedMetadata);
            a.removeEventListener('ended', onEnded);
            a.removeEventListener('play', onPlay);
            a.removeEventListener('pause', onPause);
            a.removeEventListener('waiting', onWaiting);
            a.removeEventListener('canplay', onCanPlay);
            a.removeEventListener('error', onError);
        };
    }, [addToast]);

    // Volume sync
    useEffect(() => {
        audio.volume = volume;
    }, [volume]);

    // ─── Extract dominant color when song changes ────────────────────
    useEffect(() => {
        if (currentSong?.thumbnail) {
            extractDominantColor(currentSong.thumbnail).then(setDominantColor);
        } else {
            setDominantColor(null);
        }
    }, [currentSong?.thumbnail]);

    const playSong = useCallback((song) => {
        setIsLoading(true);
        setCurrentSong(song);
        audio.src = getStreamUrl(song.videoId);
        audio.load();
        audio.play().catch(() => setIsLoading(false));

        // ─── Prefetch the next song in queue for faster playback ─────
        setQueue(q => {
            setQueueIndex(qi => {
                const nextIdx = qi + 1;
                if (nextIdx < q.length && q[nextIdx]?.videoId) {
                    prefetchSong(q[nextIdx].videoId);
                }
                return qi;
            });
            return q;
        });

        // ─── Add to recently played ─────────────────────────────────
        setRecentlyPlayed(prev => {
            const filtered = prev.filter(s => s.videoId !== song.videoId);
            const updated = [song, ...filtered].slice(0, MAX_RECENTLY_PLAYED);
            saveRecentlyPlayed(updated);
            return updated;
        });
    }, [audio]);

    const clearRecentlyPlayed = useCallback(() => {
        localStorage.removeItem(RECENTLY_PLAYED_KEY);
        setRecentlyPlayed([]);
        addToast('Recently played history cleared', 'info');
    }, [addToast]);

    // ─── Favourite Actions ───────────────────────────────────────────
    const toggleFavourite = useCallback((song) => {
        let isLiked = false;
        setFavourites(prev => {
            const exists = prev.find(s => s.videoId === song.videoId);
            let updated;
            if (exists) {
                updated = prev.filter(s => s.videoId !== song.videoId);
                isLiked = false;
            } else {
                updated = [song, ...prev];
                isLiked = true;
            }
            saveFavourites(updated);
            return updated;
        });
        addToast(isLiked ? 'Added to Favourites' : 'Removed from Favourites', isLiked ? 'success' : 'info');
    }, [addToast]);

    const addToQueue = useCallback((song) => {
        setQueue(prev => {
            if (prev.find(s => s.videoId === song.videoId)) {
                addToast('Song already in queue', 'info');
                return prev;
            }
            const updated = [...prev, song];

            // Auto-play if nothing is currently in queue/playing
            if (prev.length === 0 && !currentSong) {
                // Use setTimeout to skip the current render cycle,
                // letting the state update complete before calling playSong
                setTimeout(() => playSong(song), 0);
                setQueueIndex(0);
                addToast('Playing added song', 'success');
            } else {
                addToast('Added to queue', 'success');
            }

            return updated;
        });
    }, [addToast, currentSong, playSong, setQueueIndex]);

    // ─── User Playlist Actions ───────────────────────────────────────
    const createPlaylist = useCallback((name) => {
        if (!name?.trim()) return null;
        const newPlaylist = {
            id: `pl-${Date.now()}`,
            title: name.trim(),
            songs: [],
            thumbnail: null,
            type: 'USER_PLAYLIST',
            createdAt: new Date().toISOString()
        };
        setUserPlaylists(prev => {
            const updated = [...prev, newPlaylist];
            saveUserPlaylists(updated);
            return updated;
        });
        addToast(`Playlist "${name}" created`, 'success');
        return newPlaylist;
    }, [addToast]);

    const deletePlaylist = useCallback((id) => {
        setUserPlaylists(prev => {
            const updated = prev.filter(p => p.id !== id);
            saveUserPlaylists(updated);
            return updated;
        });
        addToast('Playlist deleted', 'info');
    }, [addToast]);

    const addSongToPlaylist = useCallback((playlistId, song) => {
        let alreadyExists = false;
        setUserPlaylists(prev => {
            const updated = prev.map(p => {
                if (p.id === playlistId) {
                    if (p.songs.find(s => s.videoId === song.videoId)) {
                        alreadyExists = true;
                        return p;
                    }
                    const updatedSongs = [...p.songs, song];
                    return {
                        ...p,
                        songs: updatedSongs,
                        thumbnail: p.thumbnail || song.thumbnail // Use first song's thumb if none
                    };
                }
                return p;
            });
            if (!alreadyExists) saveUserPlaylists(updated);
            return updated;
        });

        if (alreadyExists) {
            addToast('Song already in playlist', 'info');
        } else {
            addToast('Added to playlist', 'success');
        }
    }, [addToast]);

    const removeSongFromPlaylist = useCallback((playlistId, videoId) => {
        setUserPlaylists(prev => {
            const updated = prev.map(p => {
                if (p.id === playlistId) {
                    const updatedSongs = p.songs.filter(s => s.videoId !== videoId);
                    return {
                        ...p,
                        songs: updatedSongs,
                        thumbnail: updatedSongs.length > 0 ? updatedSongs[0].thumbnail : null
                    };
                }
                return p;
            });
            saveUserPlaylists(updated);
            return updated;
        });
        addToast('Removed from playlist', 'info');
    }, [addToast]);

    const playSongFromQueue = useCallback((song, songQueue, index) => {
        setQueue(songQueue);
        setQueueIndex(index);
        playSong(song);
    }, [playSong]);

    const playSongWithRecommendations = useCallback(async (song) => {
        // Immediately play the song and set it as the only item in the queue
        setQueue([song]);
        setQueueIndex(0);
        playSong(song);

        // Fetch recommendations in the background to act as the "same genre" auto-queue
        try {
            const recs = await getRecommendations(song.videoId);
            if (recs && recs.length > 0) {
                setQueue(prev => {
                    // Only append if the queue is still featuring our target song as index 0
                    if (prev.length > 0 && prev[0].videoId === song.videoId) {
                        return [song, ...recs];
                    }
                    return prev;
                });
            }
        } catch (err) {
            console.error("Failed to fetch initial recommendations", err);
        }
    }, [playSong]);

    const togglePlay = useCallback(() => {
        if (!currentSong) return;
        if (isPlaying) {
            audio.pause();
        } else {
            audio.play().catch(() => { });
        }
    }, [audio, isPlaying, currentSong]);

    const handleNext = useCallback(() => {
        const playNextOrFetch = async () => {
            if (repeat === 'one') {
                audio.currentTime = 0;
                audio.play().catch(() => { });
                return;
            }

            if (queue.length === 0 && currentSong) {
                // No queue, but a song is playing. Fetch recommendations to continue.
                try {
                    setIsLoading(true);
                    const recs = await getRecommendations(currentSong.videoId);
                    if (recs && recs.length > 0) {
                        setQueue([currentSong, ...recs]);
                        setQueueIndex(1);
                        playSong(recs[0]);
                    } else {
                        setIsPlaying(false);
                    }
                } catch (err) {
                    console.error("Auto-play fetch failed", err);
                    setIsPlaying(false);
                }
                return;
            }

            if (queue.length === 0) return;

            let nextIndex;
            if (shuffle) {
                nextIndex = Math.floor(Math.random() * queue.length);
            } else {
                nextIndex = queueIndex + 1;

                // End of queue reached
                if (nextIndex >= queue.length) {
                    if (repeat === 'all') {
                        nextIndex = 0;
                    } else {
                        // Fetch recommendations to continue playback
                        try {
                            setIsLoading(true);
                            const lastSong = queue[queue.length - 1];
                            const recs = await getRecommendations(lastSong.videoId);

                            if (recs && recs.length > 0) {
                                // Append new recommendations
                                setQueue(prev => [...prev, ...recs]);
                                // nextIndex is exactly the start of the new recs we just appended
                                setQueueIndex(nextIndex);
                                playSong(recs[0]);
                                return;
                            } else {
                                setIsPlaying(false);
                                return;
                            }
                        } catch (err) {
                            console.error("Auto-play append failed", err);
                            setIsPlaying(false);
                            return;
                        }
                    }
                }
            }

            setQueueIndex(nextIndex);
            playSong(queue[nextIndex]);
        };

        playNextOrFetch();
    }, [audio, queue, queueIndex, shuffle, repeat, playSong, currentSong]);

    // Keep handleNextRef in sync with the latest handleNext
    useEffect(() => {
        handleNextRef.current = handleNext;
    }, [handleNext]);

    const handlePrev = useCallback(() => {
        // If more than 3 seconds in, restart; otherwise go to previous
        if (audio.currentTime > 3) {
            audio.currentTime = 0;
            return;
        }

        if (queue.length === 0) return;
        let prevIndex = queueIndex - 1;
        if (prevIndex < 0) prevIndex = queue.length - 1;

        setQueueIndex(prevIndex);
        playSong(queue[prevIndex]);
    }, [audio, queue, queueIndex, playSong]);

    const seek = useCallback((time) => {
        audio.currentTime = time;
    }, [audio]);

    const setVolume = useCallback((vol) => {
        setVolumeState(Math.max(0, Math.min(1, vol)));
    }, []);

    const toggleShuffle = useCallback(() => {
        setShuffle(prev => !prev);
    }, []);

    const toggleRepeat = useCallback(() => {
        setRepeat(prev => prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off');
    }, []);

    const removeFromQueue = useCallback((index) => {
        setQueue(prev => {
            const newQueue = [...prev];
            newQueue.splice(index, 1);
            return newQueue;
        });
        // Adjust queueIndex if needed
        setQueueIndex(prev => {
            if (index < prev) return prev - 1;
            if (index === prev) return prev; // current song stays
            return prev;
        });
    }, []);

    const moveInQueue = useCallback((fromIndex, toIndex) => {
        setQueue(prev => {
            const newQueue = [...prev];
            const [moved] = newQueue.splice(fromIndex, 1);
            newQueue.splice(toIndex, 0, moved);
            return newQueue;
        });
        // Adjust queueIndex to track the currently playing song
        setQueueIndex(prev => {
            if (prev === fromIndex) return toIndex;
            if (fromIndex < prev && toIndex >= prev) return prev - 1;
            if (fromIndex > prev && toIndex <= prev) return prev + 1;
            return prev;
        });
    }, []);

    const clearQueue = useCallback(() => {
        audio.pause();
        audio.src = '';
        setQueue([]);
        setQueueIndex(-1);
        setCurrentSong(null);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
    }, [audio]);

    const playFromQueue = useCallback((index) => {
        if (index >= 0 && index < queue.length) {
            setQueueIndex(index);
            playSong(queue[index]);
        }
    }, [queue, playSong]);

    // ─── Retry play (for error recovery) ─────────────────────────────
    const retryPlay = useCallback(() => {
        if (currentSong) {
            playSong(currentSong);
        }
    }, [currentSong, playSong]);

    const value = {
        currentSong,
        queue,
        queueIndex,
        isPlaying,
        currentTime,
        duration,
        volume,
        isLoading,
        shuffle,
        repeat,
        playSong,
        playSongFromQueue,
        playSongWithRecommendations,
        togglePlay,
        handleNext,
        handlePrev,
        seek,
        setVolume,
        toggleShuffle,
        toggleRepeat,
        removeFromQueue,
        moveInQueue,
        clearQueue,
        playFromQueue,
        // New features
        audioRef,
        recentlyPlayed,
        clearRecentlyPlayed,
        dominantColor,
        toasts,
        addToast,
        dismissToast,
        retryPlay,
        // User Playlists
        userPlaylists,
        createPlaylist,
        deletePlaylist,
        addSongToPlaylist,
        removeSongFromPlaylist,
        favourites,
        toggleFavourite,
        addToQueue,
    };

    return (
        <PlayerContext.Provider value={value}>
            {children}
        </PlayerContext.Provider>
    );
}
