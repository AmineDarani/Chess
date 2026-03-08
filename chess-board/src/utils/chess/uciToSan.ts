import { Chess } from 'chess.js'
import type { Fen } from './chessDomain'

/**
 * Convert UCI move string (e.g. "e2e4") to SAN using current position.
 */
function uciToSan(fen: Fen, uci: string): string | null {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return null
  try {
    const game = new Chess(fen)
    const from = uci.slice(0, 2) as `${string}${string}`
    const to = uci.slice(2, 4) as `${string}${string}`
    const promotion = uci[4] as 'q' | 'r' | 'b' | 'n' | undefined
    const move = game.move({ from, to, promotion: promotion ?? 'q' })
    return move?.san ?? null
  } catch {
    return null
  }
}

/**
 * Convert a PV (principal variation) of UCI moves to SAN notation.
 * Returns array of SAN moves, up to maxMoves.
 */
export function uciPvToSan(fen: Fen, uciMoves: string[], maxMoves = 7): string[] {
  const result: string[] = []
  let currentFen = fen
  for (let i = 0; i < Math.min(uciMoves.length, maxMoves); i++) {
    const san = uciToSan(currentFen, uciMoves[i])
    if (!san) break
    result.push(san)
    try {
      const game = new Chess(currentFen)
      const uci = uciMoves[i]
      const from = uci.slice(0, 2)
      const to = uci.slice(2, 4)
      const promotion = uci[4] ?? 'q'
      game.move({ from, to, promotion })
      currentFen = game.fen()
    } catch {
      break
    }
  }
  return result
}
