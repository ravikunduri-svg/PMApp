'use client'

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

type Props = {
  scores: Record<string, number | null>
  comparison?: Record<string, number | null>
}

const DIM_LABELS: Record<string, string> = {
  problem_framing: 'Problem\nFraming',
  user_empathy: 'User\nEmpathy',
  structured_thinking: 'Structured\nThinking',
  prioritization: 'Prioritization',
  metrics_reasoning: 'Metrics\nReasoning',
  communication_clarity: 'Communication',
}

const DIMS = Object.keys(DIM_LABELS)

export default function PMRadarChart({ scores, comparison }: Props) {
  const data = DIMS.map((dim) => ({
    dimension: DIM_LABELS[dim],
    score: scores[dim] ?? 0,
    required: comparison?.[dim] ?? undefined,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="#374151" />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fill: '#9ca3af', fontSize: 11 }}
        />
        <Tooltip
          contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
          labelStyle={{ color: '#f9fafb' }}
          itemStyle={{ color: '#818cf8' }}
        />
        {comparison && (
          <Radar
            name="Required"
            dataKey="required"
            stroke="#f59e0b"
            fill="#f59e0b"
            fillOpacity={0.1}
            strokeDasharray="4 2"
          />
        )}
        <Radar
          name="Your Score"
          dataKey="score"
          stroke="#818cf8"
          fill="#818cf8"
          fillOpacity={0.25}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
