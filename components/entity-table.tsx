import type { ExtractedEntity } from '@/types'
import { cn } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = {
  PERSON: 'CIV-ID',
  LOCATION: 'LOC',
  ORGANIZATION: 'ORG',
  DATE: 'DATE',
  INCIDENT: 'INCIDENT',
  MILITARY_ID: 'MIL-ID',
  SIGINT: 'SIGINT',
}

const TYPE_COLORS: Record<string, string> = {
  PERSON: 'bg-blue-900/40 border-blue-400 text-blue-300',
  LOCATION: 'bg-green-900/40 border-green-400 text-green-300',
  ORGANIZATION: 'bg-purple-900/40 border-purple-400 text-purple-300',
  DATE: 'bg-yellow-900/40 border-yellow-400 text-yellow-300',
  INCIDENT: 'bg-red-900/40 border-red-500 text-red-300',
  MILITARY_ID: 'bg-orange-900/40 border-orange-400 text-orange-300',
  SIGINT: 'bg-cyan-900/40 border-cyan-400 text-cyan-300',
}

const WEIGHT_COLORS: Record<string, string> = {
  HIGH: 'text-green-400',
  MEDIUM: 'text-yellow-400',
  LOW: 'text-witness-grey',
}

interface EntityTableProps {
  entities: ExtractedEntity[]
}

export function EntityTable({ entities }: EntityTableProps) {
  if (entities.length === 0) {
    return <p className="text-witness-grey text-sm italic">No entities extracted.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs" aria-label="Extracted entities">
        <thead>
          <tr className="border-b border-witness-border text-witness-grey uppercase tracking-wider">
            <th className="text-left py-2 pr-4 font-normal">Entity</th>
            <th className="text-left py-2 pr-4 font-normal">Type</th>
            <th className="text-left py-2 pr-4 font-normal">Weight</th>
            <th className="text-left py-2 font-normal">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {entities.map((entity, i) => (
            <tr key={i} className="border-b border-witness-border/40 hover:bg-white/[0.02]">
              <td className="py-2 pr-4 text-white font-medium max-w-[200px] truncate" title={entity.text}>
                {entity.text}
              </td>
              <td className="py-2 pr-4">
                <span className={cn(
                  'inline-block px-1.5 py-0.5 border text-[10px] font-semibold tracking-wide',
                  TYPE_COLORS[entity.type] ?? 'bg-witness-red/20 border-witness-red/40 text-red-300'
                )}>
                  {TYPE_LABELS[entity.type] ?? entity.type}
                </span>
              </td>
              <td className={cn('py-2 pr-4 font-medium', WEIGHT_COLORS[entity.evidentiaryWeight])}>
                {entity.evidentiaryWeight}
              </td>
              <td className="py-2 text-witness-grey">
                {(entity.confidence * 100).toFixed(0)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
