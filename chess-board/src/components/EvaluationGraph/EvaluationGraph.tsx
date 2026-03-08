import { useCallback, useMemo } from 'react'
import type { PositionEval } from '../../services/engine'
import './EvaluationGraph.css'

const CP_CLAMP = 500

function clampCp(cp: number): number {
  return Math.max(-CP_CLAMP, Math.min(CP_CLAMP, cp))
}

export type EvaluationGraphProps = {
  evals: Map<number, PositionEval>
  selectedPly: number
  totalPlies: number
  onPlyClick?: (ply: number) => void
  loading?: boolean
}

export default function EvaluationGraph({
  evals,
  selectedPly,
  totalPlies,
  onPlyClick,
  loading = false,
}: EvaluationGraphProps) {
  const width = 400
  const height = 100
  const padding = { top: 12, right: 12, bottom: 12, left: 12 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const { areaPath } = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    for (let ply = 0; ply <= totalPlies; ply++) {
      const e = evals.get(ply)
      const cp = e?.cp ?? 0
      pts.push({ x: ply, y: clampCp(cp) })
    }
    const maxAbs =
      pts.length > 0
        ? Math.max(...pts.map((p) => Math.abs(p.y)), 50)
        : 100

    const scaleX = (ply: number) =>
      padding.left + (ply / Math.max(1, totalPlies)) * chartWidth
    const scaleY = (cp: number) =>
      padding.top + chartHeight / 2 - (cp / maxAbs) * (chartHeight / 2)

    const pathPts = pts.map((p) => `${scaleX(p.x)},${scaleY(p.y)}`).join(' L ')
    const startX = scaleX(0)
    const zeroY = padding.top + chartHeight / 2
    const areaPath = totalPlies > 0
      ? `M ${startX},${zeroY} L ${pathPts} L ${scaleX(totalPlies)},${zeroY} Z`
      : ''

    return { areaPath }
  }, [evals, totalPlies, chartWidth, chartHeight, padding])

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!onPlyClick || totalPlies <= 0) return
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left - padding.left
      const fraction = Math.max(0, Math.min(1, x / chartWidth))
      const ply = Math.round(fraction * totalPlies)
      onPlyClick(ply)
    },
    [onPlyClick, totalPlies, chartWidth, padding.left]
  )

  const scrubberX =
    totalPlies > 0
      ? padding.left + (selectedPly / totalPlies) * chartWidth
      : padding.left
  const zeroY = padding.top + chartHeight / 2

  if (loading && evals.size === 0) {
    return (
      <div className="evaluation-graph evaluation-graph-loading">
        <span>Loading evaluation…</span>
      </div>
    )
  }

  if (totalPlies <= 0) {
    return null
  }

  return (
    <div className="evaluation-graph">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none meet"
        onClick={handleClick}
        role="img"
        aria-label="Game evaluation over time"
      >
        <defs>
          <linearGradient
            id="eval-graph-gradient"
            x1="0"
            y1="1"
            x2="0"
            y2="0"
          >
            <stop offset="0" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="1" stopColor="rgba(255,255,255,1)" />
          </linearGradient>
        </defs>
        <line
          x1={padding.left}
          y1={zeroY}
          x2={width - padding.right}
          y2={zeroY}
          className="evaluation-graph-zero"
        />
        {areaPath && (
          <path
            d={areaPath}
            fill="url(#eval-graph-gradient)"
            className="evaluation-graph-area"
          />
        )}
        <line
          x1={scrubberX}
          y1={padding.top}
          x2={scrubberX}
          y2={height - padding.bottom}
          className="evaluation-graph-scrubber"
        />
      </svg>
    </div>
  )
}
