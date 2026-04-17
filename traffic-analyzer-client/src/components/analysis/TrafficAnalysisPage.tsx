import { useEffect, useState } from 'react'
import AnalysisControlsPanel from './AnalysisControlsPanel'
import AnalysisStatsBar from './AnalysisStatsBar'
import VideoPreviewPanel from './VideoPreviewPanel'
import './TrafficAnalysisPage.css'

type TrafficAnalysisPageProps = {
    videoFile: File
    onChangeVideo: () => void
}

type VideoMetadata = {
    width: number
    height: number
    duration: number
}

const EMPTY_METADATA: VideoMetadata = { width: 0, height: 0, duration: 0 }
const FALLBACK_METADATA: VideoMetadata = { width: 1280, height: 720, duration: 0 }

const MODEL_OPTIONS = ['YOLO26n', 'YOLO26m', 'YOLO26l']
const AVAILABLE_CLASSES = ['car', 'bus', 'truck', 'train', 'motorcycle', 'bicycle', 'person', 'traffic-light']

const probeVideoMetadata = (videoUrl: string): Promise<VideoMetadata> => {
    return new Promise((resolve, reject) => {
        const probeVideo = document.createElement('video')
        probeVideo.preload = 'metadata'
        probeVideo.src = videoUrl

        let didSettle = false

        const cleanup = () => {
            probeVideo.removeEventListener('loadedmetadata', handleLoadedMetadata)
            probeVideo.removeEventListener('error', handleError)
            probeVideo.removeAttribute('src')
            probeVideo.load()
        }

        const settle = (callback: () => void) => {
            if (didSettle) {
                return
            }

            didSettle = true
            cleanup()
            callback()
        }

        const handleLoadedMetadata = () => {
            const width = probeVideo.videoWidth || FALLBACK_METADATA.width
            const height = probeVideo.videoHeight || FALLBACK_METADATA.height
            const duration = Number.isFinite(probeVideo.duration) ? probeVideo.duration : 0
            settle(() => resolve({ width, height, duration }))
        }

        const handleError = () => {
            settle(() => reject(new Error('Video metadata probe failed.')))
        }

        probeVideo.addEventListener('loadedmetadata', handleLoadedMetadata)
        probeVideo.addEventListener('error', handleError)
        probeVideo.load()
    })
}

const captureFirstFrameFromVideo = (videoUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const probeVideo = document.createElement('video')
        probeVideo.preload = 'auto'
        probeVideo.muted = true
        probeVideo.playsInline = true
        probeVideo.src = videoUrl

        let didSettle = false

        const cleanup = () => {
            probeVideo.removeEventListener('loadeddata', handleLoadedData)
            probeVideo.removeEventListener('loadedmetadata', handleLoadedMetadata)
            probeVideo.removeEventListener('seeked', handleSeeked)
            probeVideo.removeEventListener('error', handleError)
            probeVideo.removeAttribute('src')
            probeVideo.load()
        }

        const settle = (callback: () => void) => {
            if (didSettle) {
                return
            }

            didSettle = true
            cleanup()
            callback()
        }

        const capture = () => {
            const width = probeVideo.videoWidth
            const height = probeVideo.videoHeight

            if (!width || !height) {
                settle(() => reject(new Error('Missing video dimensions while capturing frame.')))
                return
            }

            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height

            const context = canvas.getContext('2d')
            if (!context) {
                settle(() => reject(new Error('Unable to create 2D context for frame capture.')))
                return
            }

            context.drawImage(probeVideo, 0, 0, width, height)
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        settle(() => reject(new Error('Browser failed to generate preview frame.')))
                        return
                    }

                    const frameUrl = URL.createObjectURL(blob)
                    settle(() => resolve(frameUrl))
                },
                'image/jpeg',
                0.9,
            )
        }

        const handleLoadedData = () => {
            capture()
        }

        const handleLoadedMetadata = () => {
            const duration = Number.isFinite(probeVideo.duration) ? probeVideo.duration : 0
            const targetTime = duration > 0 ? Math.min(0.1, Math.max(duration - 0.001, 0)) : 0

            if (targetTime <= 0) {
                if (probeVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                    capture()
                    return
                }

                return
            }

            if (Math.abs(probeVideo.currentTime - targetTime) < 0.001) {
                if (probeVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                    capture()
                }
                return
            }

            try {
                probeVideo.currentTime = targetTime
            } catch {
                if (probeVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                    capture()
                    return
                }
            }
        }

        const handleSeeked = () => {
            capture()
        }

        const handleError = () => {
            settle(() => reject(new Error('Video failed to load for frame capture.')))
        }

        probeVideo.addEventListener('loadeddata', handleLoadedData)
        probeVideo.addEventListener('loadedmetadata', handleLoadedMetadata)
        probeVideo.addEventListener('seeked', handleSeeked)
        probeVideo.addEventListener('error', handleError)
        probeVideo.load()
    })
}

function TrafficAnalysisPage({ videoFile, onChangeVideo }: TrafficAnalysisPageProps) {
    const [model, setModel] = useState(MODEL_OPTIONS[0])
    const [selectedClasses, setSelectedClasses] = useState<string[]>(['car', 'bus', 'truck'])
    const [frameNumber] = useState(1)
    const [upCount] = useState(12)
    const [downCount] = useState(8)
    const [firstFrameSrc, setFirstFrameSrc] = useState('')
    const [isFrameLoading, setIsFrameLoading] = useState(true)
    const [previewVideoUrl, setPreviewVideoUrl] = useState('')
    const [previewNotice, setPreviewNotice] = useState('')
    const [videoMetadata, setVideoMetadata] = useState<VideoMetadata>(EMPTY_METADATA)
    const [loiHeight, setLoiHeight] = useState(0)

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
                const metadata = await probeVideoMetadata(previewVideoUrl)
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

    return (
        <main className="analysis-page">
            <section className="analysis-shell">
                <header className="analysis-header">
                    <div>
                        <p className="analysis-eyebrow">Traffic Analyzer</p>
                        <h1 className="analysis-title">Detection Setup</h1>
                    </div>
                    <p className="analysis-file">{videoFile.name}</p>
                </header>

                <AnalysisStatsBar
                    frameNumber={frameNumber}
                    upCount={upCount}
                    downCount={downCount}
                    selectedClassCount={selectedClasses.length}
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
                        loiHeight={loiHeight}
                        loiMax={videoMetadata.height}
                    />
                    <AnalysisControlsPanel
                        model={model}
                        modelOptions={MODEL_OPTIONS}
                        availableClasses={AVAILABLE_CLASSES}
                        selectedClasses={selectedClasses}
                        loiHeight={loiHeight}
                        loiMax={videoMetadata.height}
                        onModelChange={setModel}
                        onClassToggle={handleClassToggle}
                        onLoiHeightChange={handleLoiHeightChange}
                        onChangeVideo={onChangeVideo}
                    />
                </section>
            </section>
        </main>
    )
}

export default TrafficAnalysisPage
