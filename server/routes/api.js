import { Router } from 'express';
import YTMusic from 'ytmusic-api';
import youtubedl from 'youtube-dl-exec';
import https from 'https';
import http from 'http';

const router = Router();

// Initialize YTMusic API
const ytmusic = new YTMusic();
let isInitialized = false;

async function ensureInitialized() {
    if (!isInitialized) {
        await ytmusic.initialize();
        isInitialized = true;
        console.log('✅ YTMusic API initialized');
    }
}

// Search songs
router.get('/search', async (req, res) => {
    try {
        await ensureInitialized();
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }

        const results = await ytmusic.searchSongs(query);

        const songs = results.map(song => {
            // Resolve artist name — ytmusic-api sometimes returns song name as artist name
            let artistName = song.artist?.name || '';
            if (!artistName || artistName === song.name) {
                // Try artists array (plural) as fallback
                if (Array.isArray(song.artists) && song.artists.length > 0) {
                    artistName = song.artists.map(a => a.name || a).filter(Boolean).join(', ');
                }
            }
            if (!artistName || artistName === song.name) {
                artistName = 'Unknown Artist';
            }

            return {
                videoId: song.videoId,
                title: song.name,
                artist: artistName,
                album: song.album?.name || '',
                duration: song.duration,
                thumbnail: song.thumbnails?.[song.thumbnails.length - 1]?.url || '',
            };
        });

        res.json({ results: songs });
    } catch (error) {
        console.error('Search error:', error.message);
        res.status(500).json({ error: 'Failed to search songs' });
    }
});

// Get search suggestions
router.get('/suggestions', async (req, res) => {
    try {
        await ensureInitialized();
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }

        const suggestions = await ytmusic.getSearchSuggestions(query);
        res.json({ suggestions });
    } catch (error) {
        console.error('Suggestions error:', error.message);
        res.status(500).json({ error: 'Failed to get suggestions' });
    }
});

// Get song details
router.get('/song/:videoId', async (req, res) => {
    try {
        await ensureInitialized();
        const { videoId } = req.params;
        const song = await ytmusic.getSong(videoId);

        // Resolve artist name
        let artistName = song.artist?.name || '';
        if (!artistName || artistName === song.name) {
            if (Array.isArray(song.artists) && song.artists.length > 0) {
                artistName = song.artists.map(a => a.name || a).filter(Boolean).join(', ');
            }
        }
        if (!artistName || artistName === song.name) {
            artistName = 'Unknown Artist';
        }

        res.json({
            videoId: song.videoId,
            title: song.name,
            artist: artistName,
            album: song.album?.name || '',
            duration: song.duration,
            thumbnail: song.thumbnails?.[song.thumbnails.length - 1]?.url || '',
        });
    } catch (error) {
        console.error('Song details error:', error.message);
        res.status(500).json({ error: 'Failed to get song details' });
    }
});

// Helper to convert "MM:SS" or "HH:MM:SS" to seconds
function parseDuration(d) {
    if (typeof d === 'number') return d;
    if (typeof d !== 'string') return 0;
    const parts = d.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
}

// Helper: resolve artist name — ytmusic-api sometimes returns song name as artist
function resolveArtistName(item, songTitle) {
    let name = item.artist?.name || '';
    if (!name || name === songTitle) {
        if (Array.isArray(item.artists) && item.artists.length > 0) {
            name = item.artists.map(a => a.name || a).filter(Boolean).join(', ');
        }
    }
    return (!name || name === songTitle) ? 'Unknown Artist' : name;
}



