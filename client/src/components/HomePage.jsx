import { useState, useEffect } from 'react';
import { getHomeSections, getGenreSongs, getPlaylistSongs, getAlbumSongs, getRecommendations } from '../api/musicApi.js';
import { usePlayer } from '../context/PlayerContext.jsx';
import GenreBar from './GenreBar.jsx';
import { FiPlay, FiMusic, FiDisc, FiList, FiArrowLeft, FiClock, FiStar, FiTrash2, FiPlus, FiMoreVertical, FiHeart } from 'react-icons/fi';
import SongActionMenu from './SongActionMenu.jsx';
import './HomePage.css';

function formatDuration(seconds) {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function HomePage() {
    const [homeSections, setHomeSections] = useState([]);
    const [genreSongs, setGenreSongs] = useState([]);
    const [activeGenre, setActiveGenre] = useState('All');
    const [isLoading, setIsLoading] = useState(true);
    const {
        playSongWithRecommendations,
        currentSong,
        isPlaying,
        recentlyPlayed,
        clearRecentlyPlayed,
        userPlaylists,
        createPlaylist,
        deletePlaylist,
        removeSongFromPlaylist,
        favourites,
        toggleFavourite,
        playSongFromQueue
    } = usePlayer();

    // Recommendations state
    const [recommendations, setRecommendations] = useState([]);
    const [isLoadingRecs, setIsLoadingRecs] = useState(false);

    // Opened playlist/album state
    const [openedCollection, setOpenedCollection] = useState(null);
    // { type: 'PLAYLIST'|'ALBUM', title: string, artist: string, thumbnail: string, songs: [] }
    const [collectionLoading, setCollectionLoading] = useState(false);
    const [actionMenuSong, setActionMenuSong] = useState(null);
    const [actionMenuPos, setActionMenuPos] = useState(null);
    const [playlistMenuSong, setPlaylistMenuSong] = useState(null);

    // Load home sections on mount
    useEffect(() => {
        loadHomeSections();
    }, []);

    // Load recommendations when recently played changes
    useEffect(() => {
        if (recentlyPlayed.length > 0) {
            loadRecommendations(recentlyPlayed[0].videoId);
        } else {
            setRecommendations([]);
        }
    }, [recentlyPlayed[0]?.videoId]); // Only re-run if the *most recent* song changes

    const loadRecommendations = async (videoId) => {
        setIsLoadingRecs(true);
        try {
            const recs = await getRecommendations(videoId);
            setRecommendations(recs || []);
        } catch (err) {
            console.error('Failed to load recommendations:', err);
            setRecommendations([]);
        } finally {
            setIsLoadingRecs(false);
        }
    };

    const loadHomeSections = async () => {
        setIsLoading(true);
        try {
            const sections = await getHomeSections();
            setHomeSections(sections || []);
        } catch (err) {
            console.error('Failed to load home sections:', err);
            setHomeSections([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (openedCollection?.type === 'USER_PLAYLIST') {
            const updated = userPlaylists.find(p => p.id === openedCollection.id);
            if (updated) {
                setOpenedCollection({
                    ...updated,
                    songs: updated.songs || [],
                    thumbnail: updated.thumbnail || null
                });
            } else {
                setOpenedCollection(null);
            }
        }
    }, [userPlaylists, openedCollection?.id]);

    const handleGenreSelect = async (genre) => {
        setActiveGenre(genre);
        setOpenedCollection(null);

        if (genre === 'All') {
            setGenreSongs([]);
            if (homeSections.length === 0) {
                loadHomeSections();
            }
            return;
        }

        setIsLoading(true);
        try {
            const songs = await getGenreSongs(genre);
            setGenreSongs(songs || []);
        } catch (err) {
            console.error('Failed to load genre songs:', err);
            setGenreSongs([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePlaySong = (song) => {
        playSongWithRecommendations(song);
    };

    const handlePlayCollectionSong = (song, songList, index) => {
        playSongFromQueue(song, songList, index);
    };

    const handleOpenCollection = async (item) => {
        setCollectionLoading(true);
        setOpenedCollection({
            type: item.type,
            title: item.title,
            artist: item.artist,
            thumbnail: item.thumbnail,
            songs: [],
        });

        try {
            if (item.type === 'PLAYLIST') {
                const songs = await getPlaylistSongs(item.playlistId, item.title);
                setOpenedCollection(prev => ({ ...prev, songs: songs || [] }));
            } else if (item.type === 'ALBUM') {
                const data = await getAlbumSongs(item.albumId);
                setOpenedCollection(prev => ({
                    ...prev,
                    songs: data.results || [],
                    title: data.albumName || prev.title,
                    artist: data.artist || prev.artist,
                }));
            } else if (item.type === 'USER_PLAYLIST') {
                const playlist = userPlaylists.find(p => p.id === item.id);
                setOpenedCollection({
                    ...playlist,
                    songs: playlist?.songs || [],
                    thumbnail: playlist?.thumbnail || null
                });
            }
        } catch (err) {
            console.error('Failed to load collection:', err);
            setOpenedCollection(prev => ({ ...prev, songs: [] }));
        } finally {
            setCollectionLoading(false);
        }
    };

    const handleCloseCollection = () => {
        setOpenedCollection(null);
    };

    // Skeleton loaders
    const renderSkeletons = (count = 8, type = 'card') => (
        <div className={type === 'card' ? 'home-carousel' : 'genre-results-grid'}>
            {[...Array(count)].map((_, i) => (
                <div key={i} className={`${type === 'card' ? 'home-card' : 'genre-song-card'} skeleton`}>
                    <div className="skeleton-thumb" />
                    <div className="skeleton-info">
                        <div className="skeleton-title" />
                        <div className="skeleton-artist" />
                    </div>
                </div>
            ))}
        </div>
    );

    // ─── Recently Played ──────────────────────────────
    const renderRecentlyPlayed = () => {
        if (recentlyPlayed.length === 0) return null;
        return (
            <div className="home-section animate-fade-in-up" style={{ marginTop: '20px' }}>
                <div className="section-header">
                    <h3 className="section-title">
                        <FiClock style={{ marginRight: '8px', verticalAlign: 'middle', opacity: 0.8 }} />
                        Recently Played
                    </h3>
                    <button
                        className="section-clear-btn"
                        onClick={clearRecentlyPlayed}
                        title="Clear history"
                    >
                        <FiTrash2 />
                        <span>Clear</span>
                    </button>
                </div>
                <div className="home-carousel">
                    {recentlyPlayed.map((item, index) => {
                        const isActive = currentSong?.videoId === item.videoId;
                        return (
                            <div
                                key={`recent-${item.videoId}-${index}`}
                                className={`home-card ${isActive ? 'active' : ''}`}
                                onClick={() => handlePlaySong(item, recentlyPlayed, index)}
                                id={`recent-song-${item.videoId}`}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        handlePlaySong(item, recentlyPlayed, index);
                                    }
                                }}
                            >
                                <div className="home-card-thumb-wrapper">
                                    {item.thumbnail ? (
                                        <img
                                            src={item.thumbnail}
                                            alt={item.title}
                                            className="home-card-thumb"
                                            loading="lazy"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                    ) : null}
                                    <div className="home-card-thumb-placeholder" style={{ display: item.thumbnail ? 'none' : 'flex' }}>
                                        <FiMusic />
                                    </div>
                                    <div className="home-card-play-overlay">
                                        {isActive && isPlaying ? (
                                            <div className="mini-equalizer">
                                                <span /><span /><span />
                                            </div>
                                        ) : (
                                            <FiPlay />
                                        )}
                                    </div>
                                </div>
                                <div className="home-card-info">
                                    <span className="home-card-title">{item.title}</span>
                                    <span className="home-card-artist">{item.artist}</span>
                                </div>
                                <button
                                    className="home-card-more-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActionMenuPos({ x: e.clientX, y: e.clientY });
                                        setActionMenuSong(item);
                                    }}
                                    title="More options"
                                >
                                    <FiMoreVertical />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // ─── Liked Songs ──────────────────────────────────
    const renderFavourites = () => {
        if (favourites.length === 0) return null;
        return (
            <div className="home-section animate-fade-in-up" style={{ marginTop: '20px' }}>
                <div className="section-header">
                    <h3 className="section-title">
                        <FiHeart style={{ marginRight: '8px', verticalAlign: 'middle', color: '#ef4444' }} />
                        Liked Songs
                    </h3>
                </div>
                <div className="home-carousel">
                    {favourites.map((item, index) => {
                        const isActive = currentSong?.videoId === item.videoId;
                        return (
                            <div
                                key={`fav-${item.videoId}-${index}`}
                                className={`home-card ${isActive ? 'active' : ''}`}
                                onClick={() => handlePlaySong(item, favourites, index)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        handlePlaySong(item, favourites, index);
                                    }
                                }}
                                tabIndex={0}
                                role="button"
                            >
                                <div className="home-card-thumb-wrapper">
                                    {item.thumbnail ? (
                                        <img src={item.thumbnail} alt={item.title} className="home-card-thumb" loading="lazy" />
                                    ) : (
                                        <div className="home-card-thumb-placeholder">
                                            <FiMusic />
                                        </div>
                                    )}
                                    <div className="home-card-play-overlay">
                                        {isActive && isPlaying ? (
                                            <div className="mini-equalizer">
                                                <span /><span /><span />
                                            </div>
                                        ) : (
                                            <FiPlay />
                                        )}
                                    </div>
                                </div>
                                <div className="home-card-info">
                                    <span className="home-card-title">{item.title}</span>
                                    <span className="home-card-artist">{item.artist}</span>
                                </div>
                                <button
                                    className="home-card-more-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActionMenuPos({ x: e.clientX, y: e.clientY });
                                        setActionMenuSong(item);
                                    }}
                                    title="More options"
                                >
                                    <FiMoreVertical />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // ─── User Playlists ───────────────────────────────
    const handleCreatePlaylist = () => {
        const name = prompt('Enter playlist name:');
        if (name) createPlaylist(name);
    };

    const renderUserPlaylists = () => {
        return (
            <div className="home-section animate-fade-in-up" style={{ marginTop: '20px' }}>
                <div className="section-header">
                    <h3 className="section-title">
                        <FiList style={{ marginRight: '8px', verticalAlign: 'middle', opacity: 0.8 }} />
                        Your Library
                    </h3>
                    <button className="section-clear-btn" onClick={handleCreatePlaylist}>
                        <FiPlus />
                        <span>New Playlist</span>
                    </button>
                </div>
                {userPlaylists.length === 0 ? (
                    <div className="library-empty">
                        <p>No playlists created yet.</p>
                    </div>
                ) : (
                    <div className="home-carousel">
                        {userPlaylists.map((pl) => (
                            <div key={pl.id} className="home-card-wrapper" style={{ position: 'relative' }}>
                                <button
                                    className="home-card"
                                    onClick={() => handleOpenCollection(pl)}
                                >
                                    <div className="home-card-thumb-wrapper">
                                        {pl.thumbnail ? (
                                            <img src={pl.thumbnail} alt={pl.title} className="home-card-thumb" />
                                        ) : (
                                            <div className="home-card-thumb-placeholder">
                                                <FiList />
                                            </div>
                                        )}
                                        <div className="home-card-play-overlay">
                                            <FiPlay />
                                        </div>
                                    </div>
                                    <div className="home-card-info">
                                        <span className="home-card-title">{pl.title}</span>
                                        <span className="home-card-artist">{pl.songs.length} songs</span>
                                    </div>
                                </button>
                                <button
                                    className="home-card-delete-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm(`Delete playlist "${pl.title}"?`)) {
                                            deletePlaylist(pl.id);
                                        }
                                    }}
                                    title="Delete playlist"
                                >
                                    <FiTrash2 />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // ─── Recommended for You ──────────────────────────────
    const renderRecommendations = () => {
        if (isLoadingRecs) {
            return (
                <div className="home-section animate-fade-in-up" style={{ marginTop: '20px' }}>
                    <div className="section-header">
                        <div className="skeleton-section-title" />
                    </div>
                    {renderSkeletons(6)}
                </div>
            );
        }

        if (recommendations.length === 0) return null;

        return (
            <div className="home-section animate-fade-in-up" style={{ marginTop: '20px' }}>
                <div className="section-header">
                    <h3 className="section-title">
                        <FiStar style={{ marginRight: '8px', verticalAlign: 'middle', opacity: 0.8, color: 'var(--accent-primary)' }} />
                        Recommended for You
                    </h3>
                </div>
                <div className="home-carousel">
                    {recommendations.map((item, index) => {
                        const isActive = currentSong?.videoId === item.videoId;
                        return (
                            <div
                                key={`rec-${item.videoId}-${index}`}
                                className={`home-card ${isActive ? 'active' : ''}`}
                                onClick={() => handlePlaySong(item, recommendations, index)}
                                id={`rec-song-${item.videoId}`}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        handlePlaySong(item, recommendations, index);
                                    }
                                }}
                            >
                                <div className="home-card-thumb-wrapper">
                                    {item.thumbnail ? (
                                        <img
                                            src={item.thumbnail}
                                            alt={item.title}
                                            className="home-card-thumb"
                                            loading="lazy"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                    ) : null}
                                    <div className="home-card-thumb-placeholder" style={{ display: item.thumbnail ? 'none' : 'flex' }}>
                                        <FiMusic />
                                    </div>
                                    <div className="home-card-play-overlay">
                                        {isActive && isPlaying ? (
                                            <div className="mini-equalizer">
                                                <span /><span /><span />
                                            </div>
                                        ) : (
                                            <FiPlay />
                                        )}
                                    </div>
                                </div>
                                <div className="home-card-info">
                                    <span className="home-card-title">{item.title}</span>
                                    <span className="home-card-artist">{item.artist}</span>
                                </div>
                                <button
                                    className="home-card-more-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActionMenuPos({ x: e.clientX, y: e.clientY });
                                        setActionMenuSong(item);
                                    }}
                                    title="More options"
                                >
                                    <FiMoreVertical />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // ─── Collection Detail View ──────────────────────
    const renderCollectionView = () => {
        const col = openedCollection;
        return (
            <div className="collection-view animate-fade-in">
                <button className="collection-back-btn" onClick={handleCloseCollection} id="collection-back">
                    <FiArrowLeft />
                    <span>Back</span>
                </button>

                <div className="collection-header">
                    {col.thumbnail ? (
                        <img src={col.thumbnail} alt={col.title} className="collection-cover" />
                    ) : (
                        <div className="collection-cover-placeholder">
                            {col.type === 'ALBUM' ? <FiDisc /> : <FiList />}
                        </div>
                    )}
                    <div className="collection-meta">
                        <span className="collection-type-label">
                            {col.type === 'ALBUM' ? 'Album' : 'Playlist'}
                        </span>
                        <h2 className="collection-title">{col.title}</h2>
                        {col.artist && <p className="collection-artist">{col.artist}</p>}
                        <div className="collection-actions">
                            {!collectionLoading && col.songs.length > 0 && (
                                <button
                                    className="collection-play-all"
                                    onClick={() => handlePlayCollectionSong(col.songs[0], col.songs, 0)}
                                    id="play-all-btn"
                                >
                                    <FiPlay /> Play All
                                </button>
                            )}
                            {col.type === 'USER_PLAYLIST' && (
                                <button
                                    className="collection-delete-btn"
                                    onClick={() => {
                                        if (confirm(`Delete playlist "${col.title}"?`)) {
                                            deletePlaylist(col.id);
                                            handleCloseCollection();
                                        }
                                    }}
                                    title="Delete entire playlist"
                                >
                                    <FiTrash2 /> Delete Playlist
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {collectionLoading ? (
                    <div className="collection-songs-list">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="collection-song-item skeleton">
                                <div className="skeleton-num" />
                                <div className="skeleton-thumb-sm" />
                                <div className="skeleton-info">
                                    <div className="skeleton-title" />
                                    <div className="skeleton-artist" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : col.songs.length === 0 ? (
                    <div className="home-empty animate-fade-in">
                        <FiMusic className="home-empty-icon" />
                        <p>No songs found in this {col.type === 'ALBUM' ? 'album' : 'playlist'}</p>
                    </div>
                ) : (
                    <div className="collection-songs-list">
                        {col.songs.map((song, index) => {
                            const isActive = currentSong?.videoId === song.videoId;
                            return (
                                <div
                                    key={`${song.videoId}-${index}`}
                                    className={`collection-song-item ${isActive ? 'active' : ''}`}
                                    onClick={() => handlePlayCollectionSong(song, col.songs, index)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            handlePlayCollectionSong(song, col.songs, index);
                                        }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    id={`col-song-${song.videoId}`}
                                >
                                    <span className="collection-song-num">
                                        {isActive && isPlaying ? (
                                            <div className="mini-equalizer">
                                                <span /><span /><span />
                                            </div>
                                        ) : (
                                            index + 1
                                        )}
                                    </span>
                                    <div className="collection-song-thumb-wrapper">
                                        {song.thumbnail ? (
                                            <img
                                                src={song.thumbnail}
                                                alt={song.title}
                                                className="collection-song-thumb"
                                                loading="lazy"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.nextSibling.style.display = 'flex';
                                                }}
                                            />
                                        ) : null}
                                        <div className="collection-song-thumb-placeholder" style={{ display: song.thumbnail ? 'none' : 'flex' }}>
                                            <FiMusic />
                                        </div>
                                    </div>
                                    <div className="collection-song-info">
                                        <span className="collection-song-title">{song.title}</span>
                                        <span className="collection-song-artist">{song.artist}</span>
                                    </div>
                                    {song.duration && (
                                        <span className="collection-song-duration">{formatDuration(song.duration)}</span>
                                    )}
                                    <button
                                        className="collection-song-more-btn"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setActionMenuPos({ x: e.clientX, y: e.clientY });
                                            setActionMenuSong(song);
                                        }}
                                        title="More options"
                                    >
                                        <FiMoreVertical />
                                    </button>
                                    {col.type === 'USER_PLAYLIST' && (
                                        <button
                                            className="collection-song-remove-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeSongFromPlaylist(col.id, song.videoId);
                                            }}
                                            title="Remove from playlist"
                                        >
                                            <FiTrash2 />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const renderHomeSections = () => {
        if (isLoading) {
            return (
                <div className="home-sections">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="home-section">
                            <div className="section-header">
                                <div className="skeleton-section-title" />
                            </div>
                            {renderSkeletons(6)}
                        </div>
                    ))}
                </div>
            );
        }

        if (homeSections.length === 0) {
            return (
                <div className="home-empty animate-fade-in">
                    <FiMusic className="home-empty-icon" />
                    <p>No trending content available right now</p>
                    <span>Try selecting a genre above</span>
                </div>
            );
        }

        return (
            <div className="home-sections animate-fade-in">
                {homeSections.map((section, sIndex) => (
                    <div key={sIndex} className="home-section">
                        <div className="section-header">
                            <h3 className="section-title">{section.title}</h3>
                        </div>
                        <div className="home-carousel">
                            {section.contents.map((item, iIndex) => {
                                const isSong = item.type === 'SONG';
                                const isActive = isSong && currentSong?.videoId === item.videoId;

                                return (
                                    <div
                                        key={`${item.videoId || item.albumId || item.playlistId}-${iIndex}`}
                                        className={`home-card ${isActive ? 'active' : ''}`}
                                        onClick={() => {
                                            if (isSong) {
                                                const songItems = section.contents.filter(c => c.type === 'SONG');
                                                const songIndex = songItems.findIndex(s => s.videoId === item.videoId);
                                                handlePlaySong(item, songItems, songIndex);
                                            } else {
                                                handleOpenCollection(item);
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                if (isSong) {
                                                    const songItems = section.contents.filter(c => c.type === 'SONG');
                                                    const songIndex = songItems.findIndex(s => s.videoId === item.videoId);
                                                    handlePlaySong(item, songItems, songIndex);
                                                } else {
                                                    handleOpenCollection(item);
                                                }
                                            }
                                        }}
                                        tabIndex={0}
                                        role="button"
                                        id={`home-item-${item.videoId || item.albumId || item.playlistId}`}
                                    >
                                        <div className="home-card-thumb-wrapper">
                                            {item.thumbnail ? (
                                                <img
                                                    src={item.thumbnail}
                                                    alt={item.title}
                                                    className="home-card-thumb"
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <div className="home-card-thumb-placeholder" style={{ display: item.thumbnail ? 'none' : 'flex' }}>
                                                {isSong ? <FiMusic /> : item.type === 'ALBUM' ? <FiDisc /> : <FiList />}
                                            </div>
                                            <div className="home-card-play-overlay">
                                                {isSong ? (
                                                    isActive && isPlaying ? (
                                                        <div className="mini-equalizer">
                                                            <span /><span /><span />
                                                        </div>
                                                    ) : (
                                                        <FiPlay />
                                                    )
                                                ) : (
                                                    <FiPlay />
                                                )}
                                            </div>
                                            {!isSong && (
                                                <div className="home-card-type-badge">
                                                    {item.type === 'ALBUM' ? 'Album' : 'Playlist'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="home-card-info">
                                            <span className="home-card-title">{item.title}</span>
                                            <span className="home-card-artist">{item.artist}</span>
                                        </div>
                                        {isSong && (
                                            <button
                                                className="home-card-more-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActionMenuPos({ x: e.clientX, y: e.clientY });
                                                    setActionMenuSong(item);
                                                }}
                                                title="More options"
                                            >
                                                <FiMoreVertical />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderGenreResults = () => {
        if (isLoading) {
            return renderSkeletons(12, 'genre');
        }

        if (genreSongs.length === 0) {
            return (
                <div className="home-empty animate-fade-in">
                    <FiMusic className="home-empty-icon" />
                    <p>No songs found for this genre</p>
                </div>
            );
        }

        return (
            <div className="genre-results-grid animate-fade-in">
                {genreSongs.map((song, index) => {
                    const isActive = currentSong?.videoId === song.videoId;
                    return (
                        <div
                            key={`${song.videoId}-${index}`}
                            className={`genre-song-card ${isActive ? 'active' : ''}`}
                            onClick={() => handlePlaySong(song, genreSongs, index)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    handlePlaySong(song, genreSongs, index);
                                }
                            }}
                            tabIndex={0}
                            role="button"
                            id={`genre-song-${song.videoId}`}
                        >
                            <div className="genre-card-thumb-wrapper">
                                {song.thumbnail ? (
                                    <img
                                        src={song.thumbnail}
                                        alt={song.title}
                                        className="genre-card-thumb"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="genre-card-thumb-placeholder">
                                        <FiMusic />
                                    </div>
                                )}
                                <div className="genre-card-play-overlay">
                                    {isActive && isPlaying ? (
                                        <div className="mini-equalizer">
                                            <span /><span /><span />
                                        </div>
                                    ) : (
                                        <FiPlay />
                                    )}
                                </div>
                            </div>
                            <div className="genre-card-info">
                                <span className="genre-card-title">{song.title}</span>
                                <span className="genre-card-artist">{song.artist}</span>
                            </div>
                            <button
                                className="genre-card-more-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActionMenuPos({ x: e.clientX, y: e.clientY });
                                    setActionMenuSong(song);
                                }}
                                title="More options"
                            >
                                <FiMoreVertical />
                            </button>
                            {song.duration && (
                                <span className="genre-card-duration">{formatDuration(song.duration)}</span>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    // Default content when no collection is opened
    const content = activeGenre === 'All' ? (
        <>
            <div className="home-hero animate-fade-in-up">
                <h2 className="home-title">
                    Trending <span className="gradient-text">Now</span>
                </h2>
                <p className="home-subtitle">
                    Discover what's hot on YouTube Music
                </p>
            </div>
            {recentlyPlayed.length > 0 && renderRecentlyPlayed()}
            {favourites.length > 0 && renderFavourites()}
            {userPlaylists.length > 0 && renderUserPlaylists()}
            {recommendations.length > 0 && renderRecommendations()}
            {renderHomeSections()}
        </>
    ) : (
        <>
            <div className="home-hero animate-fade-in-up">
                <h2 className="home-title">
                    <span className="gradient-text">{activeGenre}</span> Music
                </h2>
                <p className="home-subtitle">
                    Explore the best {activeGenre} tracks
                </p>
            </div>
            {renderGenreResults()}
        </>
    );

    return (
        <div className="home-page" id="home-page">
            {openedCollection ? (
                renderCollectionView()
            ) : (
                <>
                    <GenreBar activeGenre={activeGenre} onGenreSelect={handleGenreSelect} />
                    {content}
                </>
            )}

            {actionMenuSong && (
                <SongActionMenu
                    song={actionMenuSong}
                    position={actionMenuPos}
                    onClose={() => {
                        setActionMenuSong(null);
                        setActionMenuPos(null);
                    }}
                    onAddToPlaylist={(s) => {
                        setActionMenuSong(null);
                        setActionMenuPos(null);
                        setPlaylistMenuSong(s);
                    }}
                />
            )}

            {playlistMenuSong && (
                <AddToPlaylistMenu
                    song={playlistMenuSong}
                    onClose={() => setPlaylistMenuSong(null)}
                />
            )}
        </div>
    );
}

