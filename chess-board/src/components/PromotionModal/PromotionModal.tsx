import { useCallback } from 'react'
import './PromotionModal.css'

export type PromotionPiece = 'q' | 'r' | 'b' | 'n'

const PROMOTION_OPTIONS: { piece: PromotionPiece; symbol: string; label: string }[] = [
  { piece: 'q', symbol: '♕', label: 'Queen' },
  { piece: 'r', symbol: '♖', label: 'Rook' },
  { piece: 'b', symbol: '♗', label: 'Bishop' },
  { piece: 'n', symbol: '♘', label: 'Knight' },
]

type Props = {
  isWhite: boolean
  onSelect: (piece: PromotionPiece) => void
}

export default function PromotionModal({ isWhite, onSelect }: Props) {
  const handleClick = useCallback(
    (piece: PromotionPiece) => () => onSelect(piece),
    [onSelect],
  )

  return (
    <div className="promotion-modal-overlay" role="dialog" aria-label="Choose promotion piece">
      <div className="promotion-modal">
        <p className="promotion-modal-title">Promote pawn to</p>
        <div className="promotion-modal-pieces">
          {PROMOTION_OPTIONS.map(({ piece, symbol, label }) => (
            <button
              key={piece}
              type="button"
              className={`promotion-modal-piece promotion-modal-piece-${piece}`}
              onClick={handleClick(piece)}
              title={label}
              aria-label={`Promote to ${label}`}
            >
              <span className="promotion-modal-symbol" data-piece={piece}>
                {symbol}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
