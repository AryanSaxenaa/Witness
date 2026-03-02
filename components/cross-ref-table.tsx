import type { CrossReferenceMatch } from '@/types'
import { cn } from '@/lib/utils'

const SOURCE_COLORS: Record<string, string> = {
  ICC: 'bg-red-900/40 border-red-500 text-red-300',
  UN: 'bg-blue-900/40 border-blue-400 text-blue-300',
  ACLED: 'bg-yellow-900/40 border-yellow-400 text-yellow-300',
}

const MATCH_LABELS: Record<string, string> = {
  EXACT: 'Exact',
  FUZZY: 'Fuzzy',
  DATE_PROXIMITY: 'Date ±7d',
}

interface CrossRefTableProps {
  matches: CrossReferenceMatch[]
}

export function CrossRefTable({ matches }: CrossRefTableProps) {
  if (matches.length === 0) {
    return <p className="text-witness-grey text-sm italic">No cross-reference matches found.</p>
  }

  return (
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
          {matches.map((match, i) => (
            <tr key={i} className="border-b border-witness-border/40 hover:bg-white/[0.02]">
              <td className="py-2 pr-3 text-white font-medium max-w-[140px] truncate" title={match.entityText}>
                {match.entityText}
              </td>
              <td className="py-2 pr-3">
                <span className={cn(
                  'inline-block px-1.5 py-0.5 border text-[10px] font-semibold tracking-wide',
                  SOURCE_COLORS[match.source] ?? 'bg-witness-red/20 border-witness-red/40 text-red-300'
                )}>
                  {match.source}
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
  )
}
