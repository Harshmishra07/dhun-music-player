import { Router } from 'express';
import https from 'https';
import http from 'http';

const router = Router();

const SAAVN_BASE_URL = 'https://saavn.dev/api';

// Helper to format duration from seconds to MM:SS
function formatDuration(seconds) {
    if (!seconds) return '0:00';
    const numSeconds = parseInt(seconds, 10);
    const m = Math.floor(numSeconds / 60);
    const s = numSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// Search songs
router.get('/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }

        const response = await fetch(`${SAAVN_BASE_URL}/search/songs?query=${encodeURIComponent(query)}&limit=20`);
        const data = await response.json();

        if (!data.success || !data.data || !data.data.results) {
            return res.json({ results: [] });
        }

        const songs = data.data.results.map(song => {
            // Pick highest quality image
            const image = song.image?.find(i => i.quality === '500x500')?.link || song.image?.[song.image.length - 1]?.link || '';
            
            return {
                videoId: song.id,
                title: song.name,
                artist: song.primaryArtists || 'Unknown Artist',
                album: song.album?.name || '',
                duration: formatDuration(song.duration),
                thumbnail: image,
            };
        });

        res.json({ results: songs });
    } catch (error) {
        console.error('Search error:', error.message);
        res.status(500).json({ error: 'Failed to search songs' });
    }
});

// Get search suggestions (Top 5 song names for autocomplete)
router.get('/suggestions', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }

        const response = await fetch(`${SAAVN_BASE_URL}/search/songs?query=${encodeURIComponent(query)}&limit=5`);
        const data = await response.json();

        if (!data.success || !data.data || !data.data.results) {
            return res.json([]);
        }

        const suggestions = data.data.results.map(song => song.name);
        res.json(suggestions);
    } catch (error) {
        console.error('Suggestions error:', error.message);
        res.status(500).json({ error: 'Failed to get suggestions' });
    }
});

