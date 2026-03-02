'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionStore, type SavedSession } from '@/store/session'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'
import { PageTransition } from '@/components/page-transition'
import type { ExtractedEntity } from '@/types'

/* ─── Helpers ────────────────────────────────────────────────────────────── */

/** Find entities common to both sessions (same text, case-insensitive) */
function findCommonEntities(a: ExtractedEntity[], b: ExtractedEntity[]): string[] {
  const setB = new Set(b.map(e => e.text.toLowerCase()))
  return [...new Set(a.filter(e => setB.has(e.text.toLowerCase())).map(e => e.text))]
}

/** Find entities unique to a session */
function uniqueEntities(own: ExtractedEntity[], other: ExtractedEntity[]): ExtractedEntity[] {
  const otherSet = new Set(other.map(e => e.text.toLowerCase()))
  const seen = new Set<string>()
  return own.filter(e => {
    const key = e.text.toLowerCase()
    if (otherSet.has(key) || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const WEIGHT_COLORS = {
  HIGH: 'text-green-400 border-green-600 bg-green-900/20',
  MEDIUM: 'text-yellow-400 border-yellow-600 bg-yellow-900/20',
  LOW: 'text-red-400 border-red-600 bg-red-900/20',
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function ComparePage() {
  const router = useRouter()
  const { savedSessions } = useSessionStore()
  const [leftId, setLeftId] = useState<string | null>(null)
  const [rightId, setRightId] = useState<string | null>(null)

  const left = savedSessions.find(s => s.id === leftId) ?? null
  const right = savedSessions.find(s => s.id === rightId) ?? null

  const comparison = useMemo(() => {
    if (!left || !right) return null
    const common = findCommonEntities(left.analysisResult.entities, right.analysisResult.entities)
    const uniqueLeft = uniqueEntities(left.analysisResult.entities, right.analysisResult.entities)
    const uniqueRight = uniqueEntities(right.analysisResult.entities, left.analysisResult.entities)
    return { common, uniqueLeft, uniqueRight }
  }, [left, right])

  return (
    <PageTransition>
    <div className="flex flex-col h-[calc(100vh-32px)] overflow-hidden">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between px-4 md:px-8 py-4 border-b border-witness-border flex-shrink-0 gap-2">
        <div className="flex items-center gap-4">
          <h1 className="font-serif text-xl tracking-wide">WITNESS</h1>
          <span className="text-xs text-witness-grey border border-witness-border px-2 py-0.5 uppercase tracking-widest">
            Comparative Analysis
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => router.push('/')}
            className="text-xs uppercase tracking-wider border border-witness-border text-witness-grey hover:border-white hover:text-white transition-colors px-4 py-2"
          >
            ← Home
          </button>
        </div>
      </header>

      {/* Session Selectors */}
      <div className="flex flex-col sm:flex-row gap-4 px-4 md:px-8 py-4 border-b border-witness-border bg-navy-light">
        <div className="flex-1">
          <label className="text-[10px] text-witness-grey uppercase tracking-widest block mb-1">
            Testimony A
          </label>
          <select
            value={leftId ?? ''}
            onChange={(e) => setLeftId(e.target.value || null)}
            className="w-full bg-navy border border-witness-border text-white text-sm px-3 py-2 focus:border-witness-red outline-none"
          >
            <option value="">Select a session...</option>
            {savedSessions
              .filter(s => s.id !== rightId)
              .map(s => (
                <option key={s.id} value={s.id}>{s.caseRef} — {s.location}</option>
              ))}
          </select>
        </div>
        <div className="flex items-end justify-center">
          <span className="text-witness-grey text-lg font-serif pb-2">vs</span>
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-witness-grey uppercase tracking-widest block mb-1">
            Testimony B
          </label>
          <select
            value={rightId ?? ''}
            onChange={(e) => setRightId(e.target.value || null)}
            className="w-full bg-navy border border-witness-border text-white text-sm px-3 py-2 focus:border-witness-red outline-none"
          >
            <option value="">Select a session...</option>
            {savedSessions
              .filter(s => s.id !== leftId)
              .map(s => (
                <option key={s.id} value={s.id}>{s.caseRef} — {s.location}</option>
              ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!left || !right ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="font-serif text-lg text-witness-grey/50 mb-2">Select Two Testimonies</div>
              <p className="text-xs text-witness-grey">
                {savedSessions.length < 2
                  ? 'You need at least 2 saved sessions to compare. Complete more analyses first.'
                  : 'Choose two sessions above to see a comparative analysis.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-0">
            {/* Side-by-side summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-witness-border">
              <SessionPanel session={left} label="A" />
              <SessionPanel session={right} label="B" />
            </div>

            {/* Comparison Results */}
            {comparison && (
              <div className="px-4 md:px-8 py-6 border-t border-witness-border">
                <div className="text-xs text-witness-grey uppercase tracking-widest mb-4 pb-2 border-b border-witness-border">
                  Comparative Analysis
                </div>

                {/* Shared entities */}
                <div className="mb-6">
                  <div className="text-xs text-witness-grey uppercase tracking-widest mb-2">
                    Shared Entities ({comparison.common.length})
                  </div>
                  {comparison.common.length === 0 ? (
                    <p className="text-sm text-witness-grey italic">No shared entities found between testimonies.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {comparison.common.map((text) => (
                        <span key={text} className="px-2 py-1 text-xs border border-green-600 bg-green-900/20 text-green-400">
                          {text}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Unique entities */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-xs text-witness-grey uppercase tracking-widest mb-2">
                      Unique to A ({comparison.uniqueLeft.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {comparison.uniqueLeft.map((e, i) => (
                        <span key={i} className={cn('px-1.5 py-0.5 text-[10px] border', WEIGHT_COLORS[e.evidentiaryWeight])}>
                          {e.text}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-witness-grey uppercase tracking-widest mb-2">
                      Unique to B ({comparison.uniqueRight.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {comparison.uniqueRight.map((e, i) => (
                        <span key={i} className={cn('px-1.5 py-0.5 text-[10px] border', WEIGHT_COLORS[e.evidentiaryWeight])}>
                          {e.text}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Confidence comparison */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ComparisonMetric
                    label="Confidence Score"
                    valueA={left.memo.confidenceScore}
                    valueB={right.memo.confidenceScore}
                    format={(v) => `${(v * 100).toFixed(1)}%`}
                  />
                  <ComparisonMetric
                    label="Veracity Score"
                    valueA={left.memo.veracity.score}
                    valueB={right.memo.veracity.score}
                    format={(v) => `${(v * 100).toFixed(1)}%`}
                  />
                  <ComparisonMetric
                    label="DB Matches"
                    valueA={left.crossReferenceResult.matches.length}
                    valueB={right.crossReferenceResult.matches.length}
                    format={(v) => String(v)}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </PageTransition>
  )
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function SessionPanel({ session, label }: { session: SavedSession; label: string }) {
  return (
    <div className="p-4 md:p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold border border-witness-red px-2 py-0.5 text-witness-red tracking-wider">
          {label}
        </span>
        <span className="font-serif text-sm">{session.caseRef}</span>
      </div>
      <div className="text-xs text-witness-grey flex flex-col gap-1">
        <div><span className="uppercase tracking-widest mr-2">Location:</span> {session.location}</div>
        <div><span className="uppercase tracking-widest mr-2">Date:</span> {formatDate(session.createdAt)}</div>
        <div><span className="uppercase tracking-widest mr-2">Entities:</span> {session.analysisResult.entities.length}</div>
        <div><span className="uppercase tracking-widest mr-2">Matches:</span> {session.crossReferenceResult.matches.length}</div>
      </div>
      <div>
        <div className="text-xs text-witness-grey uppercase tracking-widest mb-2">Executive Summary</div>
        <p className="text-sm leading-relaxed text-white/80">{session.memo.executiveSummary}</p>
      </div>
      {session.memo.flaggedInconsistencies.length > 0 && (
        <div>
          <div className="text-xs text-witness-grey uppercase tracking-widest mb-1">Inconsistencies</div>
          <ul className="flex flex-col gap-1">
            {session.memo.flaggedInconsistencies.map((f, i) => (
              <li key={i} className="text-xs text-yellow-300/80 flex gap-1.5">
                <span className="text-witness-red flex-shrink-0">⚑</span>{f}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function ComparisonMetric({
  label,
  valueA,
  valueB,
  format,
}: {
  label: string
  valueA: number
  valueB: number
  format: (v: number) => string
}) {
  return (
    <div className="border border-witness-border p-4">
      <div className="text-xs text-witness-grey uppercase tracking-widest mb-3">{label}</div>
      <div className="flex items-end justify-between">
        <div className="text-center">
          <div className="text-[10px] text-witness-grey mb-1">A</div>
          <div className="font-serif text-lg text-witness-red">{format(valueA)}</div>
        </div>
        <div className="text-xs text-witness-grey px-2">vs</div>
        <div className="text-center">
          <div className="text-[10px] text-witness-grey mb-1">B</div>
          <div className="font-serif text-lg text-witness-red">{format(valueB)}</div>
        </div>
      </div>
    </div>
  )
}
