import { useRef, useState, useCallback, useEffect } from 'react';

type UseDetectionStreamProps = {
    videoUrl: string;
    videoWidth: number;
    videoHeight: number;
    detectionVideoRef: React.RefObject<HTMLVideoElement | null>;
    onMetadataUpdate?: (metadata: any, currentProgress?: number) => void;
};

export function useDetectionStream({
    videoUrl,
    videoWidth,
    videoHeight,
    detectionVideoRef,
    onMetadataUpdate,
}: UseDetectionStreamProps) {
    const [detectionNotice, setDetectionNotice] = useState('');
    const [isDetectionStreaming, setIsDetectionStreaming] = useState(false);
    const [processedFrameSrc, setProcessedFrameSrc] = useState('');
    const [processedMetadata, setProcessedMetadata] = useState<any>(null);

    const [processedFrames, setProcessedFrames] = useState<string[]>([]);
    const [isProcessingComplete, setIsProcessingComplete] = useState(false);

    const detectionSocketRef = useRef<WebSocket | null>(null);
    const detectionCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const detectionAnimationFrameRef = useRef<number | null>(null);
    const detectionActiveRef = useRef(false);
    const detectionWaitingRef = useRef(false);
    const detectionLastSentAtRef = useRef(0);

    const clearDetectionAnimation = useCallback(() => {
        if (detectionAnimationFrameRef.current !== null) {
            cancelAnimationFrame(detectionAnimationFrameRef.current);
            detectionAnimationFrameRef.current = null;
        }
    }, []);

    const stopDetectionStreaming = useCallback(() => {
        detectionActiveRef.current = false;
        clearDetectionAnimation();
        setIsDetectionStreaming(false);

        const activeSocket = detectionSocketRef.current;
        if (activeSocket) {
            activeSocket.onopen = null;
            activeSocket.onmessage = null;
            activeSocket.onerror = null;
            activeSocket.onclose = null;

            if (activeSocket.readyState === WebSocket.OPEN || activeSocket.readyState === WebSocket.CONNECTING) {
                activeSocket.close();
            }
        }

        detectionSocketRef.current = null;

        const activeVideo = detectionVideoRef.current;
        if (activeVideo && !activeVideo.paused) {
            activeVideo.pause();
        }
    }, [clearDetectionAnimation, detectionVideoRef]);

    useEffect(() => {
        return () => {
            stopDetectionStreaming();
        };
    }, [stopDetectionStreaming]);

    const startDetectionStreaming = useCallback(async () => {
        if (!videoUrl || isDetectionStreaming) {
            return;
        }

        const detectionVideoElement = detectionVideoRef.current;
        if (!detectionVideoElement) {
            setDetectionNotice('Detection stream source is not ready yet. Try again.');
            return;
        }

        stopDetectionStreaming();
        setDetectionNotice('Connecting to ws://localhost:8765/ws ...');
        setProcessedFrames([]);
        setIsProcessingComplete(false);

        detectionVideoElement.currentTime = 0;
        detectionVideoElement.pause();

        const socket = new WebSocket('ws://localhost:8765/ws');
        detectionSocketRef.current = socket;

        const streamFrames = (timestamp: number) => {
            if (!detectionActiveRef.current) {
                return;
            }

            const activeSocket = detectionSocketRef.current;
            const activeVideo = detectionVideoRef.current;
            if (!activeSocket || !activeVideo) {
                stopDetectionStreaming();
                setDetectionNotice('Detection stream stopped unexpectedly.');
                return;
            }

            if (activeVideo.currentTime >= activeVideo.duration || activeVideo.ended) {
                stopDetectionStreaming();
                setDetectionNotice('Detection stream completed.');
                setIsProcessingComplete(true);
                return;
            }

            if (
                activeSocket.readyState === WebSocket.OPEN &&
                activeVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
                !detectionWaitingRef.current
            ) {
                if (!detectionCanvasRef.current) {
                    detectionCanvasRef.current = document.createElement('canvas');
                }

                const frameCanvas = detectionCanvasRef.current;
                const frameWidth = activeVideo.videoWidth || videoWidth || 1280;
                const frameHeight = activeVideo.videoHeight || videoHeight || 720;

                if (frameCanvas.width !== frameWidth || frameCanvas.height !== frameHeight) {
                    frameCanvas.width = frameWidth;
                    frameCanvas.height = frameHeight;
                }

                const frameContext = frameCanvas.getContext('2d');
                if (frameContext) {
                    frameContext.drawImage(activeVideo, 0, 0, frameWidth, frameHeight);
                    const frameDataUrl = frameCanvas.toDataURL('image/jpeg', 0.7);
                    const framePayload = frameDataUrl.split(',')[1] ?? '';

                    if (framePayload) {
                        detectionWaitingRef.current = true;
                        activeSocket.send(framePayload);
                        detectionLastSentAtRef.current = timestamp;
                    }
                }
            }

            detectionAnimationFrameRef.current = requestAnimationFrame(streamFrames);
        };

        socket.onopen = () => {
            detectionActiveRef.current = true;
            detectionWaitingRef.current = false;
            detectionLastSentAtRef.current = 0;
            setIsDetectionStreaming(true);
            setDetectionNotice('Detection streaming started on ws://localhost:8765/ws');
            detectionAnimationFrameRef.current = requestAnimationFrame(streamFrames);
        };

        socket.onmessage = (event) => {
            detectionWaitingRef.current = false;
            try {
                const response = JSON.parse(event.data);
                if (response.image) {
                    const src = `data:image/jpeg;base64,${response.image}`;
                    setProcessedFrameSrc(src);
                    setProcessedFrames((prev) => [...prev, src]);
                }
                if (response.metadata) {
                    setProcessedMetadata(response.metadata);
                    if (onMetadataUpdate && detectionVideoRef.current) {
                        const current = detectionVideoRef.current.currentTime;
                        const total = detectionVideoRef.current.duration;
                        let percent = total > 0 ? Math.min((current / total) * 100, 100) : 0;

                        if (total > 0 && total - current <= 0.05) {
                            percent = 100;
                        }

                        onMetadataUpdate(response.metadata, percent);
                    }
                }

                if (detectionVideoRef.current && detectionActiveRef.current) {
                    detectionVideoRef.current.currentTime += 1 / 30;
                }
            } catch (error) {
                console.error('Error parsing detection stream message:', error);
            }
        };

        socket.onerror = () => {
            stopDetectionStreaming();
            setDetectionNotice('Could not connect to ws://localhost:8765/ws. Start the websocket server and try again.');
        };

        socket.onclose = () => {
            const wasStreaming = detectionActiveRef.current;
            detectionActiveRef.current = false;
            clearDetectionAnimation();
            setIsDetectionStreaming(false);

            if (wasStreaming) {
                setDetectionNotice('Detection stream disconnected.');
            }
        };
    }, [videoUrl, isDetectionStreaming, stopDetectionStreaming, videoWidth, videoHeight, detectionVideoRef, onMetadataUpdate, clearDetectionAnimation]);

    return {
        detectionNotice,
        setDetectionNotice,
        isDetectionStreaming,
        processedFrameSrc,
        processedMetadata,
        processedFrames,
        isProcessingComplete,
        startDetectionStreaming,
        stopDetectionStreaming,
    };
}
