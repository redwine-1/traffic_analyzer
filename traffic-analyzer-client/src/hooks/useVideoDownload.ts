import { useState } from 'react';

type UseVideoDownloadProps = {
    videoWidth: number;
    videoHeight: number;
    fileName: string;
    processedFrames: string[];
};

export function useVideoDownload({
    videoWidth,
    videoHeight,
    fileName,
    processedFrames,
}: UseVideoDownloadProps) {
    const [downloadNotice, setDownloadNotice] = useState('');

    const handleDownloadVideo = () => {
        if (processedFrames.length === 0) return;

        setDownloadNotice('Preparing video for download. This may take a moment...');

        const canvas = document.createElement('canvas');
        canvas.width = videoWidth || 1280;
        canvas.height = videoHeight || 720;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            setDownloadNotice('Download failed. Canvas 2D context not available.');
            return;
        }

        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        const chunks: BlobPart[] = [];

        recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `processed-${fileName.split('.').slice(0, -1).join('.') || 'video'}.webm`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            setDownloadNotice('Download complete.');
        };

        recorder.start();

        let i = 0;
        const interval = setInterval(() => {
            if (i >= processedFrames.length) {
                clearInterval(interval);
                recorder.stop();
                return;
            }

            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = processedFrames[i];
            i++;
        }, 1000 / 30);
    };

    return { handleDownloadVideo, downloadNotice };
}