// Get recommended songs based on a videoId
router.get('/recommendations/:videoId', async (req, res) => {
    try {
        await ensureInitialized();
        const { videoId } = req.params;

        // getUpNexts provides related/recommended songs (same as YT auto-play)
        let upNext = [];
        try {
            upNext = await ytmusic.getUpNexts(videoId);
        } catch (err) {
            console.log(`⚠️ getUpNexts failed for ${videoId}: ${err.message}. Trying fallback search...`);
            try {
                // Fallback Strategy 1: Get song details to find the artist, then search for artist's songs
                const songInfo = await ytmusic.getSong(videoId);
                const artistName = songInfo.artist?.name || '';
                if (artistName) {
                    const searchResults = await ytmusic.searchSongs(artistName);
                    upNext = searchResults.filter(s => s.videoId !== videoId);
                }
            } catch (fallbackErr) {
                console.log(`❌ Recommendation fallback search failed: ${fallbackErr.message}`);
                
                // Fallback Strategy 2: If everything fails, return some songs from the home cache if available
                if (homeSectionsCache.data && homeSectionsCache.data.sections && homeSectionsCache.data.sections.length > 0) {
                    console.log('ℹ️ Using home sections as last-resort recommendations');
                    // Pick songs from the first section
                    const sectionSongs = homeSectionsCache.data.sections[0].contents.filter(item => item.type === 'SONG');
                    upNext = sectionSongs;
                }
            }
        }

        // Filter out items that aren't songs and format
        console.log(`📊 Processing ${upNext.length} items for recommendations`);
        const recommendations = upNext
            .filter(item => item && (item.videoId || item.id)) // Ensure it's a playable track
            .map(song => {
                try {
                    // handle different thumbnail formats
                    let thumbUrl = '';
                    if (Array.isArray(song.thumbnails) && song.thumbnails.length > 0) {
                        const bestThumb = song.thumbnails[song.thumbnails.length - 1];
                        thumbUrl = bestThumb?.url || '';
                    } else if (typeof song.thumbnail === 'string') {
                        thumbUrl = song.thumbnail;
                    } else if (song.thumbnail && song.thumbnail.url) {
                        thumbUrl = song.thumbnail.url;
                    }

                    // handle artists formatting
                    let artistName = 'Unknown Artist';
                    if (Array.isArray(song.artists) && song.artists.length > 0) {
                        artistName = typeof song.artists[0] === 'string' ? song.artists[0] : (song.artists[0]?.name || 'Unknown Artist');
                    } else if (typeof song.artists === 'string') {
                        artistName = song.artists;
                    } else if (song.artist && song.artist.name) {
                        artistName = song.artist.name;
                    } else if (typeof song.artist === 'string') {
                        artistName = song.artist;
                    }

                    return {
                        videoId: song.videoId || song.id,
                        title: song.title || song.name || 'Unknown',
                        artist: artistName,
                        album: song.album?.name || '',
                        duration: parseDuration(song.duration),
                        thumbnail: thumbUrl,
                    };
                } catch (e) {
                    console.error('Error mapping recommendation item:', e.message);
                    return null;
                }
            })
            .filter(Boolean)
            .slice(0, 20); // Limit to top 20 recommendations

        console.log(`✅ Returning ${recommendations.length} recommendations`);
        res.json({ results: recommendations });
    } catch (error) {
        console.error('🔥 CRITICAL Recommendations error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to get recommendations', message: error.message });
        }
    }
});

// Audio URL cache to avoid repeated yt-dlp calls
const audioUrlCache = new Map();
const AUDIO_CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours (YouTube URLs last 4-6h)

// Track active prefetch operations to avoid duplicates
const activePrefetches = new Map();

// Common yt-dlp options — use TV/mobile clients to bypass server IP blocks
const YT_DLP_BASE_OPTS = {
    getUrl: true,
    noCheckCertificates: true,
    noWarnings: true,
    noPlaylist: true,
    preferFreeFormats: true,
    noCallHome: true,
    socketTimeout: 15,
    // Spoof as TV Embedded client — avoids most server IP restrictions
    addHeader: [
        'User-Agent:Mozilla/5.0 (SMART-TV; Linux; Tizen 5.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/5.0 TV Safari/538.1',
    ],
};

// Player clients to try in priority order — server-friendly clients first
const PLAYER_CLIENT_SEQUENCE = [
    'tv_embedded',    // Smart TV — bypasses most IP blocks
    'ios',            // iOS app — high success rate  
    'mweb',           // Mobile web — fallback
    'web',            // Default web — may fail on server IPs
];

async function extractAudioUrl(videoId) {
    const urls = [
        `https://music.youtube.com/watch?v=${videoId}`,
        `https://www.youtube.com/watch?v=${videoId}`,
    ];
    const formats = [
        'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio',
        'bestaudio*',
        'best',
    ];

    for (const playerClient of PLAYER_CLIENT_SEQUENCE) {
        for (const sourceUrl of urls) {
            for (const format of formats) {
                try {
                    const result = await youtubedl(sourceUrl, {
                        ...YT_DLP_BASE_OPTS,
                        format,
                        extractor_args: `youtube:player_client=${playerClient}`,
                    });
                    const audioUrl = typeof result === 'string' ? result.trim() : result;
                    if (audioUrl && audioUrl.startsWith('http')) {
                        console.log(`✅ Got audio URL for ${videoId} (client=${playerClient}, format=${format})`);
                        return audioUrl;
                    }
                } catch (err) {
                    console.log(`⚠️ Failed [${playerClient}/${format}] for ${videoId}: ${
                        (err.stderr || err.message || '').substring(0, 100)
                    }`);
                }
            }
        }
    }

    return null;
}


