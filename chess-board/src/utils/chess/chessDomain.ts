import { Chess, type Color, type Square } from 'chess.js'

export type Fen = string

export const START_FEN: Fen = new Chess().fen()

export type GameOutcome =
  | { status: 'ongoing' }
  | { status: 'draw'; reason: 'stalemate' | 'draw' }
  | { status: 'checkmate'; winner: Color }

export type MoveInput = {
  from: string
  to: string
  promotion?: string
}

export type AppliedMove = {
  ok: true
  nextFen: Fen
  from: Square
  to: Square
  san: string
  uci: string
  isGameOver: boolean
  outcome: GameOutcome
}

export type RejectedMove = {
  ok: false
  reason: 'invalid-fen' | 'invalid-square' | 'illegal-move'
}

export type TryMoveResult = AppliedMove | RejectedMove

export type LegalMove = {
  from: Square
  to: Square
  san: string
  uci: string
  promotion?: string
}

const parseSquare = (s: string): Square | null =>
  /^[a-h][1-8]$/.test(s) ? (s as Square) : null

const createGame = (fen: Fen): Chess | null => {
  try {
    return new Chess(fen)
  } catch {
    return null
  }
}

const opposite = (c: Color): Color => (c === 'w' ? 'b' : 'w')

export function getTurn(fen: Fen): Color | null {
  const game = createGame(fen)
  return game ? game.turn() : null
}

export function getOutcome(fen: Fen): GameOutcome | null {
  const game = createGame(fen)
  if (!game) return null
  return getOutcomeFromGame(game)
}

function getOutcomeFromGame(game: Chess): GameOutcome {
  if (!game.isGameOver()) return { status: 'ongoing' }

  if (game.isCheckmate()) {
    // In checkmate, the side to move is checkmated.
    return { status: 'checkmate', winner: opposite(game.turn()) }
  }

  if (game.isStalemate()) {
    return { status: 'draw', reason: 'stalemate' }
  }

  if (game.isDraw()) {
    return { status: 'draw', reason: 'draw' }
  }

  // Fallback: chess.js considers some conditions game-over without classifying above.
  return { status: 'draw', reason: 'draw' }
}

export function getLegalMovesFromSquare(fen: Fen, from: string): LegalMove[] {
  const game = createGame(fen)
  if (!game) return []

  const fromSq = parseSquare(from)
  if (!fromSq) return []

  const piece = game.get(fromSq)
  if (!piece) return []

  const moves = game.moves({ square: fromSq, verbose: true })
  return moves.map((m) => {
    const uci = `${m.from}${m.to}${m.promotion ?? ''}`
    return {
      from: m.from,
      to: m.to,
      san: m.san,
      uci,
      promotion: m.promotion,
    }
  })
}

export function isLegalPromotionMove(fen: Fen, from: string, to: string): boolean {
  return getLegalMovesFromSquare(fen, from).some((m) => m.to === to && m.promotion != null)
}

export function tryMove(fen: Fen, input: MoveInput): TryMoveResult {
  const game = createGame(fen)
  if (!game) return { ok: false, reason: 'invalid-fen' }

  const fromSq = parseSquare(input.from)
  const toSq = parseSquare(input.to)
  if (!fromSq || !toSq) return { ok: false, reason: 'invalid-square' }

  const move = game.move({
    from: fromSq,
    to: toSq,
    promotion: input.promotion ?? 'q',
  })

  if (move === null) return { ok: false, reason: 'illegal-move' }

  const nextFen = game.fen()
  const outcome = getOutcomeFromGame(game)
  const isGameOver = outcome.status !== 'ongoing'
  const uci = `${move.from}${move.to}${move.promotion ?? ''}`

  return {
    ok: true,
    nextFen,
    from: move.from,
    to: move.to,
    san: move.san,
    uci,
    isGameOver,
    outcome,
  }
}

