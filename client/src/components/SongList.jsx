import { useState } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { FiPlay, FiMusic, FiPlus } from 'react-icons/fi';
import AddToPlaylistMenu from './AddToPlaylistMenu.jsx';
import './SongList.css';

function formatDuration(seconds) {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function SongList({ songs, isLoading }) {
    const { playSongFromQueue, currentSong, isPlaying } = usePlayer();
    const [menuSong, setMenuSong] = useState(null);

    const handlePlay = (song, index) => {
        playSongFromQueue(song, songs, index);
    };

    if (isLoading) {
        return (
            <div className="song-list">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="song-item skeleton">
                        <div className="skeleton-thumb" />
                        <div className="skeleton-info">
                            <div className="skeleton-title" />
                            <div className="skeleton-artist" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!songs || songs.length === 0) {
        return null;
    }

    return (
        <div className="song-list">
            {menuSong && (
                <AddToPlaylistMenu
                    song={menuSong}
                    onClose={() => setMenuSong(null)}
                />
            )}
            {songs.map((song, index) => {
                const isActive = currentSong?.videoId === song.videoId;
                return (
                    <div
                        key={song.videoId + index}
                        className={`song-item ${isActive ? 'active' : ''}`}
                        onClick={() => handlePlay(song, index)}
                        id={`song-${song.videoId}`}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                handlePlay(song, index);
                            }
                        }}
                    >
                        <div className="song-thumb-wrapper">
                            {song.thumbnail ? (
                                <img
                                    src={song.thumbnail}
                                    alt={song.title}
                                    className="song-thumb"
                                    loading="lazy"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                            ) : null}
                            <div className="song-thumb-placeholder" style={{ display: song.thumbnail ? 'none' : 'flex' }}>
                                <FiMusic />
                            </div>
                            <div className="song-play-overlay">
                                {isActive && isPlaying ? (
                                    <div className="equalizer">
                                        <span /><span /><span /><span />
                                    </div>
                                ) : (
                                    <FiPlay />
                                )}
                            </div>
                        </div>

                        <div className="song-info">
                            <span className="song-title">{song.title}</span>
                            <span className="song-artist">{song.artist}</span>
                        </div>

                        {song.album && (
                            <span className="song-album">{song.album}</span>
                        )}

                        <span className="song-duration">
                            {formatDuration(song.duration)}
                        </span>

                        <button
                            className="song-add-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                setMenuSong(song);
                            }}
                            title="Add to playlist"
                        >
                            <FiPlus />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
