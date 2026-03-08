import type { MoveClassification } from '../../utils/chess'
import './MoveClassOverlay.css'

const MOVE_CLASS_TITLES: Record<MoveClassification, string> = {
  great: 'Great move',
  best: 'Best move',
  excellent: 'Excellent move',
  good: 'Good move',
  inaccuracy: 'Inaccuracy',
  mistake: 'Mistake',
  blunder: 'Blunder',
}

/** Move classification symbols: ★ best, ✓ excellent, ! great */
const MOVE_CLASS_SYMBOLS: Record<MoveClassification, string> = {
  great: '!',
  best: '★',
  excellent: '✓',
  good: '',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
}

type Props = {
  square: string
  classification: MoveClassification
}

/** Position icon in bottom-right corner of square (Chess.com style) */
function squareToPosition(square: string): { left: number; top: number } {
  const file = square.charCodeAt(0) - 97
  const rank = parseInt(square[1], 10) - 1
  return {
    left: ((file + 0.92) / 8) * 100,
    top: ((7.92 - rank) / 8) * 100,
  }
}

export default function MoveClassOverlay({ square, classification }: Props) {
  const symbol = MOVE_CLASS_SYMBOLS[classification]
  if (!symbol) return null

  const { left, top } = squareToPosition(square)
  const title = MOVE_CLASS_TITLES[classification]

  return (
    <div
      className={`move-class-overlay move-class-overlay-${classification}`}
      style={{
        left: `${left}%`,
        top: `${top}%`,
        transform: 'translate(-100%, -100%)',
      }}
      title={title}
      aria-label={title}
    >
      <span className="move-class-overlay-symbol">{symbol}</span>
    </div>
  )
}
