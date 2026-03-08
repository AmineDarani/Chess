import { useCallback, useState } from 'react'
import type { PieceDropHandlerArgs } from 'react-chessboard'
import { getLegalMovesFromSquare, isLegalPromotionMove } from '../utils/chess'
import type { PromotionPiece } from '../components/PromotionModal/PromotionModal'

export type PendingPromotion = {
  from: string
  to: string
  isWhite: boolean
}

export type UsePieceDropHandlerOptions = {
  fen: string
  applyMove: (from: string, to: string, promotion?: PromotionPiece) => boolean | void
  clearHighlight: () => void
}

export function usePieceDropHandler({
  fen,
  applyMove,
  clearHighlight,
}: UsePieceDropHandlerOptions) {
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null)

  const handlePromotionSelect = useCallback(
    (piece: PromotionPiece) => {
      if (!pendingPromotion) return
      const result = applyMove(pendingPromotion.from, pendingPromotion.to, piece)
      setPendingPromotion(null)
      if (result === false) clearHighlight()
    },
    [pendingPromotion, applyMove, clearHighlight],
  )

  const handlePieceDrop = useCallback(
    ({ piece, sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
      if (!targetSquare) {
        clearHighlight()
        return false
      }
      const isPawn = piece.pieceType === 'wP' || piece.pieceType === 'bP'
      const wouldBePromotionRank =
        isPawn &&
        ((piece.pieceType === 'wP' && targetSquare[1] === '8') ||
          (piece.pieceType === 'bP' && targetSquare[1] === '1'))
      if (wouldBePromotionRank && isLegalPromotionMove(fen, sourceSquare, targetSquare)) {
        setPendingPromotion({
          from: sourceSquare,
          to: targetSquare,
          isWhite: piece.pieceType === 'wP',
        })
        clearHighlight()
        return false
      }
      const legal = getLegalMovesFromSquare(fen, sourceSquare)
      const isValid = legal.some((m) => m.to === targetSquare)
      if (!isValid) {
        clearHighlight()
        return false
      }
      const result = applyMove(sourceSquare, targetSquare)
      clearHighlight()
      return result !== false
    },
    [fen, applyMove, clearHighlight],
  )

  return {
    handlePieceDrop,
    handlePromotionSelect,
    pendingPromotion,
  }
}
