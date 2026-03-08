import { Chess } from 'chess.js'
import type { MoveRecordLike } from './moveNotation'

export type PgnParseResult = {
  history: MoveRecordLike[]
  gameOverText: string
} | null

/**
 * Parse PGN string to move history and game result.
 */
export function parsePgn(pgn: string): PgnParseResult | null {
  const trimmed = pgn.trim()
  if (!trimmed) return null

  try {
    const game = new Chess()
    game.loadPgn(trimmed)

    const moveHistory = game.history({ verbose: true })
    const records: MoveRecordLike[] = []

    const temp = new Chess()
    for (const move of moveHistory) {
      const m = temp.move({ from: move.from, to: move.to, promotion: move.promotion })
      if (!m) return null
      records.push({
        from: m.from,
        to: m.to,
        san: m.san,
        fenAfter: temp.fen(),
      })
    }

    let gameOverText = 'Game review'
    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'Black' : 'White'
      gameOverText = `${winner} wins by checkmate`
    } else if (game.isStalemate()) {
      gameOverText = 'Draw by stalemate'
    } else if (game.isDraw()) {
      gameOverText = 'Draw'
    } else {
      gameOverText = 'Game review'
    }

    return { history: records, gameOverText }
  } catch {
    return null
  }
}
