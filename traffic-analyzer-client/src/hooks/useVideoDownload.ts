import { useState } from 'react';
import * as Mp4Muxer from 'mp4-muxer';

type UseVideoDownloadProps = {
    videoWidth: number;
    videoHeight: number;
    fileName: string;
    processedFrames: string[];
    fps?: number;
};

export function useVideoDownload({
    videoWidth,
    videoHeight,
    fileName,
    processedFrames,
    fps = 25,
}: UseVideoDownloadProps) {
    const [downloadNotice, setDownloadNotice] = useState('');

    const handleDownloadVideo = async () => {
        if (processedFrames.length === 0) return;

        setDownloadNotice('Starting ultra-fast offline video encoding...');

        try {
            const canvas = document.createElement('canvas');
            canvas.width = videoWidth || 1280;
            canvas.height = videoHeight || 720;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            if (!ctx) {
                throw new Error('Canvas 2D context not available.');
            }

            // WebCodecs / mp4-muxer require the frame rate to be a positive integer
            const safeFps = (fps && fps > 0) ? Math.round(fps) : 25;
            const frameDurationMicroseconds = 1_000_000 / safeFps;

            const muxer = new Mp4Muxer.Muxer({
                target: new Mp4Muxer.ArrayBufferTarget(),
                video: {
                    codec: 'avc',
                    width: canvas.width,
                    height: canvas.height,
                    frameRate: safeFps,
                },
                fastStart: 'in-memory',
            });

            const initOptions: VideoEncoderInit = {
                output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
                error: (e) => console.error('VideoEncoder error:', e),
            };

            const videoEncoder = new VideoEncoder(initOptions);
            videoEncoder.configure({
                codec: 'avc1.640034', // Standard H.264
                width: canvas.width,
                height: canvas.height,
                bitrate: 5_000_000,
                framerate: safeFps,
            });

            // Convert Base64 frame to a drawn image synchronously via promises
            const drawImage = (src: string) => {
                return new Promise<void>((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        resolve();
                    };
                    img.onerror = reject;
                    img.src = src;
                });
            };

            for (let i = 0; i < processedFrames.length; i++) {
                // Determine completion percentage roughly
                if (i % 10 === 0) {
                    setDownloadNotice(`Encoding... ${Math.round((i / processedFrames.length) * 100)}%`);
                }

                await drawImage(processedFrames[i]);

                // Construct a perfect offline WebCodecs VideoFrame based strictly on index sequence
                const frame = new VideoFrame(canvas, {
                    timestamp: i * frameDurationMicroseconds,
                });

                const keyFrame = i % safeFps === 0;
                videoEncoder.encode(frame, { keyFrame });
                frame.close();
            }

            setDownloadNotice('Finalizing MP4 file...');

            await videoEncoder.flush();
            muxer.finalize();

            const buffer = muxer.target.buffer;
            if (!buffer) {
                throw new Error('Missing muxer output buffer.');
            }

            const blob = new Blob([buffer], { type: 'video/mp4' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `processed-${fileName.split('.').slice(0, -1).join('.') || 'video'}.mp4`;

            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);

            setDownloadNotice('Download complete.');
        } catch (err: any) {
            console.error('Failed to export video:', err);
            setDownloadNotice('Download failed. Please check the console.');
        }
    };

    return { handleDownloadVideo, downloadNotice };
}
