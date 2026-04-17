import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import './VideoUploadPage.css'

type VideoUploadPageProps = {
    onNext: (videoFile: File) => void
}

function formatBytes(bytes: number): string {
    if (bytes === 0) {
        return '0 Bytes'
    }

    const units = ['Bytes', 'KB', 'MB', 'GB']
    const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
    const value = bytes / 1024 ** unitIndex

    return `${value.toFixed(value >= 100 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function isVideoFile(file: File): boolean {
    if (file.type.startsWith('video/')) {
        return true
    }

    return /\.(mp4|mov|mkv|avi|webm)$/i.test(file.name)
}

function VideoUploadPage({ onNext }: VideoUploadPageProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isDragActive, setIsDragActive] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const fileSummary = useMemo(() => {
        if (!selectedFile) {
            return ''
        }

        const formattedDate = new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(selectedFile.lastModified)

        return `${formatBytes(selectedFile.size)} - ${formattedDate}`
    }, [selectedFile])

    const handleFileSelection = (file: File | null) => {
        if (!file) {
            return
        }

        if (!isVideoFile(file)) {
            setSelectedFile(null)
            setErrorMessage('Please choose a valid video file (MP4, MOV, MKV, AVI, or WebM).')
            return
        }

        setSelectedFile(file)
        setErrorMessage('')
    }

    const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        handleFileSelection(event.target.files?.[0] ?? null)
    }

    const handleDragEnter = (event: DragEvent<HTMLLabelElement>) => {
        event.preventDefault()
        setIsDragActive(true)
    }

    const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
        event.preventDefault()
        setIsDragActive(true)
    }

    const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
        event.preventDefault()
        const nextTarget = event.relatedTarget as Node | null

        if (nextTarget && event.currentTarget.contains(nextTarget)) {
            return
        }

        setIsDragActive(false)
    }

    const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
        event.preventDefault()
        setIsDragActive(false)
        handleFileSelection(event.dataTransfer.files?.[0] ?? null)
    }

    const triggerFileInput = () => {
        fileInputRef.current?.click()
    }

    const removeSelectedFile = () => {
        setSelectedFile(null)

        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleNext = () => {
        if (!selectedFile) {
            return
        }

        onNext(selectedFile)
    }

    return (
        <main className="upload-page">
            <section className="upload-card" aria-labelledby="upload-title">
                <p className="eyebrow">Traffic Analyzer</p>
                <h1 id="upload-title">Upload Video</h1>
                <p className="subtitle">
                    Drop your traffic footage below or choose a file from your device.
                </p>

                <label
                    className={`dropzone ${isDragActive ? 'active' : ''} ${selectedFile ? 'has-file' : ''}`}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <input
                        ref={fileInputRef}
                        className="file-input"
                        type="file"
                        accept="video/*"
                        onChange={handleInputChange}
                    />

                    <div className="dropzone-content">
                        <p className="dropzone-title">
                            {isDragActive ? 'Release to upload your video' : 'Drag and drop your video here'}
                        </p>
                        <p className="dropzone-description">Supports MP4, MOV, MKV, AVI, and WebM formats.</p>
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={(event) => {
                                event.preventDefault()
                                triggerFileInput()
                            }}
                        >
                            Select File
                        </button>
                    </div>
                </label>

                {selectedFile ? (
                    <div className="file-preview" role="status" aria-live="polite">
                        <div>
                            <p className="file-name">{selectedFile.name}</p>
                            <p className="file-meta">{fileSummary}</p>
                        </div>
                        <button type="button" className="clear-button" onClick={removeSelectedFile}>
                            Remove
                        </button>
                    </div>
                ) : (
                    <p className="helper-text">No video selected yet.</p>
                )}

                {errorMessage && (
                    <p className="error-text" role="alert">
                        {errorMessage}
                    </p>
                )}

                <button type="button" className="next-button" disabled={!selectedFile} onClick={handleNext}>
                    Next
                </button>
            </section>
        </main>
    )
}

export default VideoUploadPage
