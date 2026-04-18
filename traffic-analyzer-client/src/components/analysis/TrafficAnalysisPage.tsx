import { useEffect, useState } from 'react'
import AnalysisControlsPanel from './AnalysisControlsPanel'
import AnalysisStatsBar from './AnalysisStatsBar'
import VideoPreviewPanel from './VideoPreviewPanel'
import {
    EMPTY_METADATA,
    FALLBACK_METADATA,
    probeVideoMetadata,
    captureFirstFrameFromVideo,
    type VideoMetadata,
} from '../../utils/videoUtils'
import './TrafficAnalysisPage.css'

type TrafficAnalysisPageProps = {
    videoFile: File
    onChangeVideo: () => void
}

const MODEL_OPTIONS = ['YOLO26n', 'YOLO26m', 'YOLO26l']
const AVAILABLE_CLASSES = ['car', 'bus', 'truck', 'train', 'motorcycle', 'bicycle', 'person', 'traffic-light']

const CLASS_MAP: Record<string, number> = {
    'person': 0,
    'bicycle': 1,
    'car': 2,
    'motorcycle': 3,
    'bus': 5,
    'train': 6,
    'truck': 7,
    'traffic-light': 9
}

const MODEL_MAP: Record<string, string> = {
    'YOLO26n': 'yolo26n.pt',
    'YOLO26m': 'yolo26m.pt',
    'YOLO26l': 'yolo26l.pt'
}

