import { useState, useEffect } from 'react';
import SearchBar from './components/SearchBar.jsx';
import SongList from './components/SongList.jsx';
import Player from './components/Player.jsx';
import HomePage from './components/HomePage.jsx';
import ToastContainer from './components/Toast.jsx';
import { usePlayer } from './context/PlayerContext.jsx';
import { getRecommendations } from './api/musicApi.js';
import { FiGithub, FiMusic } from 'react-icons/fi';
import './App.css';

function App() {
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const { currentSong, dominantColor, toasts, dismissToast, retryPlay } = usePlayer();

    const handleResults = (results) => {
        setSearchResults(results);
        setHasSearched(true);
    };

    const handleClearSearch = () => {
        setSearchResults([]);
        setHasSearched(false);
    };

    const handleRetryToast = (toast) => {
        dismissToast(toast.id);
        retryPlay();
    };

    // Listen for custom search events from other components e.g. "Find Similar"
    useEffect(() => {
        const handleFindSimilar = async (e) => {
            const videoId = e.detail;
            if (!videoId) return;

            setIsSearching(true);
            setHasSearched(true);
            try {
                const results = await getRecommendations(videoId);
                setSearchResults(results || []);
            } catch (err) {
                console.error('Failed to fetch similar songs', err);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        };

        window.addEventListener('show-similar-songs', handleFindSimilar);
        return () => window.removeEventListener('show-similar-songs', handleFindSimilar);
    }, []);

    // Dynamic background style
    const dynamicBgStyle = dominantColor ? {
        '--dynamic-color': dominantColor
    } : {};

    return (
        <div className="app" style={dynamicBgStyle}>
            {/* Background */}
            <div className="app-bg">
                <div className={`bg-orb bg-orb-1 ${dominantColor ? 'dynamic' : ''}`} />
                <div className={`bg-orb bg-orb-2 ${dominantColor ? 'dynamic' : ''}`} />
                <div className={`bg-orb bg-orb-3 ${dominantColor ? 'dynamic' : ''}`} />
            </div>

            {/* Header */}
            <header className="app-header">
                <div className="brand">
                    <div className="brand-icon">
                        <FiMusic />
                    </div>
                    <h1 className="brand-name">Dhun</h1>
                    <span className="brand-version">v2.0</span>
                </div>
                <a
                    href="https://github.com/Harshmishra07"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="github-link"
                    id="github-link"
                >
                    <FiGithub />
                </a>
            </header>

            {/* Main Content */}
            <main className={`app-main ${currentSong ? 'with-player' : ''}`}>
                <div className="search-section animate-fade-in-up">
                    <h2 className="search-heading">
                        Discover <span className="gradient-text">Music</span>
                    </h2>
                    <p className="search-subtitle">
                        Search millions of songs from YouTube Music
                    </p>
                    <SearchBar
                        onResults={handleResults}
                        onLoading={setIsSearching}
                        onClear={handleClearSearch}
                    />
                </div>

                {hasSearched || isSearching ? (
                    <div className="results-section">
                        {isSearching ? (
                            <SongList songs={[]} isLoading={true} />
                        ) : searchResults.length === 0 ? (
                            <div className="empty-state animate-fade-in">
                                <FiMusic className="empty-icon" />
                                <p>No songs found. Try a different search.</p>
                            </div>
                        ) : (
                            <SongList songs={searchResults} isLoading={false} />
                        )}
                    </div>
                ) : (
                    <HomePage />
                )}
            </main>

            {/* Footer */}
            <footer className="app-footer">
                Made with ❤️ by Harsh Mishra
            </footer>

            {/* Player */}
            <Player />

            {/* Toast Notifications */}
            <ToastContainer
                toasts={toasts}
                onDismiss={dismissToast}
                onRetry={handleRetryToast}
            />
        </div>
    );
}

export default App;
