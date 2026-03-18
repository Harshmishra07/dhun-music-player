import { useRef, useCallback } from 'react';
import './ProgressBar.css';

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function ProgressBar({ currentTime, duration, onSeek }) {
    const barRef = useRef(null);

    const handleClick = useCallback((e) => {
        if (!barRef.current || !duration) return;
        const rect = barRef.current.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        onSeek(percent * duration);
    }, [duration, onSeek]);

    const progress = duration ? (currentTime / duration) * 100 : 0;

    return (
        <div className="progress-bar-container">
            <span className="progress-time">{formatTime(currentTime)}</span>
            <div
                className="progress-track"
                ref={barRef}
                onClick={handleClick}
                id="progress-bar"
            >
                <div
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                />
                <div
                    className="progress-thumb"
                    style={{ left: `${progress}%` }}
                />
            </div>
            <span className="progress-time">{formatTime(duration)}</span>
        </div>
    );
}
