'use client'

import { useEffect, useRef } from 'react'

interface StreamPreviewProps {
  text: string
  label: string
}

export function StreamPreview({ text, label }: StreamPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom as text streams in
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [text])

  if (!text) return null

  return (
    <div className="border border-witness-border bg-navy-light overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-witness-border bg-witness-red/10">
        <span className="text-[10px] text-witness-red uppercase tracking-widest font-medium">
          {label}
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-witness-grey">
          <span className="w-1.5 h-1.5 bg-witness-red rounded-full animate-pulse" />
          Streaming
        </span>
      </div>
      <div
        ref={containerRef}
        className="p-4 max-h-[240px] overflow-y-auto font-mono text-xs text-witness-grey/80 leading-relaxed whitespace-pre-wrap break-words"
        role="log"
        aria-live="polite"
        aria-label={`${label} stream output`}
      >
        {text}
        <span className="inline-block w-1.5 h-3.5 bg-witness-red/70 animate-pulse ml-0.5 align-text-bottom" />
      </div>
    </div>
  )
}
