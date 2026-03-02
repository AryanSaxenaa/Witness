'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionStore } from '@/store/session'
import { MemoDisplay } from '@/components/memo-display'
import { EntityTable } from '@/components/entity-table'
import { formatTimestamp, truncateForVoice } from '@/lib/utils'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { ExtractedEntity } from '@/types'

const NAV_STEPS = [
  { num: '01', label: 'Ingest Evidence' },
  { num: '02', label: 'Analysis & Transcribe' },
  { num: '03', label: 'Database Cross-Ref' },
  { num: '04', label: 'ICC Memo Export' },
]

const TYPE_LABELS: Record<string, string> = {
  PERSON: 'CIV-ID',
  LOCATION: 'LOC',
  ORGANIZATION: 'ORG',
  DATE: 'DATE',
  INCIDENT: 'INCIDENT',
  MILITARY_ID: 'MIL-ID',
  SIGINT: 'SIGINT',
}

const TYPE_HIGHLIGHT_COLORS: Record<string, { bg: string; border: string; tag: string }> = {
  PERSON: { bg: 'rgba(59,130,246,0.25)', border: '#3b82f6', tag: '#60a5fa' },
  LOCATION: { bg: 'rgba(34,197,94,0.25)', border: '#22c55e', tag: '#4ade80' },
  ORGANIZATION: { bg: 'rgba(168,85,247,0.25)', border: '#a855f7', tag: '#c084fc' },
  DATE: { bg: 'rgba(234,179,8,0.25)', border: '#eab308', tag: '#facc15' },
  INCIDENT: { bg: 'rgba(239,68,68,0.25)', border: '#ef4444', tag: '#f87171' },
  MILITARY_ID: { bg: 'rgba(249,115,22,0.25)', border: '#f97316', tag: '#fb923c' },
  SIGINT: { bg: 'rgba(6,182,212,0.25)', border: '#06b6d4', tag: '#22d3ee' },
}

function renderHighlightedTranscript(
  text: string,
  entities: ExtractedEntity[]
): React.ReactNode[] {
  if (!entities.length) return [text]

  const sortedEntities = [...entities].sort((a, b) => {
    const idxA = text.toLowerCase().indexOf(a.text.toLowerCase())
    const idxB = text.toLowerCase().indexOf(b.text.toLowerCase())
    return idxA - idxB
  })

  const result: React.ReactNode[] = []
  let lastIndex = 0

  for (const entity of sortedEntities) {
    const idx = text.toLowerCase().indexOf(entity.text.toLowerCase(), lastIndex)
    if (idx === -1) continue

    if (idx > lastIndex) {
      result.push(text.slice(lastIndex, idx))
    }

    result.push(
      <span
        key={`${entity.text}-${idx}`}
        style={{
          background: TYPE_HIGHLIGHT_COLORS[entity.type]?.bg ?? 'rgba(88,28,28,0.4)',
          borderBottom: `1px solid ${TYPE_HIGHLIGHT_COLORS[entity.type]?.border ?? '#581C1C'}`,
          padding: '0 2px',
          cursor: 'pointer',
        }}
        title={`${entity.type}: ${entity.context}`}
      >
        {text.slice(idx, idx + entity.text.length)}
        <span
          style={{
            display: 'inline-block',
            fontSize: '10px',
            verticalAlign: 'super',
            color: TYPE_HIGHLIGHT_COLORS[entity.type]?.tag ?? '#7a2626',
            marginLeft: '2px',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
          }}
        >
          {TYPE_LABELS[entity.type] ?? entity.type}
        </span>
      </span>
    )

    lastIndex = idx + entity.text.length
  }

  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex))
  }

  return result
}

