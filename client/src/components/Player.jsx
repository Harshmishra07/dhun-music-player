import { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import ProgressBar from './ProgressBar.jsx';
import QueuePanel from './QueuePanel.jsx';

import Visualizer from './Visualizer.jsx';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts.js';
import {
    FiPlay, FiPause, FiSkipBack, FiSkipForward, FiShuffle, FiRepeat,
    FiVolume2, FiVolumeX, FiMusic, FiLoader, FiList, FiChevronUp, FiChevronDown, FiPlus
} from 'react-icons/fi';
import AddToPlaylistMenu from './AddToPlaylistMenu.jsx';
import { TbRepeatOnce } from 'react-icons/tb';
import './Player.css';

function formatTime(seconds) {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Upgrade a YouTube thumbnail URL to the highest resolution available */
function getHQThumbnail(url) {
    if (!url) return url;
    // Replace any known quality token with maxresdefault
    return url
        .replace(/\/hqdefault\.jpg/, '/maxresdefault.jpg')
        .replace(/\/mqdefault\.jpg/, '/maxresdefault.jpg')
        .replace(/\/sddefault\.jpg/, '/maxresdefault.jpg')
        .replace(/\/default\.jpg/, '/maxresdefault.jpg');
}

export default function Player() {
    const {
        currentSong,
        isPlaying,
        currentTime,
        duration,
        volume,
        isLoading,
        shuffle,
        repeat,
        queue,
        togglePlay,
        handleNext,
        handlePrev,
        seek,
        setVolume,
        toggleShuffle,
        toggleRepeat,
        dominantColor,
    } = usePlayer();

    const [queueOpen, setQueueOpen] = useState(false);

    const [expanded, setExpanded] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    // Prevent body scroll when player is expanded
    useEffect(() => {
        if (expanded) {
            document.body.classList.add('no-scroll');
        } else {
            document.body.classList.remove('no-scroll');
        }
        return () => document.body.classList.remove('no-scroll');
    }, [expanded]);

    // Keyboard shortcuts
    useKeyboardShortcuts({
        togglePlay,
        handleNext,
        handlePrev,
        seek,
        currentTime,
        volume,
        setVolume,
        currentSong,
    });

    if (!currentSong) return null;

    // ─── Expanded (Mobile) Full-screen Player ────────────────────────
    if (expanded) {
        return (
            <>
                <div className="player-expanded" id="player-expanded">
                    <div
                        className="player-expanded-bg"
                        style={{ background: '#000000' }}
                    />

                    <div className="player-expanded-content">
                        <button className="player-collapse-btn" onClick={() => setExpanded(false)} id="player-collapse-btn">
                            <FiChevronDown />
                        </button>

                        <div className="player-expanded-body">
                            <div className="player-expanded-main">
                                <div className="player-expanded-art">
                                    {currentSong.thumbnail ? (
                                        <img
                                            src={getHQThumbnail(currentSong.thumbnail)}
                                            alt={currentSong.title}
                                            className="player-expanded-thumb"
                                            onError={(e) => {
                                                // Step down: maxresdefault → hqdefault → original → hide
                                                const src = e.target.src;
                                                if (src.includes('maxresdefault')) {
                                                    e.target.src = src.replace('maxresdefault', 'hqdefault');
                                                } else if (src.includes('hqdefault')) {
                                                    e.target.src = currentSong.thumbnail;
                                                } else {
                                                    e.target.style.display = 'none';
                                                    e.target.nextSibling.style.display = 'flex';
                                                }
                                            }}
                                        />
                                    ) : null}
                                    <div className="player-expanded-thumb-placeholder" style={{ display: currentSong.thumbnail ? 'none' : 'flex' }}>
                                        <FiMusic />
                                    </div>
                                </div>

                                <div className="player-expanded-meta">
                                    <span className="player-expanded-title">{currentSong.title}</span>
                                    <span className="player-expanded-artist">{currentSong.artist}</span>
                                </div>

                                <div className="player-expanded-progress">
                                    <ProgressBar currentTime={currentTime} duration={duration} onSeek={seek} />
                                </div>

                                <div className="player-expanded-controls">
                                    <button
                                        className={`control-btn ${shuffle ? 'active' : ''}`}
                                        onClick={toggleShuffle}
                                        title="Shuffle"
                                    >
                                        <FiShuffle />
                                    </button>
                                    <button className="control-btn" onClick={handlePrev} title="Previous">
                                        <FiSkipBack />
                                    </button>
                                    <button className="control-btn play-btn expanded-play-btn" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
                                        {isLoading ? (
                                            <FiLoader className="spin" />
                                        ) : isPlaying ? (
                                            <FiPause />
                                        ) : (
                                            <FiPlay style={{ marginLeft: '3px' }} />
                                        )}
                                    </button>
                                    <button className="control-btn" onClick={handleNext} title="Next">
                                        <FiSkipForward />
                                    </button>
                                    <button
                                        className={`control-btn ${repeat !== 'off' ? 'active' : ''}`}
                                        onClick={toggleRepeat}
                                        title={`Repeat: ${repeat}`}
                                    >
                                        {repeat === 'one' ? <TbRepeatOnce /> : <FiRepeat />}
                                    </button>
                                </div>

                                <div className="player-expanded-actions">
                                    <button
                                        className="control-btn"
                                        onClick={() => setMenuOpen(true)}
                                        title="Add to playlist"
                                    >
                                        <FiPlus />
                                    </button>
                                    <div className="player-expanded-volume">
                                        <button
                                            className="control-btn"
                                            onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
                                            title={volume === 0 ? 'Unmute' : 'Mute'}
                                        >
                                            {volume === 0 ? <FiVolumeX /> : <FiVolume2 />}
                                        </button>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            value={volume}
                                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                                            className="volume-slider"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="player-expanded-queue-container">
                                <QueuePanel isInline={true} isOpen={true} />
                            </div>
                        </div>
                    </div>
                </div>


                <QueuePanel isOpen={queueOpen} onClose={() => setQueueOpen(false)} />
                {menuOpen && (
                    <AddToPlaylistMenu
                        song={currentSong}
                        onClose={() => setMenuOpen(false)}
                    />
                )}
            </>
        );
    }

    // ─── Default Mini Player Bar ─────────────────────────────────────
    return (
        <>
            <div className="player" id="player">
                <Visualizer />
                <ProgressBar currentTime={currentTime} duration={duration} onSeek={seek} />

                <div className="player-content">
                    {/* Song Info */}
                    <div className="player-song-info" onClick={() => setExpanded(true)} role="button" tabIndex={0}>
                        <div className="player-thumb-wrapper">
                            {currentSong.thumbnail ? (
                                <img
                                    src={currentSong.thumbnail}
                                    alt={currentSong.title}
                                    className={`player-thumb ${isPlaying ? 'spinning' : ''}`}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                            ) : null}
                            <div className="player-thumb-placeholder" style={{ display: currentSong.thumbnail ? 'none' : 'flex' }}>
                                <FiMusic />
                            </div>
                        </div>
                        <div className="player-meta">
                            <span className="player-title">{currentSong.title}</span>
                            <span className="player-artist">{currentSong.artist}</span>
                        </div>
                        <button className="player-expand-btn" title="Expand" id="player-expand-btn">
                            <FiChevronUp />
                        </button>
                    </div>

                    {/* Controls */}
                    <div className="player-controls">
                        <button
                            className={`control-btn small ${shuffle ? 'active' : ''}`}
                            onClick={toggleShuffle}
                            title="Shuffle"
                            id="shuffle-btn"
                        >
                            <FiShuffle />
                        </button>

                        <button className="control-btn" onClick={handlePrev} title="Previous" id="prev-btn">
                            <FiSkipBack />
                        </button>

                        <button className="control-btn play-btn" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'} id="play-btn">
                            {isLoading ? (
                                <FiLoader className="spin" />
                            ) : isPlaying ? (
                                <FiPause />
                            ) : (
                                <FiPlay style={{ marginLeft: '2px' }} />
                            )}
                        </button>

                        <button className="control-btn" onClick={handleNext} title="Next" id="next-btn">
                            <FiSkipForward />
                        </button>

                        <button
                            className={`control-btn small ${repeat !== 'off' ? 'active' : ''}`}
                            onClick={toggleRepeat}
                            title={`Repeat: ${repeat}`}
                            id="repeat-btn"
                        >
                            {repeat === 'one' ? <TbRepeatOnce /> : <FiRepeat />}
                        </button>

                        <button
                            className="control-btn small"
                            onClick={() => setMenuOpen(true)}
                            title="Add to playlist"
                            id="player-add-playlist-btn"
                        >
                            <FiPlus />
                        </button>
                    </div>

                    {/* Volume & Queue */}
                    <div className="player-right-controls">
                        <button
                            className={`control-btn small ${queueOpen ? 'active' : ''}`}
                            onClick={() => setQueueOpen(!queueOpen)}
                            title="Queue"
                            id="queue-toggle-btn"
                        >
                            <FiList />
                            {queue.length > 1 && (
                                <span className="queue-badge">{queue.length}</span>
                            )}
                        </button>
                        <div className="player-volume">
                            <button
                                className="control-btn small"
                                onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
                                title={volume === 0 ? 'Unmute' : 'Mute'}
                                id="mute-btn"
                            >
                                {volume === 0 ? <FiVolumeX /> : <FiVolume2 />}
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                className="volume-slider"
                                id="volume-slider"
                            />
                        </div>
                    </div>
                </div>
            </div>


            <QueuePanel isOpen={queueOpen} onClose={() => setQueueOpen(false)} />
            {menuOpen && (
                <AddToPlaylistMenu
                    song={currentSong}
                    onClose={() => setMenuOpen(false)}
                />
            )}
        </>
    );
}
