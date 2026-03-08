import { useEffect } from 'react'
import type { MoveRecordLike } from '../../utils/chess'
import './ReviewMoveList.css'

export type ReviewMoveListProps = {
  history: MoveRecordLike[]
  selectedPly: number
  onMoveClick: (ply: number) => void
  canStepBack: boolean
  canStepForward: boolean
  onStepBack: () => void
  onStepForward: () => void
}

export default function ReviewMoveList({
  history,
  selectedPly,
  onMoveClick,
  canStepBack,
  canStepForward,
  onStepBack,
  onStepForward,
}: ReviewMoveListProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (canStepBack) onStepBack()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (canStepForward) onStepForward()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canStepBack, canStepForward, onStepBack, onStepForward])

  const items: { ply: number; san: string; moveNum?: number }[] = []
  let fullMove = 1
  for (let ply = 0; ply < history.length; ply++) {
    const isWhite = ply % 2 === 0
    items.push({
      ply: ply + 1,
      san: history[ply].san,
      moveNum: isWhite ? fullMove : undefined,
    })
    if (!isWhite) fullMove++
  }

  return (
    <div className="review-move-list">
      <button
        type="button"
        className={`review-move-item review-move-start ${selectedPly === 0 ? 'selected' : ''}`}
        onClick={() => onMoveClick(0)}
      >
        Start
      </button>
      {items.map(({ ply, san, moveNum }) => (
        <span key={ply} className="review-move-wrap">
          {moveNum !== undefined && (
            <span className="review-move-num">{moveNum}.</span>
          )}{' '}
          <button
            type="button"
            className={`review-move-item ${selectedPly === ply ? 'selected' : ''}`}
            onClick={() => onMoveClick(ply)}
          >
            {san}
          </button>
        </span>
      ))}
      <div className="review-move-controls">
        <button
          type="button"
          className="move-history-btn"
          onClick={onStepBack}
          disabled={!canStepBack}
          title="Previous move (←)"
          aria-label="Previous move"
        >
          ←
        </button>
        <button
          type="button"
          className="move-history-btn"
          onClick={onStepForward}
          disabled={!canStepForward}
          title="Next move (→)"
          aria-label="Next move"
        >
          →
        </button>
      </div>
    </div>
  )
}
