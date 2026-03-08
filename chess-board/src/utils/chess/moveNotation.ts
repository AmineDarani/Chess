import { Chess } from 'chess.js'
import type { Fen } from './chessDomain'
import { START_FEN } from './chessDomain'

export type MoveRecordLike = {
  from: string
  to: string
  san: string
  fenAfter: string
}

/**
 * Build PGN-style move list string.
 * Example: "1. e4 e5 2. Nf3 Nc6 3. Bb5"
 * With odd plies (white just played): "1. e4 e5 2. Nf3"
 */
export function formatMoveList(history: { san: string }[]): string {
  if (history.length === 0) return ''
  const parts: string[] = []
  let fullMove = 1
  for (let ply = 0; ply < history.length; ply++) {
    const san = history[ply].san
    const isWhite = ply % 2 === 0
    if (isWhite) {
      parts.push(`${fullMove}. ${san}`)
    } else {
      parts.push(san)
      fullMove++
    }
  }
  return parts.join(' ')
}

/**
 * Return FEN at given ply (0 = start, 1 = after first move, etc.)
 */
export function getFenAtPly(
  history: MoveRecordLike[],
  ply: number
): Fen {
  if (ply <= 0) return START_FEN
  const idx = ply - 1
  if (idx >= history.length) {
    return history[history.length - 1]?.fenAfter ?? START_FEN
  }
  return history[idx].fenAfter
}

/**
 * Build move history from SAN move list (e.g. from server).
 * Returns MoveRecordLike[] for use with review/analysis.
 */
export function buildHistoryFromMoves(moves: string[]): MoveRecordLike[] {
  if (moves.length === 0) return []
  const records: MoveRecordLike[] = []
  const chess = new Chess()
  for (const san of moves) {
    const m = chess.move(san)
    if (!m) return records
    records.push({
      from: m.from,
      to: m.to,
      san: m.san,
      fenAfter: chess.fen(),
    })
  }
  return records
}

/**
 * Return last move (from, to) at given ply for highlighting.
 * ply 0 = no move yet, ply 1 = first move, etc.
 */
export function getLastMoveAtPly(
  history: MoveRecordLike[],
  ply: number
): { from: string; to: string } | null {
  if (ply <= 0 || ply > history.length) return null
  const rec = history[ply - 1]
  return { from: rec.from, to: rec.to }
}