// Cache an audio URL with TTL
function cacheAudioUrl(videoId, audioUrl) {
    audioUrlCache.set(videoId, audioUrl);
    setTimeout(() => audioUrlCache.delete(videoId), AUDIO_CACHE_TTL);
}

// Pre-fetch and cache audio URL in background
async function prefetchAudioUrl(videoId) {
    // Skip if already cached or already being prefetched
    if (audioUrlCache.has(videoId)) return;
    if (activePrefetches.has(videoId)) return;

    const prefetchPromise = (async () => {
        try {
            console.log(`🔮 Prefetching audio URL for ${videoId}...`);
            const audioUrl = await extractAudioUrl(videoId);
            if (audioUrl) {
                cacheAudioUrl(videoId, audioUrl);
                console.log(`🔮 Prefetch complete for ${videoId}`);
            }
        } catch (err) {
            console.log(`⚠️ Prefetch failed for ${videoId}: ${err.message?.substring(0, 80)}`);
        } finally {
            activePrefetches.delete(videoId);
        }
    })();

    activePrefetches.set(videoId, prefetchPromise);
    return prefetchPromise;
}

// ─── Prefetch Endpoint ───────────────────────────────────────────────
router.get('/prefetch/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;

        if (audioUrlCache.has(videoId)) {
            return res.json({ status: 'cached' });
        }

        // Start prefetch in background, don't wait
        prefetchAudioUrl(videoId);
        res.json({ status: 'prefetching' });
    } catch (error) {
        res.json({ status: 'error' });
    }
});

// Stream audio — uses yt-dlp to extract direct audio URL, then proxies it
router.get('/stream/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;

        console.log(`🎶 Streaming request: ${videoId}`);

        // Check cache first
        let audioUrl = audioUrlCache.get(videoId);

        if (!audioUrl) {
            // If a prefetch is in progress, wait for it instead of starting a new extraction
            if (activePrefetches.has(videoId)) {
                console.log(`⏳ Waiting for active prefetch for ${videoId}...`);
                await activePrefetches.get(videoId);
                audioUrl = audioUrlCache.get(videoId);
            }

            // If still no URL, extract now
            if (!audioUrl) {
                audioUrl = await extractAudioUrl(videoId);

                if (!audioUrl) {
                    return res.status(404).json({ error: 'No audio URL found for this song' });
                }

                cacheAudioUrl(videoId, audioUrl);
            }
        }

        // Proxy the audio stream to avoid CORS issues
        const protocol = audioUrl.startsWith('https') ? https : http;

        // Use headers that YouTube accepts for direct stream URLs
        const proxyHeaders = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.210 Mobile Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.youtube.com/',
            'Origin': 'https://www.youtube.com',
            'Connection': 'keep-alive',
            ...(req.headers.range ? { 'Range': req.headers.range } : {}),
        };

        const proxyReq = protocol.get(audioUrl, { headers: proxyHeaders }, (proxyRes) => {
            // If upstream returns error, log status and invalidate cache
            if (proxyRes.statusCode >= 400) {
                console.error(`❌ Upstream ${proxyRes.statusCode} for ${videoId} — invalidating cache`);
                audioUrlCache.delete(videoId);
                if (!res.headersSent) {
                    res.status(502).json({ error: `Audio source returned ${proxyRes.statusCode}` });
                }
                return;
            }

            // Forward relevant headers
            const forwardHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
            forwardHeaders.forEach(header => {
                if (proxyRes.headers[header]) {
                    res.setHeader(header, proxyRes.headers[header]);
                }
            });

            res.setHeader('Cache-Control', 'public, max-age=3600');
            res.status(proxyRes.statusCode);
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
            console.error('Proxy error:', err.message);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to proxy audio' });
            }
        });

        req.on('close', () => {
            proxyReq.destroy();
        });
    } catch (error) {
        console.error('Stream error:', error.message);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to stream audio' });
        }
    }
});

