import { useState } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { FiPlus, FiX, FiList } from 'react-icons/fi';
import './AddToPlaylistMenu.css';

export default function AddToPlaylistMenu({ song, onClose }) {
    const { userPlaylists, createPlaylist, addSongToPlaylist } = usePlayer();
    const [showNewInput, setShowNewInput] = useState(false);
    const [newName, setNewName] = useState('');

    const handleCreate = (e) => {
        e.preventDefault();
        if (newName.trim()) {
            const pl = createPlaylist(newName);
            if (pl) addSongToPlaylist(pl.id, song);
            onClose();
        }
    };

    return (
        <div className="playlist-menu-overlay" onClick={onClose}>
            <div className="playlist-menu-content animate-pop-in" onClick={e => e.stopPropagation()}>
                <div className="playlist-menu-header">
                    <h4 className="playlist-menu-title">Add to Playlist</h4>
                    <button className="playlist-menu-close" onClick={onClose}>
                        <FiX />
                    </button>
                </div>

                <div className="playlist-menu-list">
                    {userPlaylists.length === 0 && !showNewInput && (
                        <div className="playlist-menu-empty">
                            <FiList style={{ fontSize: '1.5rem', opacity: 0.3, marginBottom: '8px' }} />
                            <span>No playlists yet</span>
                        </div>
                    )}
                    {userPlaylists.map(pl => (
                        <button
                            key={pl.id}
                            className="playlist-menu-item"
                            onClick={() => {
                                addSongToPlaylist(pl.id, song);
                                onClose();
                            }}
                        >
                            <span className="playlist-menu-item-name">{pl.title}</span>
                            <FiPlus className="playlist-menu-item-plus" />
                        </button>
                    ))}
                </div>

                <div className="playlist-menu-footer">
                    {showNewInput ? (
                        <form onSubmit={handleCreate} className="playlist-menu-form">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Playlist name..."
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                className="playlist-menu-input"
                            />
                            <div className="playlist-menu-form-actions">
                                <button type="button" className="playlist-menu-cancel" onClick={() => setShowNewInput(false)}>Cancel</button>
                                <button type="submit" className="playlist-menu-submit">Create</button>
                            </div>
                        </form>
                    ) : (
                        <button className="playlist-menu-new-btn" onClick={() => setShowNewInput(true)}>
                            <FiPlus />
                            <span>Create New Playlist</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
