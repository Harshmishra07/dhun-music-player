import { useState } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { FiX, FiMusic, FiTrash2, FiPlay, FiPlus } from 'react-icons/fi';
import AddToPlaylistMenu from './AddToPlaylistMenu.jsx';
import './QueuePanel.css';

function formatDuration(seconds) {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function QueuePanel({ isOpen, onClose, isInline = false }) {
    const {
        queue,
        queueIndex,
        currentSong,
        isPlaying,
        removeFromQueue,
        clearQueue,
        playFromQueue,
    } = usePlayer();

    const [menuSong, setMenuSong] = useState(null);

    if (!isOpen && !isInline) return null;

    const upNext = queue.slice(queueIndex + 1);
    const played = queue.slice(0, queueIndex);

    return (
        <>
            {/* Backdrop - Only for non-inline */}
            {!isInline && isOpen && (
                <div className="queue-backdrop" onClick={onClose} />
            )}

            {/* Panel - Class changes if inline */}
            <div className={`queue-panel ${isOpen ? 'open' : ''} ${isInline ? 'inline' : ''}`} id={isInline ? 'expanded-queue' : 'queue-panel'}>
                {/* Header - Conditional render or modified for inline */}
                {/* Header */}
                <div className="queue-header">
                    <h3 className="queue-title">Queue</h3>
                    <div className="queue-header-actions">
                        {queue.length > 0 && (
                            <button
                                className="queue-clear-btn"
                                onClick={clearQueue}
                                title="Clear queue"
                                id="clear-queue-btn"
                            >
                                <FiTrash2 />
                                <span>Clear</span>
                            </button>
                        )}
                        {!isInline && (
                            <button className="queue-close-btn" onClick={onClose} id="close-queue-btn">
                                <FiX />
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="queue-content">
                    {menuSong && (
                        <AddToPlaylistMenu
                            song={menuSong}
                            onClose={() => setMenuSong(null)}
                        />
                    )}
                    {queue.length === 0 ? (
                        <div className="queue-empty">
                            <FiMusic className="queue-empty-icon" />
                            <p>Your queue is empty</p>
                            <span>Play a song to get started</span>
                        </div>
                    ) : (
                        <>
                            {/* Now Playing */}
                            {currentSong && (
                                <div className="queue-section">
                                    <h4 className="queue-section-label">Now Playing</h4>
                                    <div className="queue-item now-playing">
                                        <div className="queue-item-thumb-wrapper">
                                            {currentSong.thumbnail ? (
                                                <img
                                                    src={currentSong.thumbnail}
                                                    alt={currentSong.title}
                                                    className="queue-item-thumb"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <div className="queue-item-thumb-placeholder" style={{ display: currentSong.thumbnail ? 'none' : 'flex' }}>
                                                <FiMusic />
                                            </div>
                                            <div className="queue-item-playing-indicator">
                                                {isPlaying ? (
                                                    <div className="mini-eq">
                                                        <span /><span /><span />
                                                    </div>
                                                ) : (
                                                    <FiPlay />
                                                )}
                                            </div>
                                        </div>
                                        <div className="queue-item-info">
                                            <span className="queue-item-title">{currentSong.title}</span>
                                            <span className="queue-item-artist">{currentSong.artist}</span>
                                        </div>
                                        {currentSong.duration && (
                                            <span className="queue-item-duration">{formatDuration(currentSong.duration)}</span>
                                        )}
                                        <button
                                            className="queue-item-add"
                                            onClick={() => setMenuSong(currentSong)}
                                            title="Add to playlist"
                                        >
                                            <FiPlus />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Up Next */}
                            {upNext.length > 0 && (
                                <div className="queue-section">
                                    <h4 className="queue-section-label">
                                        Up Next
                                        <span className="queue-count">{upNext.length}</span>
                                    </h4>
                                    {upNext.map((song, i) => {
                                        const actualIndex = queueIndex + 1 + i;
                                        return (
                                            <div
                                                key={`${song.videoId}-${actualIndex}`}
                                                className="queue-item"
                                            >
                                                <button
                                                    className="queue-item-play"
                                                    onClick={() => playFromQueue(actualIndex)}
                                                    title="Play this song"
                                                >
                                                    <div className="queue-item-thumb-wrapper">
                                                        {song.thumbnail ? (
                                                            <img
                                                                src={song.thumbnail}
                                                                alt={song.title}
                                                                className="queue-item-thumb"
                                                                onError={(e) => {
                                                                    e.target.style.display = 'none';
                                                                    e.target.nextSibling.style.display = 'flex';
                                                                }}
                                                            />
                                                        ) : null}
                                                        <div className="queue-item-thumb-placeholder" style={{ display: song.thumbnail ? 'none' : 'flex' }}>
                                                            <FiMusic />
                                                        </div>
                                                        <div className="queue-item-hover-play">
                                                            <FiPlay />
                                                        </div>
                                                    </div>
                                                    <div className="queue-item-info">
                                                        <span className="queue-item-title">{song.title}</span>
                                                        <span className="queue-item-artist">{song.artist}</span>
                                                    </div>
                                                </button>
                                                {song.duration && (
                                                    <span className="queue-item-duration">{formatDuration(song.duration)}</span>
                                                )}
                                                <button
                                                    className="queue-item-add"
                                                    onClick={() => setMenuSong(song)}
                                                    title="Add to playlist"
                                                >
                                                    <FiPlus />
                                                </button>
                                                <button
                                                    className="queue-item-remove"
                                                    onClick={() => removeFromQueue(actualIndex)}
                                                    title="Remove from queue"
                                                >
                                                    <FiX />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Previously Played */}
                            {played.length > 0 && (
                                <div className="queue-section">
                                    <h4 className="queue-section-label">
                                        Previously Played
                                        <span className="queue-count">{played.length}</span>
                                    </h4>
                                    {played.map((song, i) => (
                                        <div
                                            key={`${song.videoId}-prev-${i}`}
                                            className="queue-item played"
                                        >
                                            <button
                                                className="queue-item-play"
                                                onClick={() => playFromQueue(i)}
                                                title="Play this song"
                                            >
                                                <div className="queue-item-thumb-wrapper">
                                                    {song.thumbnail ? (
                                                        <img
                                                            src={song.thumbnail}
                                                            alt={song.title}
                                                            className="queue-item-thumb"
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                e.target.nextSibling.style.display = 'flex';
                                                            }}
                                                        />
                                                    ) : null}
                                                    <div className="queue-item-thumb-placeholder" style={{ display: song.thumbnail ? 'none' : 'flex' }}>
                                                        <FiMusic />
                                                    </div>
                                                    <div className="queue-item-hover-play">
                                                        <FiPlay />
                                                    </div>
                                                </div>
                                                <div className="queue-item-info">
                                                    <span className="queue-item-title">{song.title}</span>
                                                    <span className="queue-item-artist">{song.artist}</span>
                                                </div>
                                            </button>
                                            {song.duration && (
                                                <span className="queue-item-duration">{formatDuration(song.duration)}</span>
                                            )}
                                            <button
                                                className="queue-item-remove"
                                                onClick={() => removeFromQueue(i)}
                                                title="Remove from queue"
                                            >
                                                <FiX />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
