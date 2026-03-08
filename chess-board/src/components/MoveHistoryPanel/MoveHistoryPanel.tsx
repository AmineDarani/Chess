import { useEffect } from 'react'
import './MoveHistoryPanel.css'

export type MoveHistoryPanelProps = {
  formattedMoveList: string
  canStepBack: boolean
  canStepForward: boolean
  canUndo: boolean
  onStepBack: () => void
  onStepForward: () => void
  onUndo?: () => void
}

export default function MoveHistoryPanel({
  formattedMoveList,
  canStepBack,
  canStepForward,
  canUndo,
  onStepBack,
  onStepForward,
  onUndo,
}: MoveHistoryPanelProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
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

  return (
    <div className="move-history-panel">
      <div className="move-history-moves">
        {formattedMoveList || '—'}
      </div>
      <div className="move-history-controls">
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
        {onUndo && (
          <button
            type="button"
            className="move-history-btn move-history-undo"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo last move"
            aria-label="Undo"
          >
            Undo
          </button>
        )}
      </div>
    </div>
  )
}
