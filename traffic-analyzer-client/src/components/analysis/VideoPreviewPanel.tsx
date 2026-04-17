import { useEffect, useRef, useState } from 'react'

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
    loiHeight: number
    loiMax: number
}

function VideoPreviewPanel({
    fileName,
    videoUrl,
    previewNotice,
    firstFrameSrc,
    isFrameLoading,
    frameNumber,
    videoWidth,
    videoHeight,
    durationSeconds,
    loiHeight,
    loiMax,
}: VideoPreviewPanelProps) {
    const [showVideoPlayer, setShowVideoPlayer] = useState(false)
    const [playbackNotice, setPlaybackNotice] = useState('')
    const videoRef = useRef<HTMLVideoElement>(null)
    const loiPercent = loiMax > 0 ? Math.max(0, Math.min((loiHeight / loiMax) * 100, 100)) : 50
    const showLiveVideo = Boolean(videoUrl) && (showVideoPlayer || !firstFrameSrc)

    useEffect(() => {
        setShowVideoPlayer(false)
        setPlaybackNotice('')
    }, [videoUrl, firstFrameSrc])

    useEffect(() => {
        if (!showVideoPlayer) {
            return
        }

        const videoElement = videoRef.current
        if (!videoElement) {
            return
        }

        const startPlayback = async () => {
            try {
                await videoElement.play()
            } catch {
                setPlaybackNotice('Playback was blocked by the browser. Use the video controls to start manually.')
            }
        }

        void startPlayback()
    }, [showVideoPlayer])

    const handlePlayVideo = () => {
        if (!videoUrl || isFrameLoading) {
            return
        }

        setPlaybackNotice('')
        setShowVideoPlayer(true)
    }

    return (
        <section className="analysis-panel preview-panel" aria-label="Video preview">
            <div className="panel-header">
                <h2 className="panel-title">Video Preview</h2>
                <p className="panel-subtitle">First frame from: {fileName}</p>
            </div>

            <div className="video-stage">
                {isFrameLoading ? (
                    <p className="stage-message">Preparing video preview...</p>
                ) : showLiveVideo ? (
                    <>
                        <video
                            ref={videoRef}
                            className="video-frame-video-fallback"
                            src={videoUrl}
                            controls
                            muted
                            playsInline
                            preload="metadata"
                            aria-label={`Video preview for ${fileName}`}
                        />
                        <div className="loi-line" style={{ top: `${loiPercent}%` }}>
                            <span className="loi-badge">LOI {loiHeight}px</span>
                        </div>
                    </>
                ) : firstFrameSrc ? (
                    <>
                        <img className="video-frame-image" src={firstFrameSrc} alt={`First frame of ${fileName}`} />
                        <div className="loi-line" style={{ top: `${loiPercent}%` }}>
                            <span className="loi-badge">LOI {loiHeight}px</span>
                        </div>
                    </>
                ) : (
                    <p className="stage-message">Unable to load preview.</p>
                )}
            </div>

            <div className="preview-actions" role="group" aria-label="Video and detection controls">
                <button
                    type="button"
                    className="preview-action-button preview-action-button-primary"
                    onClick={handlePlayVideo}
                    disabled={isFrameLoading || !videoUrl}
                >
                    Play Video
                </button>
                <button type="button" className="preview-action-button" disabled>
                    Start Detection
                </button>
                <button type="button" className="preview-action-button" disabled>
                    Pause Detection
                </button>
                <button type="button" className="preview-action-button" disabled>
                    Stop Detection
                </button>
            </div>

            {playbackNotice && <p className="preview-note">{playbackNotice}</p>}

            {previewNotice && <p className="preview-note">{previewNotice}</p>}

            <div className="video-meta-grid">
                <div>
                    <span className="video-meta-label">Frame</span>
                    <strong className="video-meta-value">{frameNumber}</strong>
                </div>
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
