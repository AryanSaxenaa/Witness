'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionStore } from '@/store/session'
import { UploadZone } from '@/components/upload-zone'
import { TestimonyEditor } from '@/components/testimony-editor'
import { SpeechInput } from '@/components/speech-input'
import { ProcessingProgress } from '@/components/processing-progress'
import { SkeletonLoader } from '@/components/skeleton-loader'
import { StreamPreview } from '@/components/stream-preview'
import { cn } from '@/lib/utils'
import { fetchWithRetry } from '@/lib/retry'
import { consumeSSEStream } from '@/lib/stream-client'
import { ThemeToggle } from '@/components/theme-toggle'
import { PageTransition } from '@/components/page-transition'
import toast from 'react-hot-toast'
import type { AnalysisResult, EvidentiaryMemo } from '@/types'

const NAV_STEPS = [
  { num: '01', label: 'Ingest Evidence' },
  { num: '02', label: 'Analysis & Transcribe' },
  { num: '03', label: 'Database Cross-Ref' },
  { num: '04', label: 'ICC Memo Export' },
]

/** Map processing step → active sidebar index (0-based) */
function stepToNavIndex(step: string): number {
  switch (step) {
    case 'idle':
      return 0
    case 'uploading':
      return 0
    case 'transcribing':
      return 1
    case 'analyzing':
      return 1
    case 'crossreferencing':
      return 2
    case 'generating':
      return 3
    case 'complete':
      return 3
    default:
      return 0
  }
}

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
    addAuditEntry,
    saveCurrentSession,
  } = useSessionStore()

  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [textInput, setTextInput] = useState('')
  const [location, setLocation] = useState('Unknown')
  const [recordedAt, setRecordedAt] = useState(new Date().toISOString().slice(0, 16))
  const [isLoadingDemo, setIsLoadingDemo] = useState(false)
  const [speechLangCode, setSpeechLangCode] = useState('')  // BCP-47 code from voice input
  const [streamingText, setStreamingText] = useState('')
  const [streamLabel, setStreamLabel] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const isProcessing = currentStep !== 'idle' && currentStep !== 'error' && currentStep !== 'complete'

  const handleCancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setStep('idle')
    setError(null)
    setStreamingText('')
    setStreamLabel('')
    addAuditEntry({ step: currentStep, action: 'PIPELINE_CANCELLED', detail: 'User cancelled in-flight analysis' })
    toast('Analysis cancelled', { icon: '⛔' })
  }, [setStep, setError, addAuditEntry, currentStep])

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

  const handleSpeechTranscript = useCallback((text: string, langCode: string) => {
    setTextInput(prev => prev ? prev + '\n\n' + text : text)
    setSpeechLangCode(langCode)
    setInputMode('text')
    setSourceFile('voice-input')
  }, [setInputMode, setSourceFile])

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

    // Create abort controller for cancellation support
    const controller = new AbortController()
    abortRef.current = controller
    const { signal } = controller

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
        addAuditEntry({ step: 'uploading', action: 'PIPELINE_START', detail: `Audio: ${audioFile.name}` })
        await new Promise((r) => setTimeout(r, 300))

        setStep('transcribing')
        const formData = new FormData()
        formData.append('file', audioFile)

        const transcribeRes = await fetchWithRetry('/api/transcribe', {
          method: 'POST',
          body: formData,
          signal,
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
        addAuditEntry({ step: 'uploading', action: 'PIPELINE_START', detail: `Text: ${textInput.length} chars` })
        await new Promise((r) => setTimeout(r, 200))
        transcript = textInput
        // Use the speech language code if available, otherwise auto-detect
        detectedLanguage = speechLangCode ? speechLangCode.split('-')[0] : 'auto'
      }

      // Step 2: Analyze (streaming)
      setStep('analyzing')
      setStreamingText('')
      setStreamLabel('AI Analysis — Entity Extraction & Translation')
      const analysis = await consumeSSEStream<AnalysisResult>('/api/analyze-stream', { transcript, detectedLanguage }, {
        signal,
        onChunk: (text) => setStreamingText(prev => prev + text),
      })
      setStreamingText('')
      setStreamLabel('')
      setAnalysisResult(analysis)

      // Step 3: Cross-reference
      setStep('crossreferencing')
      const crossRefRes = await fetchWithRetry('/api/crossreference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entities: analysis.entities }),
        signal,
      })

      if (!crossRefRes.ok) {
        const err = await crossRefRes.json()
        throw new Error(err.error || 'Cross-reference failed')
      }

      const crossRef = await crossRefRes.json()
      setCrossReferenceResult(crossRef)

      // Step 4: Generate memo (streaming)
      setStep('generating')
      setStreamingText('')
      setStreamLabel('Generating ICC Evidentiary Memo')
      const memo = await consumeSSEStream<EvidentiaryMemo>('/api/memo-stream', {
        analysisResult: analysis,
        crossReferenceResult: crossRef,
        caseMetadata,
      }, {
        signal,
        onChunk: (text) => setStreamingText(prev => prev + text),
      })
      setStreamingText('')
      setStreamLabel('')
      setMemo(memo)

      setStep('complete')
      saveCurrentSession(memo.caseRef, location)
      toast.success('Analysis complete — memo generated')
      router.push('/results')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return // cancelled by user
      const message = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(message)
      setStreamingText('')
      setStreamLabel('')
      toast.error(message)
    } finally {
      abortRef.current = null
    }
  }

  const activeNavIndex = stepToNavIndex(currentStep)

  return (
    <PageTransition>
    <div className="flex flex-col md:flex-row h-[calc(100vh-32px)] overflow-hidden">
      {/* Nav Rail — hidden on mobile */}
      <nav className="hidden md:flex flex-shrink-0 border-r border-white/10" aria-label="Pipeline steps">
        {NAV_STEPS.map((step, i) => {
          const isActive = i === activeNavIndex
          const isCompleted = i < activeNavIndex

          return (
            <div
              key={step.num}
              className={cn(
                'relative flex items-center justify-center border-r border-white/10 transition-colors duration-500',
                isActive ? 'w-[60px] bg-witness-red' : 'w-[48px] bg-[#050810]',
              )}
            >
              <span className={cn(
                'absolute top-6 text-xs font-mono transition-colors duration-500',
                isActive ? 'text-white' : isCompleted ? 'text-witness-red/70' : 'text-white/30'
              )}>
                {step.num}
              </span>
              <span
                className={cn(
                  'font-serif text-xs tracking-wide transition-colors duration-500',
                  isActive ? 'text-white' : isCompleted ? 'text-witness-red/60' : 'text-white/30'
                )}
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                {step.label}
              </span>
              {isActive && (
                <span className="absolute bottom-4 w-1.5 h-1.5 bg-white animate-pulse" />
              )}
            </div>
          )
        })}
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden" role="main" aria-label="Evidence intake workspace">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between px-4 md:px-8 py-4 border-b border-witness-border flex-shrink-0 gap-2">
          <div className="flex items-center gap-4">
            <h1 className="font-serif text-xl tracking-wide">WITNESS</h1>
            <span className="text-xs text-witness-grey border border-witness-border px-2 py-0.5 uppercase tracking-widest hidden sm:inline">
              Evidence Intake
            </span>
          </div>
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <ThemeToggle />
            <button
              onClick={() => router.push('/compare')}
              className="text-xs uppercase tracking-wider border border-witness-border text-witness-grey hover:border-white hover:text-white transition-colors px-3 py-1.5"
              aria-label="Compare testimonies"
            >
              Compare
            </button>
            <button
              onClick={() => router.push('/history')}
              className="text-xs uppercase tracking-wider border border-witness-border text-witness-grey hover:border-white hover:text-white transition-colors px-3 py-1.5"
              aria-label="View case history"
            >
              History
            </button>
            <span className="text-xs text-witness-grey">System Ready</span>
            <span className="w-2 h-2 bg-green-500 animate-pulse" aria-hidden="true" />
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Panel — Source Material */}
          <div className="w-full md:w-[400px] flex-shrink-0 border-b md:border-b-0 md:border-r border-witness-border overflow-y-auto p-4 md:p-6 flex flex-col gap-6">
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
                    aria-label="Incident location"
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
                    aria-label="Date and time of recording"
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
              <>
                <TestimonyEditor
                  onChange={setTextInput}
                  placeholder="Paste or type testimony text here..."
                  initialContent={textInput}
                />
                <SpeechInput onTranscript={handleSpeechTranscript} disabled={isProcessing} />
              </>
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
          <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6">
            {isProcessing ? (
              <div className="flex flex-col gap-6">
                <ProcessingProgress currentStep={currentStep} inputMode={inputMode} error={error} />
                <StreamPreview text={streamingText} label={streamLabel} />
                <SkeletonLoader step={currentStep} />
              </div>
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
                      <span><strong className="text-white">Cross-Reference</strong> — Match against ICC, UN, ACLED, Amnesty International & Human Rights Watch databases</span>
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
        <div className="flex flex-wrap items-center justify-between px-4 md:px-8 py-4 border-t border-witness-border flex-shrink-0 bg-navy-light gap-2">
          <div className="text-xs text-witness-grey">
            {inputMode === 'audio' && audioFile
              ? `Audio: ${audioFile.name} (${(audioFile.size / 1024 / 1024).toFixed(1)}MB)`
              : inputMode === 'text' && textInput
              ? `Text: ${textInput.length} characters`
              : 'No evidence loaded'}
          </div>
          <div className="flex items-center gap-3">
            {isProcessing && (
              <button
                onClick={handleCancel}
                className="px-6 py-3 text-xs uppercase tracking-wider font-medium border border-witness-border text-witness-grey hover:border-red-500 hover:text-red-400 transition-colors"
                aria-label="Cancel analysis pipeline"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleBeginAnalysis}
              disabled={!canSubmit}
              aria-label="Begin analysis pipeline"
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
      </main>
    </div>
    </PageTransition>
  )
}