function TrafficAnalysisPage({ videoFile, onChangeVideo }: TrafficAnalysisPageProps) {
    const [model, setModel] = useState(MODEL_OPTIONS[2])
    const [selectedClasses, setSelectedClasses] = useState<string[]>(['car', 'bus', 'truck'])
    const [frameNumber, setFrameNumber] = useState(0)
    const [upCount, setUpCount] = useState(0)
    const [downCount, setDownCount] = useState(0)
    const [upBreakdown, setUpBreakdown] = useState<Record<string, number>>({})
    const [downBreakdown, setDownBreakdown] = useState<Record<string, number>>({})
    const [firstFrameSrc, setFirstFrameSrc] = useState('')
    const [isFrameLoading, setIsFrameLoading] = useState(true)
    const [previewVideoUrl, setPreviewVideoUrl] = useState('')
    const [previewNotice, setPreviewNotice] = useState('')
    const [videoMetadata, setVideoMetadata] = useState<VideoMetadata>(EMPTY_METADATA)
    const [loiHeight, setLoiHeight] = useState(0)
    const [progressPercent, setProgressPercent] = useState(0)
    const [configStatus, setConfigStatus] = useState('')

    const handleMetadataUpdate = (metadata: any, currentProgress?: number) => {
        if (metadata) {
            setFrameNumber(metadata.frame || 0)
            const upTotal = Object.values(metadata.total_up).reduce((a: any, b: any) => a + b, 0) as number
            const downTotal = Object.values(metadata.total_down).reduce((a: any, b: any) => a + b, 0) as number
            setUpCount(upTotal)
            setDownCount(downTotal)
            setUpBreakdown(metadata.total_up || {})
            setDownBreakdown(metadata.total_down || {})

            if (currentProgress !== undefined) {
                setProgressPercent(currentProgress)
            }
        }
    }

    useEffect(() => {
        const objectUrl = URL.createObjectURL(videoFile)
        setPreviewVideoUrl(objectUrl)
        setFirstFrameSrc('')
        setPreviewNotice('')
        setVideoMetadata(EMPTY_METADATA)
        setIsFrameLoading(true)

        return () => {
            URL.revokeObjectURL(objectUrl)
        }
    }, [videoFile])

    useEffect(() => {
        if (!previewVideoUrl) {
            return
        }

        let isActive = true

        const readMetadata = async () => {
            try {
                // Pass the raw File object directly so mediainfo.js can parse the headers natively
                const metadata = await probeVideoMetadata(videoFile)
                if (!isActive) {
                    return
                }

                setVideoMetadata(metadata)
            } catch {
                if (!isActive) {
                    return
                }

                setVideoMetadata(FALLBACK_METADATA)
            }
        }

        readMetadata()

        return () => {
            isActive = false
        }
    }, [previewVideoUrl])

    useEffect(() => {
        if (!previewVideoUrl) {
            return
        }

        let isActive = true
        let generatedFrameUrl = ''

        const generateFrame = async () => {
            try {
                generatedFrameUrl = await captureFirstFrameFromVideo(previewVideoUrl)
                if (!isActive) {
                    URL.revokeObjectURL(generatedFrameUrl)
                    return
                }

                setFirstFrameSrc(generatedFrameUrl)
                setPreviewNotice('')
            } catch {
                if (!isActive) {
                    return
                }

                setFirstFrameSrc('')
                setPreviewNotice('Static frame preview is unavailable. Showing live video preview instead.')
            } finally {
                if (isActive) {
                    setIsFrameLoading(false)
                }
            }
        }

        generateFrame()

        return () => {
            isActive = false

            if (generatedFrameUrl) {
                URL.revokeObjectURL(generatedFrameUrl)
            }
        }
    }, [previewVideoUrl])

    useEffect(() => {
        if (!videoMetadata.height) {
            return
        }

        setLoiHeight(Math.round(videoMetadata.height * 0.6))
    }, [videoMetadata.height])

    const handleClassToggle = (className: string) => {
        setSelectedClasses((previous) => {
            if (previous.includes(className)) {
                return previous.filter((item) => item !== className)
            }

            return [...previous, className]
        })
    }

    const handleLoiHeightChange = (nextHeight: number) => {
        const maxHeight = Math.max(videoMetadata.height, 1)
        const safeHeight = Math.max(0, Math.min(nextHeight, maxHeight))
        setLoiHeight(safeHeight)
    }

    const handleSetConfig = async () => {
        setConfigStatus('Saving...')
        try {
            const mappedClasses = selectedClasses
                .map((cls) => CLASS_MAP[cls])
                .filter((id) => id !== undefined)

            const mappedModel = MODEL_MAP[model] || 'yolo26n.pt'

            const response = await fetch('http://localhost:8765/api/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: mappedModel,
                    allowed_classes: mappedClasses,
                    loi_y: loiHeight,
                    fps: videoMetadata.fps || 25
                }),
            })

            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                setConfigStatus(`Error: ${data.message || 'Unknown error'}`)
            } else {
                setConfigStatus('Configuration updated successfully!')
                setTimeout(() => setConfigStatus(''), 3000)
            }
        } catch (error) {
            console.error('Error updating config:', error)
            setConfigStatus('Network error while updating configuration.')
        }
    }

    return (
        <main className="analysis-page">
            <section className="analysis-shell">
                <header className="analysis-header">
                    <div>
                        <p className="analysis-eyebrow">Traffic Analyzer</p>
                        <h1 className="analysis-title">Detection Setup</h1>
                        <p className="analysis-file">{videoFile.name}</p>
                    </div>
                    <button
                        className="upload-again-button"
                        onClick={onChangeVideo}
                    >
                        Upload Again
                    </button>
                </header>

                <AnalysisStatsBar
                    frameNumber={frameNumber}
                    upCount={upCount}
                    downCount={downCount}
                    upBreakdown={upBreakdown}
                    downBreakdown={downBreakdown}
                    progressPercent={progressPercent}
                />

                <section className="analysis-grid">
                    <VideoPreviewPanel
                        fileName={videoFile.name}
                        videoUrl={previewVideoUrl}
                        previewNotice={previewNotice}
                        firstFrameSrc={firstFrameSrc}
                        isFrameLoading={isFrameLoading}
                        frameNumber={frameNumber}
                        videoWidth={videoMetadata.width}
                        videoHeight={videoMetadata.height}
                        durationSeconds={videoMetadata.duration}
                        fps={videoMetadata.fps}
                        loiHeight={loiHeight}
                        loiMax={videoMetadata.height}
                        onMetadataUpdate={handleMetadataUpdate}
                    />
                    <AnalysisControlsPanel
                        model={model}
                        modelOptions={MODEL_OPTIONS}
                        availableClasses={AVAILABLE_CLASSES}
                        selectedClasses={selectedClasses}
                        loiHeight={loiHeight}
                        loiMax={videoMetadata.height}
                        configStatus={configStatus}
                        onModelChange={setModel}
                        onClassToggle={handleClassToggle}
                        onLoiHeightChange={handleLoiHeightChange}
                        onSetConfig={handleSetConfig}
                    />
                </section>
            </section>
        </main>
    )
}

export default TrafficAnalysisPage