// ─── Home Sections (Trending) ────────────────────────────────────────
const homeSectionsCache = { data: null, timestamp: 0 };
const HOME_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function normalizeSection(section) {
    return {
        title: section.title || 'Recommended',
        contents: (section.contents || [])
            .filter(item => item && (item.type === 'SONG' || item.type === 'ALBUM' || item.type === 'PLAYLIST'))
            .map(item => {
                try {
                    if (item.type === 'SONG') {
                        // Resolve artist name
                        let artistName = item.artist?.name || '';
                        if (!artistName || artistName === (item.name || item.title)) {
                            if (Array.isArray(item.artists) && item.artists.length > 0) {
                                artistName = item.artists.map(a => a.name || a).filter(Boolean).join(', ');
                            }
                        }
                        if (!artistName || artistName === (item.name || item.title)) {
                            artistName = 'Unknown Artist';
                        }
                        return {
                            type: 'SONG',
                            videoId: item.videoId,
                            title: item.name || item.title || 'Unknown',
                            artist: artistName,
                            album: item.album?.name || '',
                            duration: item.duration,
                            thumbnail: item.thumbnails?.[item.thumbnails.length - 1]?.url || '',
                        };
                    } else if (item.type === 'ALBUM') {
                        return {
                            type: 'ALBUM',
                            albumId: item.albumId,
                            playlistId: item.playlistId,
                            title: item.name || item.title || 'Unknown',
                            artist: item.artist?.name || 'Unknown Artist',
                            year: item.year,
                            thumbnail: item.thumbnails?.[item.thumbnails.length - 1]?.url || '',
                        };
                    } else {
                        return {
                            type: 'PLAYLIST',
                            playlistId: item.playlistId,
                            title: item.name || item.title || 'Unknown',
                            artist: item.artist?.name || '',
                            thumbnail: item.thumbnails?.[item.thumbnails.length - 1]?.url || '',
                        };
                    }
                } catch {
                    return null;
                }
            })
            .filter(Boolean),
    };
}

router.get('/home', async (req, res) => {
    try {
        await ensureInitialized();

        // Return cached data if still fresh
        if (homeSectionsCache.data && Date.now() - homeSectionsCache.timestamp < HOME_CACHE_TTL) {
            return res.json(homeSectionsCache.data);
        }

        let normalized = [];

        // Strategy 1: Try getHomeSections
        try {
            const sections = await ytmusic.getHomeSections();
            if (sections && sections.length > 0) {
                normalized = sections
                    .filter(s => s && s.contents && (!s.title || !s.title.toLowerCase().includes('music videos for you')))
                    .map(normalizeSection)
                    .filter(section => section.contents.length > 0);
            }
        } catch (err) {
            console.log(`⚠️ getHomeSections failed: ${err.message?.substring(0, 100)}`);
        }

        // Strategy 2: Fallback — build sections from search results
        if (normalized.length === 0) {
            console.log('ℹ️ Using search-based fallback for home sections');
            const fallbackQueries = [
                { title: '🔥 Trending Now', query: 'trending songs 2025' },
                { title: '🎵 Popular Hits', query: 'top hits popular songs' },
                { title: '🎧 Chill Vibes', query: 'chill lofi relaxing music' },
                { title: '🎶 Bollywood Hits', query: 'latest bollywood songs' },
            ];

            for (const { title, query } of fallbackQueries) {
                try {
                    const results = await ytmusic.searchSongs(query);
                    if (results && results.length > 0) {
                        normalized.push({
                            title,
                            contents: results.slice(0, 10).map(song => {
                                let artistName = song.artist?.name || '';
                                if (!artistName || artistName === song.name) {
                                    if (Array.isArray(song.artists) && song.artists.length > 0) {
                                        artistName = song.artists.map(a => a.name || a).filter(Boolean).join(', ');
                                    }
                                }
                                if (!artistName || artistName === song.name) {
                                    artistName = 'Unknown Artist';
                                }
                                return {
                                    type: 'SONG',
                                    videoId: song.videoId,
                                    title: song.name || 'Unknown',
                                    artist: artistName,
                                    album: song.album?.name || '',
                                    duration: song.duration,
                                    thumbnail: song.thumbnails?.[song.thumbnails.length - 1]?.url || '',
                                };
                            }),
                        });
                    }
                } catch (e) {
                    console.log(`⚠️ Fallback search "${query}" failed: ${e.message?.substring(0, 80)}`);
                }
            }
        }

        homeSectionsCache.data = { sections: normalized };
        homeSectionsCache.timestamp = Date.now();

        res.json(homeSectionsCache.data);
    } catch (error) {
        console.error('Home sections error:', error.message);
        res.status(500).json({ error: 'Failed to get home sections' });
    }
});

// ─── Genre Search ────────────────────────────────────────────────────
const genreCache = new Map();
const GENRE_CACHE_TTL = 10 * 60 * 1000;

