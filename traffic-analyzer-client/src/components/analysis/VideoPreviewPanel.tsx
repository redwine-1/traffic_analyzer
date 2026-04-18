import { useEffect, useRef, useState } from 'react'
import { useDetectionStream } from '../../hooks/useDetectionStream'
import { useProcessedPlayback } from '../../hooks/useProcessedPlayback'
import { useVideoDownload } from '../../hooks/useVideoDownload'
import { VideoPreviewStage } from './VideoPreviewStage'

type VideoPreviewPanelProps = {
    fileName: string
    videoUrl: string
    previewNotice: string
    firstFrameSrc: string
    isFrameLoading: boolean
    frameNumber: number
    videoWidth: number
    videoHeight: number
    durationSeconds: number
    fps?: number
    loiHeight: number
    loiMax: number
    onMetadataUpdate?: (metadata: any, currentProgress?: number) => void
}

function VideoPreviewPanel({
    fileName,
    videoUrl,
    previewNotice,
    firstFrameSrc,
    isFrameLoading,
    videoWidth,
    videoHeight,
    durationSeconds,
    fps,
    loiHeight,
    loiMax,
    onMetadataUpdate,
}: VideoPreviewPanelProps) {
    const [showVideoPlayer, setShowVideoPlayer] = useState(false)
    const [playbackNotice, setPlaybackNotice] = useState('')

    const videoRef = useRef<HTMLVideoElement>(null)
    const detectionVideoRef = useRef<HTMLVideoElement>(null)

    const {
        detectionNotice,
        setDetectionNotice,
        isDetectionStreaming,
        processedFrameSrc,
        processedFrames,
        isProcessingComplete,
        startDetectionStreaming,
        stopDetectionStreaming,
    } = useDetectionStream({
        videoUrl,
        videoWidth,
        videoHeight,
        detectionVideoRef,
        onMetadataUpdate,
    })

    const {
        playbackIdx,
        isPlayingProcessed,
        startProcessedPlayback,
        stopProcessedPlayback
    } = useProcessedPlayback(processedFrames, fps)

    const {
        handleDownloadVideo,
        downloadNotice
    } = useVideoDownload({
        processedFrames,
        videoWidth,
        videoHeight,
        fileName,
        fps,
    })

    const loiPercent = loiMax > 0 ? Math.max(0, Math.min((loiHeight / loiMax) * 100, 100)) : 50
    const showLiveVideo = Boolean(videoUrl) && (showVideoPlayer || !firstFrameSrc)

    useEffect(() => {
        stopDetectionStreaming()
        setShowVideoPlayer(false)
        setPlaybackNotice('')
        setDetectionNotice('')
        stopProcessedPlayback()
    }, [videoUrl, firstFrameSrc, stopDetectionStreaming, setDetectionNotice, stopProcessedPlayback])

    const handlePlayVideo = () => {
        if (!videoUrl || isFrameLoading) {
            return
        }

        if (isProcessingComplete && processedFrames.length > 0) {
            setPlaybackNotice('')
            setShowVideoPlayer(false)
            startProcessedPlayback()
            return
        }

        setPlaybackNotice('')
        setShowVideoPlayer(true)
    }

    const handleStartDetection = async () => {
        if (!videoUrl || isFrameLoading || isDetectionStreaming) {
            return
        }

        stopProcessedPlayback()
        setPlaybackNotice('')
        startDetectionStreaming()
    }

    return (
        <section className="analysis-panel preview-panel" aria-label="Video preview">
            <video
                ref={detectionVideoRef}
                src={videoUrl}
                muted
                playsInline
                preload="auto"
                aria-hidden="true"
                tabIndex={-1}
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
            />

            <div className="panel-header">
                <h2 className="panel-title">Video Preview</h2>
                <p className="panel-subtitle">First frame from: {fileName}</p>
            </div>

            <VideoPreviewStage
                isFrameLoading={isFrameLoading}
                fileName={fileName}
                videoUrl={videoUrl}
                firstFrameSrc={firstFrameSrc}
                showLiveVideo={showLiveVideo}
                isDetectionStreaming={isDetectionStreaming}
                processedFrameSrc={processedFrameSrc}
                isPlayingProcessed={isPlayingProcessed}
                processedFrames={processedFrames}
                playbackIdx={playbackIdx}
                loiPercent={loiPercent}
                loiHeight={loiHeight}
                videoRef={videoRef}
            />

            <div className="preview-actions" role="group" aria-label="Video and detection controls">
                <button
                    type="button"
                    className="preview-action-button preview-action-button-primary"
                    onClick={handlePlayVideo}
                    disabled={isFrameLoading || !videoUrl}
                >
                    Play Video
                </button>
                <button
                    type="button"
                    className="preview-action-button"
                    onClick={() => {
                        void handleStartDetection()
                    }}
                    disabled={isFrameLoading || !videoUrl || isDetectionStreaming}
                >
                    Start Detection
                </button>
                {isProcessingComplete && processedFrames.length > 0 && (
                    <button
                        type="button"
                        className="preview-action-button"
                        onClick={handleDownloadVideo}
                        aria-label="Download processed video"
                    >
                        Download Video
                    </button>
                )}
            </div>

            {playbackNotice && !downloadNotice && <p className="preview-note">{playbackNotice}</p>}
            {downloadNotice && <p className="preview-note">{downloadNotice}</p>}
            {detectionNotice && <p className="preview-note">{detectionNotice}</p>}
            {previewNotice && <p className="preview-note">{previewNotice}</p>}

            <div className="video-meta-grid">
                <div>
                    <span className="video-meta-label">Resolution</span>
                    <strong className="video-meta-value">
                        {videoWidth} x {videoHeight}
                    </strong>
                </div>
                <div>
                    <span className="video-meta-label">Duration</span>
                    <strong className="video-meta-value">{durationSeconds.toFixed(1)}s</strong>
                </div>
            </div>
        </section>
    )
}

export default VideoPreviewPanel
