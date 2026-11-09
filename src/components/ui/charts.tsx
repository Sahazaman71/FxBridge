import { useId, useMemo, useState, type PointerEvent } from 'react'

export interface SeriesPoint {
  /** Label shown when scrubbing (a date or time). */
  label: string
  value: number
}

function buildPath(values: number[], width: number, height: number, pad = 2): { line: string; area: string; points: [number, number][] } {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const points = values.map((v, i): [number, number] => [
    (i / Math.max(values.length - 1, 1)) * width,
    pad + (height - pad * 2) - ((v - min) / range) * (height - pad * 2),
  ])
  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')
  const area = `${line} L ${width} ${height} L 0 ${height} Z`
  return { line, area, points }
}

export function Sparkline({ data, color = 'var(--accent)', height = 32, width = 120 }: { data: number[]; color?: string; height?: number; width?: number }) {
  const path = useMemo(() => (data.length >= 2 ? buildPath(data, width, height).line : ''), [data, width, height])
  if (data.length < 2) return <span className="text-xs text-[var(--subtle)]">No data</span>
  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden>
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface LineChartProps {
  data: SeriesPoint[]
  height?: number
  formatValue?: (value: number) => string
  /** Shown when there are fewer than 2 points. */
  emptyMessage: string
  color?: string
}

/** Responsive SVG line chart with hover/touch scrubbing. One accent line, no rainbow. */
export function LineChart({ data, height = 220, formatValue = (v) => v.toFixed(4), emptyMessage, color = '#7fa8ff' }: LineChartProps) {
  const gradientId = useId()
  const [active, setActive] = useState<number | null>(null)
  const width = 640
  const chart = useMemo(() => (data.length >= 2 ? buildPath(data.map((d) => d.value), width, height, 8) : null), [data, height])

  if (!chart) {
    return (
      <div className="glass-inner flex items-center justify-center rounded-2xl text-center text-sm text-[var(--subtle)]" style={{ height }}>
        <span className="max-w-xs px-4">{emptyMessage}</span>
      </div>
    )
  }

  const onMove = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    setActive(Math.round(ratio * (data.length - 1)))
  }

  const current = active ?? data.length - 1
  const point = chart.points[current]
  const datum = data[current]
  const first = data[0]?.value ?? 0
  const last = data[data.length - 1]?.value ?? 0
  const up = last >= first

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <div className="display text-xl font-semibold tabular-nums text-[var(--ink)]">{datum ? formatValue(datum.value) : '-'}</div>
        <div className="text-xs tabular-nums text-[var(--subtle)]">{datum?.label}</div>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full touch-none"
        style={{ height }}
        preserveAspectRatio="none"
        onPointerMove={onMove}
        onPointerLeave={() => setActive(null)}
        role="img"
        aria-label="Rate chart"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={chart.area} fill={`url(#${gradientId})`} />
        <path d={chart.line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {point ? (
          <>
            <line x1={point[0]} x2={point[0]} y1={0} y2={height} stroke="rgba(255,255,255,0.2)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <circle cx={point[0]} cy={point[1]} r={4} fill={color} stroke="#070f1d" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          </>
        ) : null}
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs text-[var(--subtle)]">
        <span>{data[0]?.label}</span>
        <span style={{ color: up ? 'var(--success)' : 'var(--danger)' }}>{up ? 'Up' : 'Down'} over range</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  )
}

export interface BarDatum {
  label: string
  value: number
}

export function BarChart({ data, height = 160, formatValue, emptyMessage }: { data: BarDatum[]; height?: number; formatValue: (v: number) => string; emptyMessage: string }) {
  if (data.length === 0) {
    return (
      <div className="glass-inner flex items-center justify-center rounded-2xl text-center text-sm text-[var(--subtle)]" style={{ height }}>
        <span className="max-w-xs px-4">{emptyMessage}</span>
      </div>
    )
  }
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1" style={{ height: '100%' }}>
          <span className="text-[10px] tabular-nums text-[var(--subtle)]">{d.value > 0 ? formatValue(d.value) : ''}</span>
          <div
            className="w-full rounded-t-md"
            style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 1)}%`, background: 'linear-gradient(180deg, #7fa8ff, rgba(127,168,255,0.25))' }}
          />
          <span className="truncate text-[10px] text-[var(--subtle)]">{d.label}</span>
        </div>
      ))}
    </div>
  )
}
