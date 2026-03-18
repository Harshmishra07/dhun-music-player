import { useRef, useEffect, useState } from 'react';
import {
    FiPlus, FiList, FiHeart, FiShare2, FiMusic, FiX, FiPlayCircle, FiSearch
} from 'react-icons/fi';
import { usePlayer } from '../context/PlayerContext.jsx';
import './SongActionMenu.css';

export default function SongActionMenu({ song, onClose, onAddToPlaylist, position }) {
    const {
        addToQueue,
        toggleFavourite,
        favourites,
        addToast
    } = usePlayer();

    const menuRef = useRef(null);
    const isFavourite = favourites.some(s => s.videoId === song.videoId);

    const [calculatedPos, setCalculatedPos] = useState({ top: 0, left: 0, opacity: 0 });

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Calculate smart positioning based on viewport boundaries
    useEffect(() => {
        if (menuRef.current && position) {
            const rect = menuRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let top = position.y;
            let left = position.x;

            // Adjust horizontal position if menu overflows off the right side
            if (left + rect.width > viewportWidth - 10) {
                left = viewportWidth - rect.width - 10;
            }

            // Adjust vertical position if menu overflows off the bottom
            if (top + rect.height > viewportHeight - 10) {
                // Try opening upwards instead of downwards
                top = position.y - rect.height;
                if (top < 10) {
                    // if it still clips the top, just clamp it to the bottom
                    top = viewportHeight - rect.height - 10;
                }
            }

            setCalculatedPos({ top, left, opacity: 1 });
        }
    }, [position]);

    const handleShare = async () => {
        const shareData = {
            title: song.title,
            text: `Check out ${song.title} by ${song.artist} on Dhun!`,
            url: window.location.origin + '?v=' + song.videoId
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareData.url);
                addToast('Link copied to clipboard!', 'success');
            }
        } catch (err) {
            console.error('Share failed:', err);
        }
        onClose();
    };

    const actions = [
        {
            id: 'play-next',
            label: 'Find Similar',
            icon: <FiSearch />,
            onClick: () => {
                window.dispatchEvent(new CustomEvent('show-similar-songs', { detail: song.videoId }));
                onClose();
            }
        },
        {
            id: 'add-queue',
            label: 'Add to Queue',
            icon: <FiList />,
            onClick: () => {
                addToQueue(song);
                onClose();
            }
        },
        {
            id: 'add-playlist',
            label: 'Add to Playlist',
            icon: <FiPlus />,
            onClick: () => {
                onAddToPlaylist(song);
                onClose();
            }
        },
        {
            id: 'favourite',
            label: isFavourite ? 'Remove from Liked' : 'Save to Liked Songs',
            icon: <FiHeart style={{ fill: isFavourite ? 'currentColor' : 'none' }} />,
            onClick: () => {
                toggleFavourite(song);
                onClose();
            },
            active: isFavourite
        },
        {
            id: 'share',
            label: 'Share',
            icon: <FiShare2 />,
            onClick: handleShare
        }
    ];

    return (
        <div className="song-action-overlay" onClick={onClose}>
            <div
                className="song-action-menu"
                ref={menuRef}
                style={position ? { // Apply styles only if position is provided
                    position: 'absolute',
                    top: `${calculatedPos.top}px`,
                    left: `${calculatedPos.left}px`,
                    opacity: calculatedPos.opacity,
                    visibility: calculatedPos.opacity ? 'visible' : 'hidden'
                } : { // Otherwise, hide it completely
                    visibility: 'hidden',
                    opacity: 0,
                    pointerEvents: 'none' // Prevent interaction when hidden
                }}
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            >
                <div className="song-action-header">
                    <div className="song-action-info">
                        <img src={song.thumbnail} alt="" className="song-action-thumb" />
                        <div className="song-action-meta">
                            <span className="song-action-title">{song.title}</span>
                            <span className="song-action-artist">{song.artist}</span>
                        </div>
                    </div>
                    <button className="song-action-close" onClick={onClose}>
                        <FiX />
                    </button>
                </div>

                <div className="song-action-list">
                    {actions.map(action => (
                        <button
                            key={action.id}
                            className={`song-action-item ${action.active ? 'active' : ''}`}
                            onClick={action.onClick}
                        >
                            <span className="song-action-icon">{action.icon}</span>
                            <span className="song-action-label">{action.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
