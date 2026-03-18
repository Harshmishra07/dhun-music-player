import { useRef, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import './Visualizer.css';

export default function Visualizer() {
    const { audioRef, isPlaying } = usePlayer();
    const canvasRef = useRef(null);
    const animFrameRef = useRef(null);
    const analyserRef = useRef(null);
    const sourceRef = useRef(null);
    const contextRef = useRef(null);

    useEffect(() => {
        const audio = audioRef?.current;
        if (!audio) return;

        // Create AudioContext only once
        if (!contextRef.current) {
            try {
                contextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            } catch {
                return; // Web Audio API not supported
            }
        }

        const ctx = contextRef.current;

        // Connect source only once per audio element
        if (!sourceRef.current) {
            try {
                sourceRef.current = ctx.createMediaElementSource(audio);
                analyserRef.current = ctx.createAnalyser();
                analyserRef.current.fftSize = 128;
                analyserRef.current.smoothingTimeConstant = 0.8;
                sourceRef.current.connect(analyserRef.current);
                analyserRef.current.connect(ctx.destination);
            } catch {
                return; // Already connected or failed
            }
        }

        return () => {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
        };
    }, [audioRef]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const analyser = analyserRef.current;
        if (!canvas || !analyser) return;

        const ctx = canvas.getContext('2d');
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        function draw() {
            animFrameRef.current = requestAnimationFrame(draw);

            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

            const w = rect.width;
            const h = rect.height;

            ctx.clearRect(0, 0, w, h);

            if (!isPlaying) return;

            analyser.getByteFrequencyData(dataArray);

            const barCount = Math.min(bufferLength, 48);
            const barWidth = w / barCount;
            const gap = 1;

            for (let i = 0; i < barCount; i++) {
                const value = dataArray[i] / 255;
                const barHeight = value * h * 0.7;

                const gradient = ctx.createLinearGradient(0, h, 0, h - barHeight);
                gradient.addColorStop(0, 'rgba(139, 92, 246, 0.5)');
                gradient.addColorStop(1, 'rgba(236, 72, 153, 0.3)');

                ctx.fillStyle = gradient;
                ctx.fillRect(
                    i * barWidth + gap,
                    h - barHeight,
                    barWidth - gap * 2,
                    barHeight
                );
            }
        }

        if (isPlaying) {
            // Resume audio context if suspended (autoplay policy)
            if (contextRef.current?.state === 'suspended') {
                contextRef.current.resume();
            }
            draw();
        } else {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
            // Clear canvas when paused
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
        }

        return () => {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
        };
    }, [isPlaying]);

    return <canvas ref={canvasRef} className="visualizer-canvas" id="visualizer-canvas" />;
}
