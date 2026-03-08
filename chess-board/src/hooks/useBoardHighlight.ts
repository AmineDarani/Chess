import { useCallback, useState } from 'react'

export type SquareStyles = Record<string, React.CSSProperties>

type UseBoardHighlightOptions = {
  getLegalMoves: (square: string) => string[]
  canHighlight: (square: string) => boolean
  /** When true, highlight the selected square with a distinct style (e.g. yellow) */
  includeSelectedSquare?: boolean
}

export function useBoardHighlight({
  getLegalMoves,
  canHighlight,
  includeSelectedSquare = false,
}: UseBoardHighlightOptions) {
  const [moveSquares, setMoveSquares] = useState<SquareStyles>({})

  const clearMoveSquares = useCallback(() => {
    setMoveSquares({})
  }, [])

  const highlightMovesForSquare = useCallback(
    (square: string) => {
      if (!canHighlight(square)) {
        setMoveSquares({})
        return
      }

      const moves = getLegalMoves(square)
      if (moves.length === 0) {
        setMoveSquares({})
        return
      }

      const highlightStyle: React.CSSProperties = {
        background:
          'radial-gradient(circle, rgba(0, 0, 0, 0.4) 18%, transparent 20%)',
      }

      const selectedStyle: React.CSSProperties = {
        background: 'rgba(255, 255, 0, 0.25)',
      }

      const styles: SquareStyles = {}
      if (includeSelectedSquare) {
        styles[square] = selectedStyle
      }
      for (const sq of moves) {
        styles[sq] = highlightStyle
      }
      setMoveSquares(styles)
    },
    [getLegalMoves, canHighlight, includeSelectedSquare],
  )

  return {
    moveSquares,
    clearMoveSquares,
    highlightMovesForSquare,
  }
}
