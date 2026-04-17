type VideoPreviewStageProps = {
    isFrameLoading: boolean;
    fileName: string;
    videoUrl: string;
    firstFrameSrc: string;
    showLiveVideo: boolean;
    isDetectionStreaming: boolean;
    processedFrameSrc: string;
    isPlayingProcessed: boolean;
    processedFrames: string[];
    playbackIdx: number;
    loiPercent: number;
    loiHeight: number;
    videoRef: React.RefObject<HTMLVideoElement | null>;
};

export function VideoPreviewStage({
    isFrameLoading,
    fileName,
    videoUrl,
    firstFrameSrc,
    showLiveVideo,
    isDetectionStreaming,
    processedFrameSrc,
    isPlayingProcessed,
    processedFrames,
    playbackIdx,
    loiPercent,
    loiHeight,
    videoRef,
}: VideoPreviewStageProps) {
    return (
        <div className="video-stage">
            {isFrameLoading ? (
                <p className="stage-message">Preparing video preview...</p>
            ) : isPlayingProcessed && processedFrames.length > 0 ? (
                <>
                    <img className="video-frame-image" src={processedFrames[playbackIdx]} alt="Playback frame" />
                    <div className="loi-line" style={{ top: `${loiPercent}%` }}>
                        <span className="loi-badge">LOI {loiHeight}px</span>
                    </div>
                </>
            ) : isDetectionStreaming && processedFrameSrc ? (
                <>
                    <img className="video-frame-image" src={processedFrameSrc} alt="Processed detection frame" />
                    <div className="loi-line" style={{ top: `${loiPercent}%` }}>
                        <span className="loi-badge">LOI {loiHeight}px</span>
                    </div>
                </>
            ) : showLiveVideo ? (
                <>
                    <video
                        ref={videoRef as any}
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
    );
}