router.get('/genre/:genre', async (req, res) => {
    try {
        await ensureInitialized();
        const { genre } = req.params;

        // Check cache
        const cached = genreCache.get(genre);
        if (cached && Date.now() - cached.timestamp < GENRE_CACHE_TTL) {
            return res.json(cached.data);
        }

        const results = await ytmusic.searchSongs(`${genre} songs`);

        const songs = results.map(song => {
            let artistName = song.artist?.name || '';
            if (!artistName || artistName === song.name) {
                if (Array.isArray(song.artists) && song.artists.length > 0) {
                    artistName = song.artists.map(a => a.name || a).filter(Boolean).join(', ');
                }
            }
            if (!artistName || artistName === song.name) {
                artistName = 'Unknown Artist';
            }
            return {
                videoId: song.videoId,
                title: song.name,
                artist: artistName,
                album: song.album?.name || '',
                duration: song.duration,
                thumbnail: song.thumbnails?.[song.thumbnails.length - 1]?.url || '',
            };
        });

        const data = { results: songs };
        genreCache.set(genre, { data, timestamp: Date.now() });

        // Cleanup old genre cache entries
        if (genreCache.size > 50) {
            const oldest = [...genreCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
            genreCache.delete(oldest[0][0]);
        }

        res.json(data);
    } catch (error) {
        console.error('Genre search error:', error.message);
        res.status(500).json({ error: 'Failed to get genre songs' });
    }
});

// ─── Get Playlist Songs ──────────────────────────────────────────────
router.get('/playlist/:playlistId', async (req, res) => {
    try {
        await ensureInitialized();
        const { playlistId } = req.params;
        const playlistName = req.query.name || '';

        let songs = [];

        // Strategy 1: Try getPlaylistVideos
        try {
            const videos = await ytmusic.getPlaylistVideos(playlistId);
            if (videos && videos.length > 0) {
                songs = videos.map(video => ({
                    videoId: video.videoId,
                    title: video.name,
                    artist: resolveArtistName(video, video.name),
                    album: '',
                    duration: video.duration,
                    thumbnail: video.thumbnails?.[video.thumbnails.length - 1]?.url || '',
                }));
            }
        } catch (e) {
            console.log(`⚠️ getPlaylistVideos failed for ${playlistId}: ${e.message}`);
        }

        // Strategy 2: Try getPlaylist (has songs embedded for some playlists)
        if (songs.length === 0) {
            try {
                const playlist = await ytmusic.getPlaylist(playlistId);
                if (playlist.songs && playlist.songs.length > 0) {
                    songs = playlist.songs.map(song => ({
                        videoId: song.videoId,
                        title: song.name,
                        artist: resolveArtistName(song, song.name),
                        album: song.album?.name || '',
                        duration: song.duration,
                        thumbnail: song.thumbnails?.[song.thumbnails.length - 1]?.url || '',
                    }));
                }
            } catch (e) {
                console.log(`⚠️ getPlaylist failed for ${playlistId}: ${e.message}`);
            }
        }

        // Strategy 3: Fallback to search if playlist name is provided
        if (songs.length === 0 && playlistName) {
            try {
                const results = await ytmusic.searchSongs(playlistName);
                songs = results.slice(0, 20).map(song => ({
                    videoId: song.videoId,
                    title: song.name,
                    artist: resolveArtistName(song, song.name),
                    album: song.album?.name || '',
                    duration: song.duration,
                    thumbnail: song.thumbnails?.[song.thumbnails.length - 1]?.url || '',
                }));
            } catch (e) {
                console.log(`⚠️ Search fallback failed for "${playlistName}": ${e.message}`);
            }
        }

        res.json({ results: songs });
    } catch (error) {
        console.error('Playlist error:', error.message);
        res.status(500).json({ error: 'Failed to get playlist songs' });
    }
});

// ─── Get Album Songs ─────────────────────────────────────────────────
router.get('/album/:albumId', async (req, res) => {
    try {
        await ensureInitialized();
        const { albumId } = req.params;

        const album = await ytmusic.getAlbum(albumId);

        const songs = (album.songs || []).map(song => {
            let artistName = resolveArtistName(song, song.name);
            if (artistName === 'Unknown Artist' && album.artist?.name) {
                artistName = album.artist.name;
            }
            return {
                videoId: song.videoId,
                title: song.name,
                artist: artistName,
                album: album.name || '',
                duration: song.duration,
                thumbnail: song.thumbnails?.[song.thumbnails.length - 1]?.url || ''
                    || album.thumbnails?.[album.thumbnails.length - 1]?.url || '',
            };
        });

        res.json({ results: songs, albumName: album.name, artist: album.artist?.name });
    } catch (error) {
        console.error('Album error:', error.message);
        res.status(500).json({ error: 'Failed to get album songs' });
    }
});

export default router;
