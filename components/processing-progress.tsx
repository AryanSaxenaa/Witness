'use client'

import type { ProcessingStep } from '@/types'
import { cn } from '@/lib/utils'

const AUDIO_STEPS: { key: ProcessingStep; label: string }[] = [
  { key: 'uploading', label: 'Uploading' },
  { key: 'transcribing', label: 'Transcribing' },
  { key: 'analyzing', label: 'Analyzing' },
  { key: 'crossreferencing', label: 'Cross-Referencing' },
  { key: 'generating', label: 'Generating Memo' },
  { key: 'complete', label: 'Complete' },
]

const TEXT_STEPS: { key: ProcessingStep; label: string }[] = [
  { key: 'uploading', label: 'Preparing' },
  { key: 'analyzing', label: 'Analyzing' },
  { key: 'crossreferencing', label: 'Cross-Referencing' },
  { key: 'generating', label: 'Generating Memo' },
  { key: 'complete', label: 'Complete' },
]

const STEP_DETAIL: Partial<Record<ProcessingStep, string>> = {
  transcribing: 'Whisper large-v3 — detecting language and timestamps',
  analyzing: 'Mistral Large — preserving legal nuance across languages',
  crossreferencing: 'Matching entities against ICC & UN databases',
  generating: 'Synthesizing evidentiary pre-analysis memo',
}

interface ProcessingProgressProps {
  currentStep: ProcessingStep
  inputMode?: 'audio' | 'text' | null
  error?: string | null
}

export function ProcessingProgress({ currentStep, inputMode, error }: ProcessingProgressProps) {
  const steps = inputMode === 'text' ? TEXT_STEPS : AUDIO_STEPS
  const currentIndex = steps.findIndex((s) => s.key === currentStep)

  return (
    <div
      className="flex flex-col gap-4 p-6 border border-witness-border bg-navy-light"
      role="status"
      aria-live="polite"
      aria-label={`Processing status: ${currentStep}`}
    >
      <div className="font-serif text-lg text-white">Processing Testimony</div>

      <div className="flex flex-col gap-2">
        {steps.map((step, index) => {
          const isDone = index < currentIndex
          const isActive = step.key === currentStep
          const isPending = index > currentIndex

          return (
            <div key={step.key} className="flex items-center gap-3">
              <div
                className={cn(
                  'w-5 h-5 flex items-center justify-center text-xs font-mono border flex-shrink-0',
                  isDone && 'bg-witness-red border-witness-red text-white',
                  isActive && 'border-witness-grey text-witness-grey animate-pulse',
                  isPending && 'border-witness-border text-witness-border'
                )}
                aria-hidden="true"
              >
                {isDone ? '✓' : index + 1}
              </div>
              <div className="flex-1">
                <div
                  className={cn(
                    'text-sm',
                    isDone && 'text-witness-grey line-through',
                    isActive && 'text-white font-medium',
                    isPending && 'text-witness-border'
                  )}
                >
                  {step.label}
                </div>
                {isActive && STEP_DETAIL[step.key] && (
                  <div className="text-xs text-witness-grey mt-0.5">{STEP_DETAIL[step.key]}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <div
          className="mt-2 p-3 border border-red-900 bg-red-950/30 text-red-300 text-xs"
          role="alert"
        >
          {error}
        </div>
      )}
    </div>
  )
}
