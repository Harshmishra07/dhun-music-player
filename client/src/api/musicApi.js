const API_BASE = '/api';

export async function searchSongs(query) {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Search failed');
    const data = await res.json();
    return data.results;
}

export async function getSearchSuggestions(query) {
    const res = await fetch(`${API_BASE}/suggestions?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Suggestions failed');
    const data = await res.json();
    return data.suggestions;
}

export async function getSongDetails(videoId) {
    const res = await fetch(`${API_BASE}/song/${videoId}`);
    if (!res.ok) throw new Error('Song details failed');
    return res.json();
}

export function getStreamUrl(videoId) {
    return `${API_BASE}/stream/${videoId}`;
}

export function prefetchSong(videoId) {
    // Fire-and-forget — tells the backend to start extracting audio URL in background
    fetch(`${API_BASE}/prefetch/${encodeURIComponent(videoId)}`).catch(() => { });
}



export async function getHomeSections() {
    const res = await fetch(`${API_BASE}/home`);
    if (!res.ok) throw new Error('Failed to fetch home sections');
    const data = await res.json();
    return data.sections;
}

export async function getGenreSongs(genre) {
    const res = await fetch(`${API_BASE}/genre/${encodeURIComponent(genre)}`);
    if (!res.ok) throw new Error('Failed to fetch genre songs');
    const data = await res.json();
    return data.results;
}

export async function getPlaylistSongs(playlistId, name = '') {
    const params = new URLSearchParams();
    if (name) params.set('name', name);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/playlist/${encodeURIComponent(playlistId)}${qs}`);
    if (!res.ok) throw new Error('Failed to fetch playlist songs');
    const data = await res.json();
    return data.results;
}

export async function getAlbumSongs(albumId) {
    const res = await fetch(`${API_BASE}/album/${encodeURIComponent(albumId)}`);
    if (!res.ok) throw new Error('Failed to fetch album songs');
    return await res.json();
}

export async function getRecommendations(videoId) {
    const res = await fetch(`${API_BASE}/recommendations/${encodeURIComponent(videoId)}`);
    if (!res.ok) throw new Error('Failed to fetch recommendations');
    const data = await res.json();
    return data.results;
}
