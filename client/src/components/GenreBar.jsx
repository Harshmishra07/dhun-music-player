import { FiMusic } from 'react-icons/fi';
import './GenreBar.css';

const GENRES = [
    { name: 'All', emoji: '🔥' },
    { name: 'Pop', emoji: '🎤' },
    { name: 'Hip-Hop', emoji: '🎧' },
    { name: 'R&B', emoji: '💜' },
    { name: 'Rock', emoji: '🎸' },
    { name: 'Bollywood', emoji: '🎬' },
    { name: 'Lo-fi', emoji: '🌙' },
    { name: 'EDM', emoji: '⚡' },
    { name: 'Jazz', emoji: '🎷' },
    { name: 'Classical', emoji: '🎻' },
    { name: 'Indie', emoji: '🌿' },
    { name: 'K-Pop', emoji: '💖' },
    { name: 'Latin', emoji: '💃' },
    { name: 'Country', emoji: '🤠' },
    { name: 'Punjabi', emoji: '🥁' },
];

export default function GenreBar({ activeGenre, onGenreSelect }) {
    return (
        <div className="genre-bar" id="genre-bar">
            <div className="genre-bar-scroll">
                {GENRES.map((genre) => (
                    <button
                        key={genre.name}
                        className={`genre-pill ${activeGenre === genre.name ? 'active' : ''}`}
                        onClick={() => onGenreSelect(genre.name)}
                        id={`genre-${genre.name.toLowerCase()}`}
                    >
                        <span className="genre-emoji">{genre.emoji}</span>
                        <span className="genre-name">{genre.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

export { GENRES };
