'use client'

import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis,
} from 'recharts'

interface ConfidenceChartProps {
  score: number
  label?: string
}

export function ConfidenceChart({ score, label = 'Veracity Score' }: ConfidenceChartProps) {
  const percentage = Math.round(score * 100 * 10) / 10
  const data = [{ value: percentage }]

  const color =
    percentage >= 80 ? '#4ade80'
    : percentage >= 60 ? '#facc15'
    : '#f87171'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-xs text-witness-grey uppercase tracking-widest">{label}</div>
      <div className="relative w-32 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="90%"
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" fill={color} background={{ fill: '#1e2540' }} cornerRadius={0} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-serif text-2xl" style={{ color }}>
            {percentage}%
          </span>
        </div>
      </div>
      <div className="text-xs text-witness-grey">Based on multi-modal correlation</div>
    </div>
  )
}
