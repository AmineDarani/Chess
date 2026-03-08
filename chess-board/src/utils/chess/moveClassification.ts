/**
 * Move classification based on centipawn loss (eval drop from mover's perspective).
 */
export type MoveClassification =
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'

const BLUNDER_CP = 200
const MISTAKE_CP = 100
const INACCURACY_CP = 50
const GOOD_CP = 35
const EXCELLENT_CP = 15
/** When best - secondBest >= this, it's "only good move" = great */
const ONLY_GOOD_MOVE_GAP_CP = 50

/**
 * Classify a move based on eval change.
 * "Great" = only good move (forced/narrow - 2nd best was much worse); "best" = engine's top choice.
 * @param evalBefore - Centipawns before the move (white's perspective)
 * @param evalAfter - Centipawns after the move (white's perspective)
 * @param plyIndex - 0-based ply index (0 = first move, 1 = second, etc.). Even = white, odd = black.
 * @param secondBestCp - Eval of 2nd-best move from before-position (white's perspective). When present and gap is large, best move = "great".
 * @returns Move classification or null if evals are missing
 */
export function classifyMove(
  evalBefore: number | undefined,
  evalAfter: number | undefined,
  plyIndex: number,
  secondBestCp?: number
): MoveClassification | null {
  if (evalBefore === undefined || evalAfter === undefined) return null

  const isWhite = plyIndex % 2 === 0
  // Centipawn loss from mover's perspective: positive = mover made position worse
  const cpLoss = isWhite
    ? evalBefore - evalAfter
    : evalAfter - evalBefore

  if (cpLoss >= BLUNDER_CP) return 'blunder'
  if (cpLoss >= MISTAKE_CP) return 'mistake'
  if (cpLoss >= INACCURACY_CP) return 'inaccuracy'
  if (cpLoss <= 0) {
    // Played the best move. "Great" if it was the only good move (2nd best much worse)
    if (
      secondBestCp !== undefined &&
      Math.abs(evalBefore - secondBestCp) >= ONLY_GOOD_MOVE_GAP_CP
    ) {
      return 'great'
    }
    return 'best'
  }
  if (cpLoss <= EXCELLENT_CP) return 'excellent'
  if (cpLoss <= GOOD_CP) return 'great'
  return 'good'
}
