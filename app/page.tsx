'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionStore } from '@/store/session'
import { UploadZone } from '@/components/upload-zone'
import { TestimonyEditor } from '@/components/testimony-editor'
import { ProcessingProgress } from '@/components/processing-progress'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const NAV_STEPS = [
  { num: '01', label: 'Ingest Evidence' },
  { num: '02', label: 'Analysis & Transcribe' },
  { num: '03', label: 'Database Cross-Ref' },
  { num: '04', label: 'ICC Memo Export' },
]

export default function Home() {
  const router = useRouter()
  const {
    currentStep,
    inputMode,
    error,
    setStep,
    setInputMode,
    setSourceFile,
    setTranscriptionResult,
    setAnalysisResult,
    setCrossReferenceResult,
    setMemo,
    setError,
    clearResults,
  } = useSessionStore()

  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [textInput, setTextInput] = useState('')
  const [location, setLocation] = useState('Unknown')
  const [recordedAt, setRecordedAt] = useState(new Date().toISOString().slice(0, 16))
  const [isLoadingDemo, setIsLoadingDemo] = useState(false)

  const isProcessing = currentStep !== 'idle' && currentStep !== 'error' && currentStep !== 'complete'

  const onFileAccepted = useCallback((file: File) => {
    setAudioFile(file)
    setSourceFile(file.name)
    setInputMode('audio')
  }, [setSourceFile, setInputMode])

  const handleSelectText = useCallback(() => {
    setInputMode('text')
    setAudioFile(null)
    setSourceFile(null)
  }, [setInputMode, setSourceFile])

  const handleSelectAudio = useCallback(() => {
    setInputMode('audio')
    setTextInput('')
  }, [setInputMode])

  const handleLoadDemo = useCallback(async () => {
    setIsLoadingDemo(true)
    try {
      const res = await fetch('/api/demo')
      if (!res.ok) throw new Error('Failed to load demo')
      const data = await res.json()
      setTextInput(data.text)
      setInputMode('text')
      setSourceFile('demo-testimony.txt')
      setAudioFile(null)
      setLocation('Kherson Oblast, Ukraine')
      setRecordedAt('2024-03-15T10:30')
      toast.success('Demo testimony loaded')
    } catch {
      toast.error('Could not load demo testimony')
    } finally {
      setIsLoadingDemo(false)
    }
  }, [setInputMode, setSourceFile])

  const canSubmit =
    !isProcessing &&
    ((inputMode === 'audio' && audioFile) || (inputMode === 'text' && textInput.trim().length > 0))

  const handleRetry = useCallback(() => {
    setError(null)
    setStep('idle')
  }, [setError, setStep])

  async function handleBeginAnalysis() {
    if (!canSubmit) return

    // Clear any stale results from a previous run
    clearResults()

    try {
      const parsedDate = new Date(recordedAt)
      const caseMetadata = {
        recordedAt: isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString(),
        location: location || 'Unknown',
        sourceFile: inputMode === 'audio' ? audioFile!.name : 'text-input',
      }

      let transcript: string
      let detectedLanguage: string

      // Step 1: Transcribe (audio) or prepare (text)
      if (inputMode === 'audio' && audioFile) {
        setStep('uploading')
        await new Promise((r) => setTimeout(r, 300))

        setStep('transcribing')
        const formData = new FormData()
        formData.append('file', audioFile)

        const transcribeRes = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        })

        if (!transcribeRes.ok) {
          const err = await transcribeRes.json()
          throw new Error(err.error || 'Transcription failed')
        }

        const transcription = await transcribeRes.json()
        setTranscriptionResult(transcription)
        transcript = transcription.transcript
        detectedLanguage = transcription.detectedLanguage
      } else {
        setStep('uploading')
        await new Promise((r) => setTimeout(r, 200))
        transcript = textInput
        detectedLanguage = 'auto'
      }

      // Step 2: Analyze
      setStep('analyzing')
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, detectedLanguage }),
      })

      if (!analyzeRes.ok) {
        const err = await analyzeRes.json()
        throw new Error(err.error || 'Analysis failed')
      }

      const analysis = await analyzeRes.json()
      setAnalysisResult(analysis)

      // Step 3: Cross-reference
      setStep('crossreferencing')
      const crossRefRes = await fetch('/api/crossreference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entities: analysis.entities }),
      })

      if (!crossRefRes.ok) {
        const err = await crossRefRes.json()
        throw new Error(err.error || 'Cross-reference failed')
      }

      const crossRef = await crossRefRes.json()
      setCrossReferenceResult(crossRef)

      // Step 4: Generate memo
      setStep('generating')
      const memoRes = await fetch('/api/memo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisResult: analysis,
          crossReferenceResult: crossRef,
          caseMetadata,
        }),
      })

      if (!memoRes.ok) {
        const err = await memoRes.json()
        throw new Error(err.error || 'Memo generation failed')
      }

      const memo = await memoRes.json()
      setMemo(memo)

      setStep('complete')
      toast.success('Analysis complete — memo generated')
      router.push('/results')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(message)
      toast.error(message)
    }
  }

  return (
    <div className="flex h-[calc(100vh-32px)] overflow-hidden">
      {/* Nav Rail */}
      <nav className="flex flex-shrink-0 border-r border-white/10" aria-label="Pipeline steps">
        {NAV_STEPS.map((step, i) => (
          <div
            key={step.num}
            className={cn(
              'relative flex items-center justify-center border-r border-white/10 transition-colors',
              i === 0 ? 'w-[60px] bg-witness-red' : 'w-[48px]'
            )}
          >
            <span className="absolute top-6 text-xs font-mono text-white/50">{step.num}</span>
            <span
              className="font-serif text-xs tracking-wide text-white/70"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              {step.label}
            </span>
          </div>
        ))}
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-4 border-b border-witness-border flex-shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="font-serif text-xl tracking-wide">WITNESS</h1>
            <span className="text-xs text-witness-grey border border-witness-border px-2 py-0.5 uppercase tracking-widest">
              Evidence Intake
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-witness-grey">System Ready</span>
            <span className="w-2 h-2 bg-green-500 animate-pulse" />
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel — Source Material */}
          <div className="w-[400px] flex-shrink-0 border-r border-witness-border overflow-y-auto p-6 flex flex-col gap-6">
            <div>
              <div className="text-xs text-witness-grey uppercase tracking-widest mb-4 pb-2 border-b border-witness-border">
                Source Material
              </div>

              {/* Metadata Fields */}
              <div className="flex flex-col gap-3 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-witness-grey uppercase tracking-widest w-20">Location</span>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="flex-1 bg-transparent border-b border-witness-border text-sm text-white focus:border-witness-red outline-none py-1 px-1"
                    placeholder="Enter location..."
                    disabled={isProcessing}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-witness-grey uppercase tracking-widest w-20">Recorded</span>
                  <input
                    type="datetime-local"
                    value={recordedAt}
                    onChange={(e) => setRecordedAt(e.target.value)}
                    className="flex-1 bg-transparent border-b border-witness-border text-sm text-white focus:border-witness-red outline-none py-1 px-1"
                    disabled={isProcessing}
                  />
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={handleSelectAudio}
                  className={cn(
                    'flex-1 py-2 text-xs uppercase tracking-wider border transition-colors',
                    inputMode === 'audio'
                      ? 'border-witness-red bg-witness-red/20 text-white'
                      : 'border-witness-border text-witness-grey hover:text-white'
                  )}
                  disabled={isProcessing}
                >
                  Audio File
                </button>
                <button
                  onClick={handleSelectText}
                  className={cn(
                    'flex-1 py-2 text-xs uppercase tracking-wider border transition-colors',
                    inputMode === 'text'
                      ? 'border-witness-red bg-witness-red/20 text-white'
                      : 'border-witness-border text-witness-grey hover:text-white'
                  )}
                  disabled={isProcessing}
                >
                  Text Testimony
                </button>
              </div>

              {/* Load Demo */}
              <button
                onClick={handleLoadDemo}
                disabled={isProcessing || isLoadingDemo}
                className="w-full py-2 text-xs uppercase tracking-wider border border-dashed border-witness-border text-witness-grey hover:border-witness-red hover:text-white transition-colors disabled:opacity-50 mb-2"
              >
                {isLoadingDemo ? '⏳ Loading...' : '▶ Load Demo Testimony'}
              </button>
            </div>

            {/* Input Area */}
            {inputMode === 'audio' && (
              <UploadZone onFileAccepted={onFileAccepted} isProcessing={isProcessing} />
            )}
            {inputMode === 'text' && (
              <TestimonyEditor
                onChange={setTextInput}
                placeholder="Paste or type testimony text here..."
                initialContent={textInput}
              />
            )}
            {!inputMode && (
              <div className="border border-dashed border-witness-border p-8 text-center">
                <div className="text-xs text-witness-grey uppercase tracking-widest">
                  Select input mode above
                </div>
              </div>
            )}
          </div>

          {/* Right Panel — Processing / Preview */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            {isProcessing ? (
              <ProcessingProgress currentStep={currentStep} inputMode={inputMode} error={error} />
            ) : currentStep === 'error' ? (
              <div className="flex flex-col gap-4">
                <ProcessingProgress currentStep={currentStep} inputMode={inputMode} error={error} />
                <button
                  onClick={handleRetry}
                  className="self-start px-6 py-2 text-xs uppercase tracking-wider border border-witness-red text-witness-red hover:bg-witness-red hover:text-white transition-colors"
                >
                  ← Retry
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="border border-witness-border bg-navy-light p-6">
                  <div className="text-xs text-witness-grey uppercase tracking-widest mb-4 pb-2 border-b border-witness-border">
                    Pipeline Overview
                  </div>
                  <div className="flex flex-col gap-3 text-sm text-witness-grey">
                    <div className="flex gap-3 items-start">
                      <span className="text-witness-red font-serif w-5">1.</span>
                      <span><strong className="text-white">Transcribe</strong> — Audio → Whisper large-v3 → timestamped transcript</span>
                    </div>
                    <div className="flex gap-3 items-start">
                      <span className="text-witness-red font-serif w-5">2.</span>
                      <span><strong className="text-white">Analyze</strong> — Mistral Large → entity extraction, translation, legal annotation</span>
                    </div>
                    <div className="flex gap-3 items-start">
                      <span className="text-witness-red font-serif w-5">3.</span>
                      <span><strong className="text-white">Cross-Reference</strong> — Match against ICC & UN databases</span>
                    </div>
                    <div className="flex gap-3 items-start">
                      <span className="text-witness-red font-serif w-5">4.</span>
                      <span><strong className="text-white">Generate Memo</strong> — Evidentiary pre-analysis formatted to ICC standards</span>
                    </div>
                  </div>
                </div>

                <div className="border border-dashed border-witness-border p-6 text-center">
                  <div className="font-serif text-lg text-witness-grey/50 mb-2">Ready for Evidence</div>
                  <div className="text-xs text-witness-grey">
                    Upload an audio file or paste testimony text, then click &ldquo;Begin Analysis&rdquo;
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between px-8 py-4 border-t border-witness-border flex-shrink-0 bg-navy-light">
          <div className="text-xs text-witness-grey">
            {inputMode === 'audio' && audioFile
              ? `Audio: ${audioFile.name} (${(audioFile.size / 1024 / 1024).toFixed(1)}MB)`
              : inputMode === 'text' && textInput
              ? `Text: ${textInput.length} characters`
              : 'No evidence loaded'}
          </div>
          <button
            onClick={handleBeginAnalysis}
            disabled={!canSubmit}
            className={cn(
              'px-8 py-3 text-xs uppercase tracking-wider font-medium transition-colors',
              canSubmit
                ? 'bg-witness-red border border-witness-red text-white hover:bg-witness-red-bright'
                : 'border border-witness-border text-witness-border cursor-not-allowed'
            )}
          >
            Begin Analysis →
          </button>
        </div>
      </div>
    </div>
  )
}
