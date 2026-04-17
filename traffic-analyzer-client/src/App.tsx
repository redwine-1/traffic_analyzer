import { useState } from 'react'
import TrafficAnalysisPage from './components/analysis/TrafficAnalysisPage'
import VideoUploadPage from './components/VideoUploadPage'

function App() {
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null)
  const [currentStep, setCurrentStep] = useState<'upload' | 'analysis'>('upload')

  const handleUploadNext = (videoFile: File) => {
    setSelectedVideoFile(videoFile)
    setCurrentStep('analysis')
  }

  const handleChangeVideo = () => {
    setCurrentStep('upload')
  }

  if (currentStep === 'analysis' && selectedVideoFile) {
    return <TrafficAnalysisPage videoFile={selectedVideoFile} onChangeVideo={handleChangeVideo} />
  }

  return <VideoUploadPage onNext={handleUploadNext} />
}

export default App
