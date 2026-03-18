import { useEffect } from 'react';

export default function useKeyboardShortcuts({
    togglePlay,
    handleNext,
    handlePrev,
    seek,
    currentTime,
    volume,
    setVolume,
    currentSong,
}) {
    useEffect(() => {
        function handleKeyDown(e) {
            // Ignore when typing in input fields
            const tag = e.target.tagName.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) {
                return;
            }

            // Don't intercept if there's no song playing
            if (!currentSong) return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    seek(Math.min(currentTime + 5, Infinity));
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    seek(Math.max(currentTime - 5, 0));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setVolume(Math.min(volume + 0.05, 1));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setVolume(Math.max(volume - 0.05, 0));
                    break;
                case 'KeyN':
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        handleNext();
                    }
                    break;
                case 'KeyP':
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        handlePrev();
                    }
                    break;
                case 'KeyM':
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        setVolume(volume === 0 ? 0.7 : 0);
                    }
                    break;
                default:
                    break;
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlay, handleNext, handlePrev, seek, currentTime, volume, setVolume, currentSong]);
}