// Stream audio
router.get('/stream/:videoId', async (req, res) => {
    const videoId = req.params.videoId;
    
    try {
        // 1. Fetch song details
        const detailsRes = await fetch(`${SAAVN_BASE_URL}/songs/${videoId}`);
        const detailsData = await detailsRes.json();
        
        if (!detailsData.success || !detailsData.data || detailsData.data.length === 0) {
            return res.status(404).json({ error: 'Song not found' });
        }
        
        const songData = detailsData.data[0];
        
        // 2. Find highest quality download URL (usually 320kbps or 160kbps)
        const downloadUrls = songData.downloadUrl;
        if (!downloadUrls || downloadUrls.length === 0) {
            return res.status(404).json({ error: 'No audio URL found for this song' });
        }
        
        // Get the best quality available
        const bestAudio = downloadUrls.find(u => u.quality === '320kbps') || 
                          downloadUrls.find(u => u.quality === '160kbps') || 
                          downloadUrls[downloadUrls.length - 1];
                          
        const audioUrl = bestAudio.link;
        console.log(`✅ Streaming ${videoId} via Saavn [${bestAudio.quality}]`);

        // 3. Proxy the stream
        const protocol = audioUrl.startsWith('https') ? https : http;

        const proxyReq = protocol.get(audioUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ...(req.headers.range ? { 'Range': req.headers.range } : {}),
            }
        }, (proxyRes) => {
            if (proxyRes.statusCode >= 400) {
                if (!res.headersSent) {
                    res.status(502).json({ error: `Audio source returned ${proxyRes.statusCode}` });
                }
                return;
            }

            // Forward relevant headers including Range/Content-Length for seeking
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

// Get Recommendations (Based on Artist of the current song)
router.get('/recommendations/:videoId', async (req, res) => {
    try {
        const videoId = req.params.videoId;
        
        // Fetch song details to get artist name
        const detailsRes = await fetch(`${SAAVN_BASE_URL}/songs/${videoId}`);
        const detailsData = await detailsRes.json();
        
        if (!detailsData.success || !detailsData.data || detailsData.data.length === 0) {
            return res.json({ results: [] });
        }
        
        const songData = detailsData.data[0];
        const artist = songData.primaryArtists?.split(',')[0] || '';
        
        if (!artist) {
            return res.json({ results: [] });
        }
        
        // Search songs by that artist to simulate recommendations
        const recsRes = await fetch(`${SAAVN_BASE_URL}/search/songs?query=${encodeURIComponent(artist)}&limit=20`);
        const recsData = await recsRes.json();
        
        if (!recsData.success || !recsData.data || !recsData.data.results) {
            return res.json({ results: [] });
        }
        
        const recommendations = recsData.data.results
            .filter(song => song.id !== videoId) // Exclude current song
            .map(song => {
                const image = song.image?.find(i => i.quality === '500x500')?.link || song.image?.[song.image.length - 1]?.link || '';
                
                return {
                    videoId: song.id,
                    title: song.name,
                    artist: song.primaryArtists || 'Unknown Artist',
                    album: song.album?.name || '',
                    duration: formatDuration(song.duration),
                    thumbnail: image,
                };
            });

        res.json({ results: recommendations });
    } catch (error) {
        console.error('Recommendations error:', error.message);
        res.status(500).json({ error: 'Failed to get recommendations' });
    }
});

// Home page sections
router.get('/home', async (req, res) => {
    try {
        const defaultQueries = ['trending', 'top hits', 'new releases', 'bollywood hits'];
        const numSections = parseInt(req.query.sections) || 4;
        const queriesToFetch = defaultQueries.slice(0, numSections);
        
        const sectionsData = await Promise.all(
            queriesToFetch.map(async (query) => {
                const response = await fetch(`${SAAVN_BASE_URL}/search/songs?query=${encodeURIComponent(query)}&limit=10`);
                const data = await response.json();
                
                if (!data.success || !data.data || !data.data.results) return null;
                
                const items = data.data.results.map(song => {
                    const image = song.image?.find(i => i.quality === '500x500')?.link || song.image?.[song.image.length - 1]?.link || '';
                    return {
                        videoId: song.id,
                        title: song.name,
                        artist: song.primaryArtists || 'Unknown Artist',
                        album: song.album?.name || '',
                        duration: formatDuration(song.duration),
                        thumbnail: image,
                    };
                });
                
                // Capitalize title
                const title = query.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                
                return { title, contents: items };
            })
        );
        
        res.json({ sections: sectionsData.filter(Boolean) });
    } catch (error) {
        console.error('Home content error:', error.message);
        res.status(500).json({ error: 'Failed to fetch home content' });
    }
});
// Get single song details
router.get('/song/:videoId', async (req, res) => {
    try {
        const videoId = req.params.videoId;
        const response = await fetch(`${SAAVN_BASE_URL}/songs/${videoId}`);
        const data = await response.json();
        
        if (!data.success || !data.data || data.data.length === 0) {
            return res.status(404).json({ error: 'Song not found' });
        }
        
        const song = data.data[0];
        const image = song.image?.find(i => i.quality === '500x500')?.link || song.image?.[song.image.length - 1]?.link || '';
        
        res.json({
            videoId: song.id,
            title: song.name,
            artist: song.primaryArtists || 'Unknown Artist',
            album: song.album?.name || '',
            duration: formatDuration(song.duration),
            thumbnail: image,
        });
    } catch (error) {
        console.error('Song details error:', error.message);
        res.status(500).json({ error: 'Failed to fetch song details' });
    }
});

// Genre/Mood playlists (map to search for now)
router.get('/genre/:genreId', async (req, res) => {
    try {
        const genreId = req.params.genreId;
        const response = await fetch(`${SAAVN_BASE_URL}/search/songs?query=${encodeURIComponent(genreId)}&limit=20`);
        const data = await response.json();
        
        if (!data.success || !data.data || !data.data.results) {
            return res.json({ results: [] });
        }
        
        const songs = data.data.results.map(song => {
            const image = song.image?.find(i => i.quality === '500x500')?.link || song.image?.[song.image.length - 1]?.link || '';
            return {
                videoId: song.id,
                title: song.name,
                artist: song.primaryArtists || 'Unknown Artist',
                album: song.album?.name || '',
                duration: formatDuration(song.duration),
                thumbnail: image,
            };
        });
        
        res.json({ results: songs });
    } catch (error) {
        console.error('Genre error:', error.message);
        res.status(500).json({ error: 'Failed to fetch genre' });
    }
});

// Playlists (map to saavn playlist endpoint)
router.get('/playlist/:playlistId', async (req, res) => {
    try {
        const playlistId = req.params.playlistId;
        const response = await fetch(`${SAAVN_BASE_URL}/playlists?id=${playlistId}`);
        const data = await response.json();
        
        if (!data.success || !data.data || !data.data.songs) {
            return res.json({ results: [] });
        }
        
        const songs = data.data.songs.map(song => {
            const image = song.image?.find(i => i.quality === '500x500')?.link || song.image?.[song.image.length - 1]?.link || '';
            return {
                videoId: song.id,
                title: song.name,
                artist: song.primaryArtists || 'Unknown Artist',
                album: song.album?.name || '',
                duration: formatDuration(song.duration),
                thumbnail: image,
            };
        });
        
        res.json({ results: songs });
    } catch (error) {
        console.error('Playlist error:', error.message);
        res.status(500).json({ error: 'Failed to fetch playlist' });
    }
});

// Albums (map to saavn album endpoint)
router.get('/album/:albumId', async (req, res) => {
    try {
        const albumId = req.params.albumId;
        const response = await fetch(`${SAAVN_BASE_URL}/albums?id=${albumId}`);
        const data = await response.json();
        
        if (!data.success || !data.data || !data.data.songs) {
            return res.json({ results: [] });
        }
        
        const songs = data.data.songs.map(song => {
            const image = song.image?.find(i => i.quality === '500x500')?.link || song.image?.[song.image.length - 1]?.link || '';
            return {
                videoId: song.id,
                title: song.name,
                artist: song.primaryArtists || 'Unknown Artist',
                album: song.album?.name || '',
                duration: formatDuration(song.duration),
                thumbnail: image,
            };
        });
        
        res.json({ results: songs });
    } catch (error) {
        console.error('Album error:', error.message);
        res.status(500).json({ error: 'Failed to fetch album' });
    }
});

// Prefetch stream (no-op for Saavn because extraction is instant)
router.get('/prefetch/:videoId', (req, res) => {
    res.status(200).send('Prefetch not needed for Saavn');
});

export default router;
