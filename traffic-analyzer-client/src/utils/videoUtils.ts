export type VideoMetadata = {
    width: number;
    height: number;
    duration: number;
};

export const EMPTY_METADATA: VideoMetadata = { width: 0, height: 0, duration: 0 };
export const FALLBACK_METADATA: VideoMetadata = { width: 1280, height: 720, duration: 0 };

export const probeVideoMetadata = (videoUrl: string): Promise<VideoMetadata> => {
    return new Promise((resolve, reject) => {
        const probeVideo = document.createElement('video');
        probeVideo.preload = 'metadata';
        probeVideo.src = videoUrl;

        let didSettle = false;

        const cleanup = () => {
            probeVideo.removeEventListener('loadedmetadata', handleLoadedMetadata);
            probeVideo.removeEventListener('error', handleError);
            probeVideo.removeAttribute('src');
            probeVideo.load();
        };

        const settle = (callback: () => void) => {
            if (didSettle) {
                return;
            }

            didSettle = true;
            cleanup();
            callback();
        };

        const handleLoadedMetadata = () => {
            const width = probeVideo.videoWidth || FALLBACK_METADATA.width;
            const height = probeVideo.videoHeight || FALLBACK_METADATA.height;
            const duration = Number.isFinite(probeVideo.duration) ? probeVideo.duration : 0;
            settle(() => resolve({ width, height, duration }));
        };

        const handleError = () => {
            settle(() => reject(new Error('Video metadata probe failed.')));
        };

        probeVideo.addEventListener('loadedmetadata', handleLoadedMetadata);
        probeVideo.addEventListener('error', handleError);
        probeVideo.load();
    });
};

export const captureFirstFrameFromVideo = (videoUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const probeVideo = document.createElement('video');
        probeVideo.preload = 'auto';
        probeVideo.muted = true;
        probeVideo.playsInline = true;
        probeVideo.src = videoUrl;

        let didSettle = false;

        const cleanup = () => {
            probeVideo.removeEventListener('loadeddata', handleLoadedData);
            probeVideo.removeEventListener('loadedmetadata', handleLoadedMetadata);
            probeVideo.removeEventListener('seeked', handleSeeked);
            probeVideo.removeEventListener('error', handleError);
            probeVideo.removeAttribute('src');
            probeVideo.load();
        };

        const settle = (callback: () => void) => {
            if (didSettle) {
                return;
            }

            didSettle = true;
            cleanup();
            callback();
        };

        const capture = () => {
            const width = probeVideo.videoWidth;
            const height = probeVideo.videoHeight;

            if (!width || !height) {
                settle(() => reject(new Error('Missing video dimensions while capturing frame.')));
                return;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const context = canvas.getContext('2d');
            if (!context) {
                settle(() => reject(new Error('Unable to create 2D context for frame capture.')));
                return;
            }

            context.drawImage(probeVideo, 0, 0, width, height);
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        settle(() => reject(new Error('Browser failed to generate preview frame.')));
                        return;
                    }

                    const frameUrl = URL.createObjectURL(blob);
                    settle(() => resolve(frameUrl));
                },
                'image/jpeg',
                0.9
            );
        };

        const handleLoadedData = () => {
            capture();
        };

        const handleLoadedMetadata = () => {
            const duration = Number.isFinite(probeVideo.duration) ? probeVideo.duration : 0;
            const targetTime = duration > 0 ? Math.min(0.1, Math.max(duration - 0.001, 0)) : 0;

            if (targetTime <= 0) {
                if (probeVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                    capture();
                    return;
                }

                return;
            }

            if (Math.abs(probeVideo.currentTime - targetTime) < 0.001) {
                if (probeVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                    capture();
                }
                return;
            }

            try {
                probeVideo.currentTime = targetTime;
            } catch {
                if (probeVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                    capture();
                    return;
                }
            }
        };

        const handleSeeked = () => {
            capture();
        };

        const handleError = () => {
            settle(() => reject(new Error('Video failed to load for frame capture.')));
        };

        probeVideo.addEventListener('loadeddata', handleLoadedData);
        probeVideo.addEventListener('loadedmetadata', handleLoadedMetadata);
        probeVideo.addEventListener('seeked', handleSeeked);
        probeVideo.addEventListener('error', handleError);
        probeVideo.load();
    });
};
