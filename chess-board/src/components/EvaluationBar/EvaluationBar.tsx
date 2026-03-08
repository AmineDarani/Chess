import './EvaluationBar.css'

export type EvalDisplay = {
  cp: number
  mateIn?: number
} | null

type Props = {
  /** Position evaluation; null when evaluating */
  eval: EvalDisplay
}

const MATE_THRESHOLD = 5000

/**
 * Convert centipawns to white percentage for bar display.
 * 0 cp = 50%, positive = white advantage, negative = black advantage.
 * Mate (|cp| >= 5000) maps to ~100% or ~0%.
 */
function cpToWhitePct(cp: number): number {
  const scale = 400
  const clamped = Math.max(-scale * 3, Math.min(scale * 3, cp))
  return 50 + Math.tanh(clamped / scale) * 50
}

/**
 * Format eval as pawn-equivalent or mate (e.g. "+1", "-0.5", "M5+", "M3−").
 */
function formatEvalLabel(evalData: NonNullable<EvalDisplay>): string {
  const { cp, mateIn } = evalData
  if (mateIn !== undefined) {
    const n = Math.abs(mateIn)
    return mateIn > 0 ? `M${n}+` : `M${n}−`
  }
  if (cp >= MATE_THRESHOLD) return 'M+'
  if (cp <= -MATE_THRESHOLD) return 'M−'
  const pawns = cp / 100
  const sign = pawns > 0 ? '+' : ''
  return `${sign}${pawns % 1 === 0 ? pawns : pawns.toFixed(1)}`
}

export default function EvaluationBar({ eval: evalData }: Props) {
  const whitePct = evalData === null ? 50 : cpToWhitePct(evalData.cp)
  const evalLabel = evalData === null ? '—' : formatEvalLabel(evalData)

  return (
    <div className="evaluation-bar" aria-label="Position evaluation">
      <div className="evaluation-bar-track">
        <div
          className="evaluation-bar-white"
          style={{ height: `${whitePct}%` }}
        />
        <div
          className="evaluation-bar-black"
          style={{ height: `${100 - whitePct}%` }}
        />
      </div>
      <div className="evaluation-bar-label">{evalLabel}</div>
    </div>
  )
}
