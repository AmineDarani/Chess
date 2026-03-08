import { uciPvToSan } from '../../utils/chess'
import './BestMovesPanel.css'

type Props = {
  fen: string
  pv?: string[]
  maxMoves?: number
}

/**
 * Get full move number from FEN (last field).
 */
function getFullMoveFromFen(fen: string): number {
  const parts = fen.split(/\s+/)
  const n = parseInt(parts[5], 10)
  return isNaN(n) ? 1 : Math.max(1, n)
}

/**
 * Get turn from FEN: 'w' or 'b'.
 */
function getTurnFromFen(fen: string): 'w' | 'b' {
  return (fen.split(/\s+/)[1] ?? 'w') as 'w' | 'b'
}

/**
 * Format SAN moves into PGN-style with move numbers (e.g. "1. e4 e5 2. Nf3").
 */
function formatPv(fen: string, sanMoves: string[]): string {
  if (sanMoves.length === 0) return '—'
  const parts: string[] = []
  let fullMove = getFullMoveFromFen(fen)
  const firstIsWhite = getTurnFromFen(fen) === 'w'
  for (let i = 0; i < sanMoves.length; i++) {
    const isWhite = firstIsWhite ? i % 2 === 0 : i % 2 === 1
    if (isWhite) {
      parts.push(`${fullMove}. ${sanMoves[i]}`)
    } else {
      parts.push(sanMoves[i])
      fullMove++
    }
  }
  return parts.join(' ')
}

export default function BestMovesPanel({ fen, pv, maxMoves = 7 }: Props) {
  const sanMoves = pv ? uciPvToSan(fen, pv, maxMoves) : []
  const text = formatPv(fen, sanMoves)

  return (
    <div className="best-moves-panel">
      <div className="best-moves-label">Best moves</div>
      <div className="best-moves-content">{text}</div>
    </div>
  )
}
