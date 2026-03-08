import { useState } from 'react'
import {
  formatMoveList,
  getFenAtPly,
  getLastMoveAtPly,
  LAST_MOVE_FROM,
  LAST_MOVE_TO,
  type MoveRecordLike,
} from '../utils/chess'

export type UseMoveHistoryOptions = {
  history: MoveRecordLike[]
  liveFen: string
  canHumanMove: boolean
  /** When true (e.g. opponent played), snap view to head */
  shouldSnapToHead?: boolean
}

export function useMoveHistory({
  history,
  liveFen,
  canHumanMove,
  shouldSnapToHead = false,
}: UseMoveHistoryOptions) {
  const [viewIndex, setViewIndex] = useState(0)

  // Snap to live when history grows (new move) or when cleared (rematch). Clamp when history shrinks (undo).
  // Uses React's "adjusting state when props change" pattern instead of useEffect to avoid cascading renders.
  const targetIndex =
    shouldSnapToHead || history.length === 0
      ? history.length
      : Math.min(viewIndex, history.length)
  if (viewIndex !== targetIndex) {
    setViewIndex(targetIndex)
  }

  const isAtHead = targetIndex === history.length
  const viewFen =
    isAtHead ? liveFen : getFenAtPly(history, targetIndex)
  const lastMove = getLastMoveAtPly(history, targetIndex)
  const lastMoveSquares: Record<string, React.CSSProperties> = lastMove
    ? {
        [lastMove.from]: LAST_MOVE_FROM,
        [lastMove.to]: LAST_MOVE_TO,
      }
    : {}

  const canStepBack = targetIndex > 0
  const canStepForward = targetIndex < history.length

  const stepBack = () => {
    setViewIndex((prev) => Math.max(0, prev - 1))
  }

  const stepForward = () => {
    setViewIndex((prev) => Math.min(history.length, prev + 1))
  }

  const goToPly = (ply: number) => {
    setViewIndex(Math.max(0, Math.min(history.length, ply)))
  }

  return {
    viewFen,
    lastMoveSquares,
    viewIndex: targetIndex,
    isAtHead,
    canStepBack,
    canStepForward,
    stepBack,
    stepForward,
    goToPly,
    formattedMoveList: formatMoveList(history),
    allowDragging: isAtHead && canHumanMove,
  }
}
