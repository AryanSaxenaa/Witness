'use client'

import { cn } from '@/lib/utils'
import type { ProcessingStep } from '@/types'

/** Pulsing skeleton bar */
function Bar({ className }: { className?: string }) {
  return (
    <div
      className={cn('bg-witness-border/60 animate-pulse', className)}
      aria-hidden="true"
    />
  )
}

/** Skeleton that mimics the results page layout during processing */
export function SkeletonLoader({ step }: { step: ProcessingStep }) {
  return (
    <div className="flex flex-col gap-6 w-full" aria-label="Loading content" role="status">
      {/* Title skeleton */}
      <div className="flex items-center gap-3">
        <Bar className="h-5 w-40" />
        <Bar className="h-4 w-20" />
      </div>

      {/* Transcript skeleton */}
      {(step === 'transcribing' || step === 'analyzing' || step === 'crossreferencing' || step === 'generating') && (
        <div className="border border-witness-border bg-navy-light p-5 flex flex-col gap-3">
          <Bar className="h-3 w-24" />
          <div className="flex flex-col gap-2 mt-2">
            <Bar className="h-3 w-full" />
            <Bar className="h-3 w-[90%]" />
            <Bar className="h-3 w-[95%]" />
            <Bar className="h-3 w-[70%]" />
            <Bar className="h-3 w-[85%]" />
          </div>
        </div>
      )}

      {/* Entity skeleton */}
      {(step === 'analyzing' || step === 'crossreferencing' || step === 'generating') && (
        <div className="border border-witness-border bg-navy-light p-5 flex flex-col gap-3">
          <Bar className="h-3 w-28" />
          <div className="flex flex-col gap-2 mt-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Bar className="h-4 w-4 flex-shrink-0" />
                <Bar className="h-3 w-24" />
                <Bar className="h-3 w-12" />
                <Bar className="h-3 flex-1" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cross-ref skeleton */}
      {(step === 'crossreferencing' || step === 'generating') && (
        <div className="border border-witness-border bg-navy-light p-5 flex flex-col gap-3">
          <Bar className="h-3 w-36" />
          <div className="flex flex-col gap-2 mt-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Bar className="h-3 w-20" />
                <Bar className="h-5 w-12" />
                <Bar className="h-3 flex-1" />
                <Bar className="h-1.5 w-16" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Memo skeleton */}
      {step === 'generating' && (
        <div className="border border-witness-border bg-navy-light p-5 flex flex-col gap-3">
          <Bar className="h-3 w-32" />
          <div className="flex flex-col gap-2 mt-2">
            <Bar className="h-3 w-full" />
            <Bar className="h-3 w-[92%]" />
            <Bar className="h-3 w-[80%]" />
          </div>
          <div className="flex gap-3 mt-3">
            <Bar className="h-16 w-16" />
            <div className="flex flex-col gap-2 flex-1">
              <Bar className="h-3 w-24" />
              <Bar className="h-3 w-full" />
            </div>
          </div>
        </div>
      )}

      <span className="sr-only">Loading analysis results...</span>
    </div>
  )
}
