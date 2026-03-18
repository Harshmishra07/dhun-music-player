import { useState, useCallback, useRef, useEffect } from 'react';
import { searchSongs, getSearchSuggestions } from '../api/musicApi.js';
import { usePlayer } from '../context/PlayerContext.jsx';
import { FiX } from 'react-icons/fi';

const SearchIcon = ({ className }) => (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);
import './SearchBar.css';

export default function SearchBar({ onResults, onLoading, onClear }) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef(null);
    const debounceRef = useRef(null);
    const suggestionsRef = useRef(null);

    // Debounced suggestions
    useEffect(() => {
        if (!query.trim()) {
            setSuggestions([]);
            return;
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            try {
                const results = await getSearchSuggestions(query);
                setSuggestions(results || []);
            } catch {
                setSuggestions([]);
            }
        }, 300);

        return () => clearTimeout(debounceRef.current);
    }, [query]);

    // Click outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
                inputRef.current && !inputRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = useCallback(async (searchQuery) => {
        const q = searchQuery || query;
        if (!q.trim()) return;

        setShowSuggestions(false);
        onLoading?.(true);
        try {
            const results = await searchSongs(q);
            onResults?.(results);
        } catch (err) {
            console.error('Search error:', err);
            onResults?.([]);
        } finally {
            onLoading?.(false);
        }
    }, [query, onResults, onLoading]);

    const handleSubmit = (e) => {
        e.preventDefault();
        handleSearch();
    };

    const handleSuggestionClick = (suggestion) => {
        setQuery(suggestion);
        handleSearch(suggestion);
    };

    const clearQuery = () => {
        setQuery('');
        setSuggestions([]);
        onClear?.();
        inputRef.current?.focus();
    };

    return (
        <div className="search-bar-wrapper">
            <form className={`search-bar ${isFocused ? 'focused' : ''}`} onSubmit={handleSubmit}>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search songs, artists, albums..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => {
                        setIsFocused(true);
                        if (suggestions.length > 0) setShowSuggestions(true);
                    }}
                    onBlur={() => setIsFocused(false)}
                    id="search-input"
                />
                {query && (
                    <button type="button" className="clear-btn" onClick={clearQuery}>
                        <FiX />
                    </button>
                )}
                <button type="submit" className="search-submit-btn" aria-label="Search">
                    <SearchIcon />
                </button>
            </form>

            {showSuggestions && suggestions.length > 0 && (
                <div className="suggestions-dropdown" ref={suggestionsRef}>
                    {suggestions.map((suggestion, i) => (
                        <button
                            key={i}
                            className="suggestion-item"
                            onClick={() => handleSuggestionClick(typeof suggestion === 'string' ? suggestion : suggestion.text || suggestion)}
                        >
                            <SearchIcon className="suggestion-icon" />
                            <span>{typeof suggestion === 'string' ? suggestion : suggestion.text || JSON.stringify(suggestion)}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