export default function ResultsPage() {
  const router = useRouter()
  const { memo, analysisResult, transcriptionResult, crossReferenceResult, reset } = useSessionStore()
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false)

  useEffect(() => {
    if (!memo) {
      router.push('/')
    }
  }, [memo, router])

  const handleExportPDF = useCallback(async () => {
    if (!memo) return
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const { WitnessPDFDocument } = await import('@/components/pdf-template')
      const blob = await pdf(<WitnessPDFDocument memo={memo} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `WITNESS-${memo.caseRef}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF exported successfully')
    } catch (err) {
      console.error('PDF export failed:', err)
      // Fallback: offer JSON download
      try {
        const blob = new Blob([JSON.stringify(memo, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `WITNESS-${memo.caseRef}.json`
        a.click()
        URL.revokeObjectURL(url)
        toast.error('PDF export failed. JSON fallback downloaded.')
      } catch {
        toast.error('PDF export failed. The memo is still available on screen.')
      }
    }
  }, [memo])

  const handleGenerateVoice = useCallback(async () => {
    if (!memo) return
    setIsGeneratingVoice(true)
    try {
      const text = truncateForVoice(
        `Evidentiary Pre-Analysis Memo. Case reference: ${memo.caseRef}. Executive Summary: ${memo.executiveSummary}`
      )
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error('Voice synthesis failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.play()
      toast.success('Audio playing')
    } catch (err) {
      console.error('Voice generation failed:', err)
      toast.error('Voice synthesis unavailable')
    } finally {
      setIsGeneratingVoice(false)
    }
  }, [memo])

  const handleNewAnalysis = useCallback(() => {
    reset()
    router.push('/')
  }, [reset, router])

  if (!memo || !analysisResult) return null

  return (
    <div className="flex h-[calc(100vh-32px)] overflow-hidden">
      {/* Nav Rail */}
      <nav className="flex flex-shrink-0 border-r border-white/10" aria-label="Pipeline steps">
        {NAV_STEPS.map((step, i) => (
          <div
            key={step.num}
            className={cn(
              'relative flex items-center justify-center border-r border-white/10 transition-colors',
              i >= 1 ? 'w-[60px] bg-witness-red' : 'w-[48px]'
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
              {memo.caseRef}
            </span>
            <span className="text-xs font-bold border border-witness-grey px-2 py-0.5 text-witness-grey tracking-wider">
              DRAFT
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleNewAnalysis}
              className="text-xs uppercase tracking-wider border border-witness-border text-witness-grey hover:border-white hover:text-white transition-colors px-4 py-2"
            >
              ← New Analysis
            </button>
            <span className="text-xs text-green-400">Analysis Complete</span>
            <span className="w-2 h-2 bg-green-500" />
          </div>
        </header>

        {/* Three-column layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left — Transcript */}
          <div className="w-[350px] flex-shrink-0 border-r border-witness-border overflow-y-auto p-6">
            <div className="text-xs text-witness-grey uppercase tracking-widest mb-4 pb-2 border-b border-witness-border">
              Transcript
            </div>

            {transcriptionResult && (
              <div className="mb-4 flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-witness-grey">Language</span>
                <span className="text-xs px-2 py-0.5 bg-witness-red/20 border border-witness-red/40 text-red-300">
                  {transcriptionResult.detectedLanguage}
                </span>
                <span className="text-[10px] text-witness-grey">
                  {(transcriptionResult.languageConfidence * 100).toFixed(0)}% confidence
                </span>
              </div>
            )}

            {transcriptionResult?.segments ? (
              <div className="flex flex-col gap-3">
                {transcriptionResult.segments.map((seg, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-[10px] text-witness-grey font-mono flex-shrink-0 w-16 pt-0.5">
                      {formatTimestamp(seg.start)}
                    </span>
                    <p className="text-sm leading-relaxed text-white/80">{seg.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm leading-relaxed text-white/80 whitespace-pre-wrap">
                {analysisResult.originalText}
              </div>
            )}
          </div>

          {/* Center — Entity Highlights */}
          <div className="flex-1 border-r border-witness-border overflow-y-auto p-6">
            <div className="text-xs text-witness-grey uppercase tracking-widest mb-4 pb-2 border-b border-witness-border">
              Analysis Matrix
            </div>

            {/* Highlighted transcript */}
            <div className="mb-6">
              <div className="text-xs text-witness-grey uppercase tracking-widest mb-2">
                Entity-Annotated Text
              </div>
              <div className="text-sm leading-relaxed text-white/80 whitespace-pre-wrap">
                {renderHighlightedTranscript(analysisResult.translatedText, analysisResult.entities)}
              </div>
            </div>

            {/* Key Phrases */}
            {analysisResult.keyPhrases.length > 0 && (
              <div className="mb-6">
                <div className="text-xs text-witness-grey uppercase tracking-widest mb-3 pb-2 border-b border-witness-border">
                  Key Phrases
                </div>
                <div className="flex flex-col gap-3">
                  {analysisResult.keyPhrases.map((kp, i) => (
                    <div key={i} className="border-l-2 border-witness-red pl-3">
                      <div className="text-sm text-white font-medium">&ldquo;{kp.phrase}&rdquo;</div>
                      <div className="text-xs text-witness-grey mt-1">{kp.evidentiarySignificance}</div>
                      <div className="text-xs text-red-300/70 mt-0.5">{kp.legalRelevance}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ambiguities */}
            {analysisResult.ambiguities.length > 0 && (
              <div>
                <div className="text-xs text-witness-grey uppercase tracking-widest mb-2 pb-2 border-b border-witness-border">
                  Ambiguities & Gaps
                </div>
                <ul className="flex flex-col gap-1">
                  {analysisResult.ambiguities.map((a, i) => (
                    <li key={i} className="text-sm text-yellow-300/80 flex gap-2">
                      <span className="text-witness-red flex-shrink-0">⚑</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right — Memo Display */}
          <div className="w-[420px] flex-shrink-0 overflow-hidden">
            <MemoDisplay
              memo={memo}
              crossReferenceResult={crossReferenceResult}
              onExportPDF={handleExportPDF}
              onGenerateVoice={handleGenerateVoice}
              isGeneratingVoice={isGeneratingVoice}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
