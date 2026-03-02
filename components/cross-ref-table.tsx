import { useState } from 'react'
import type { CrossReferenceMatch } from '@/types'
import { cn } from '@/lib/utils'

const SOURCE_COLORS: Record<string, string> = {
  ICC: 'bg-red-900/40 border-red-500 text-red-300',
  UN: 'bg-blue-900/40 border-blue-400 text-blue-300',
  ACLED: 'bg-yellow-900/40 border-yellow-400 text-yellow-300',
  AMNESTY: 'bg-amber-900/40 border-amber-400 text-amber-300',
  HRW: 'bg-emerald-900/40 border-emerald-400 text-emerald-300',
}

const SOURCE_LABELS: Record<string, string> = {
  ICC: 'ICC',
  UN: 'UN',
  ACLED: 'ACLED',
  AMNESTY: 'Amnesty Intl',
  HRW: 'HRW',
}

const MATCH_LABELS: Record<string, string> = {
  EXACT: 'Exact',
  FUZZY: 'Fuzzy',
  DATE_PROXIMITY: 'Date ±7d',
}

const THRESHOLD_PRESETS = [
  { label: 'All', value: 0 },
  { label: '≥30%', value: 0.3 },
  { label: '≥50%', value: 0.5 },
  { label: '≥70%', value: 0.7 },
]

const PAGE_SIZE = 10

interface CrossRefTableProps {
  matches: CrossReferenceMatch[]
}

export function CrossRefTable({ matches }: CrossRefTableProps) {
  const [threshold, setThreshold] = useState(0)
  const [page, setPage] = useState(0)

  const filtered = matches.filter(m => m.corroborationStrength >= threshold)
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const paginated = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  // Reset to first page when threshold changes
  const handleThreshold = (v: number) => {
    setThreshold(v)
    setPage(0)
  }

  if (matches.length === 0) {
    return <p className="text-witness-grey text-sm italic">No cross-reference matches found.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Confidence Threshold Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-witness-grey uppercase tracking-widest">Min Strength</span>
        <div className="flex gap-1">
          {THRESHOLD_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handleThreshold(preset.value)}
              className={cn(
                'px-2 py-0.5 text-[10px] uppercase tracking-wider border transition-colors',
                threshold === preset.value
                  ? 'border-witness-red bg-witness-red/20 text-white'
                  : 'border-witness-border text-witness-grey hover:text-white'
              )}
              aria-pressed={threshold === preset.value}
            >
              {preset.label}
            </button>
          ))}
        </div>
        {threshold > 0 && (
          <span className="text-[10px] text-witness-grey">
            Showing {filtered.length} of {matches.length}
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs" aria-label="Cross-reference matches">
          <thead>
          <tr className="border-b border-witness-border text-witness-grey uppercase tracking-wider">
            <th className="text-left py-2 pr-3 font-normal">Entity</th>
            <th className="text-left py-2 pr-3 font-normal">Source</th>
            <th className="text-left py-2 pr-3 font-normal">Case / Incident</th>
            <th className="text-left py-2 pr-3 font-normal">Match</th>
            <th className="text-left py-2 font-normal">Strength</th>
          </tr>
        </thead>
        <tbody>
          {paginated.map((match, i) => (
            <tr key={i} className="border-b border-witness-border/40 hover:bg-white/[0.02]">
              <td className="py-2 pr-3 text-white font-medium max-w-[140px] truncate" title={match.entityText}>
                {match.entityText}
              </td>
              <td className="py-2 pr-3">
                <span className={cn(
                  'inline-block px-1.5 py-0.5 border text-[10px] font-semibold tracking-wide',
                  SOURCE_COLORS[match.source] ?? 'bg-witness-red/20 border-witness-red/40 text-red-300'
                )}>
                  {SOURCE_LABELS[match.source] ?? match.source}
                </span>
              </td>
              <td className="py-2 pr-3 text-witness-grey max-w-[180px]">
                <div className="text-[10px] text-witness-grey/70 font-mono">{match.matchedCaseId}</div>
                <div className="truncate" title={match.matchedCaseTitle}>{match.matchedCaseTitle}</div>
              </td>
              <td className="py-2 pr-3 text-witness-grey">
                {MATCH_LABELS[match.matchType] ?? match.matchType}
              </td>
              <td className="py-2">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-witness-border overflow-hidden">
                    <div
                      className={cn(
                        'h-full',
                        match.corroborationStrength >= 0.8 ? 'bg-green-400' :
                        match.corroborationStrength >= 0.5 ? 'bg-yellow-400' :
                        'bg-red-400'
                      )}
                      style={{ width: `${match.corroborationStrength * 100}%` }}
                    />
                  </div>
                  <span className="text-witness-grey">{(match.corroborationStrength * 100).toFixed(0)}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-witness-grey">
            Page {safePage + 1} of {pageCount}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(0)}
              disabled={safePage === 0}
              className="px-2 py-0.5 text-[10px] border border-witness-border text-witness-grey hover:text-white disabled:opacity-30 transition-colors"
              aria-label="First page"
            >
              ««
            </button>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="px-2 py-0.5 text-[10px] border border-witness-border text-witness-grey hover:text-white disabled:opacity-30 transition-colors"
              aria-label="Previous page"
            >
              «
            </button>
            <button
              onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
              className="px-2 py-0.5 text-[10px] border border-witness-border text-witness-grey hover:text-white disabled:opacity-30 transition-colors"
              aria-label="Next page"
            >
              »
            </button>
            <button
              onClick={() => setPage(pageCount - 1)}
              disabled={safePage >= pageCount - 1}
              className="px-2 py-0.5 text-[10px] border border-witness-border text-witness-grey hover:text-white disabled:opacity-30 transition-colors"
              aria-label="Last page"
            >
              »»
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
