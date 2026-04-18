import { useState, useRef, useCallback, useEffect } from 'react';

export function useProcessedPlayback(processedFrames: string[], fps: number = 25) {
    const [playbackIdx, setPlaybackIdx] = useState(0);
    const [isPlayingProcessed, setIsPlayingProcessed] = useState(false);
    const playbackTimerRef = useRef<number | null>(null);

    const stopProcessedPlayback = useCallback(() => {
        if (playbackTimerRef.current) {
            clearInterval(playbackTimerRef.current);
            playbackTimerRef.current = null;
        }
        setIsPlayingProcessed(false);
    }, []);

    const startProcessedPlayback = useCallback(() => {
        setPlaybackIdx(0);
        setIsPlayingProcessed(true);

        if (playbackTimerRef.current) {
            clearInterval(playbackTimerRef.current);
        }

        const safeFps = (fps && fps > 0) ? fps : 25;

        playbackTimerRef.current = window.setInterval(() => {
            setPlaybackIdx((prev) => {
                if (prev >= processedFrames.length - 1) {
                    stopProcessedPlayback();
                    return prev;
                }
                return prev + 1;
            });
        }, 1000 / safeFps);
    }, [processedFrames.length, stopProcessedPlayback, fps]);

    useEffect(() => {
        return () => stopProcessedPlayback();
    }, [stopProcessedPlayback]);

    return {
        playbackIdx,
        isPlayingProcessed,
        startProcessedPlayback,
        stopProcessedPlayback,
    };
}
