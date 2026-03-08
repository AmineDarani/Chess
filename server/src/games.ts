import { Chess } from 'chess.js'
import { nanoid } from 'nanoid'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export type GameResult =
  | { status: 'ongoing' }
  | { status: 'checkmate'; winner: 'w' | 'b' }
  | { status: 'stalemate' }
  | { status: 'draw'; reason?: string }
  | { status: 'resignation'; winner: 'w' | 'b' }
  | { status: 'timeout'; winner: 'w' | 'b' }

export type TimeControl = { initialMs: number; incrementMs: number }

export type GameState = {
  id: string
  fen: string
  moves: string[]
  whitePlayerId: string | null
  blackPlayerId: string | null
  result: GameResult
  timeControl: TimeControl | null
  whiteWantsRematch: boolean
  blackWantsRematch: boolean
  createdAt: number
}

export type ApplyMoveResult =
  | { ok: true; game: GameState; lastMove: { from: string; to: string } }
  | { ok: false; reason: 'game-not-found' | 'game-over' | 'not-player' | 'not-your-turn' | 'illegal-move' }

export type PlayerRole = 'white' | 'black' | 'spectator'

export type JoinResult = {
  game: GameState
  role: PlayerRole
  playerId: string
}

const games = new Map<string, GameState>()

export function createGame(
  timeControl?: TimeControl,
): { id: string; url: string; creatorPlayerId: string } {
  const id = nanoid(10)
  const creatorPlayerId = nanoid(12)
  const game: GameState = {
    id,
    fen: START_FEN,
    moves: [],
    whitePlayerId: creatorPlayerId,
    blackPlayerId: null,
    result: { status: 'ongoing' },
    timeControl: timeControl ?? null,
    whiteWantsRematch: false,
    blackWantsRematch: false,
    createdAt: Date.now(),
  }
  games.set(id, game)
  return { id, url: `/game/${id}`, creatorPlayerId }
}

export function getGame(id: string): GameState | null {
  return games.get(id) ?? null
}

export function joinGame(gameId: string, playerId?: string): JoinResult | null {
  const game = games.get(gameId)
  if (!game) return null

  const existingPlayerId = playerId ?? null

  if (existingPlayerId) {
    if (game.whitePlayerId === existingPlayerId) {
      return { game, role: 'white', playerId: existingPlayerId }
    }
    if (game.blackPlayerId === existingPlayerId) {
      return { game, role: 'black', playerId: existingPlayerId }
    }
  }

  const newPlayerId = existingPlayerId ?? nanoid(12)

  if (!game.whitePlayerId) {
    game.whitePlayerId = newPlayerId
    return { game, role: 'white', playerId: newPlayerId }
  }
  if (!game.blackPlayerId) {
    game.blackPlayerId = newPlayerId
    return { game, role: 'black', playerId: newPlayerId }
  }

  return { game, role: 'spectator', playerId: newPlayerId }
}

export function applyMove(
  gameId: string,
  playerId: string,
  from: string,
  to: string,
  promotion?: string,
): ApplyMoveResult {
  const game = games.get(gameId)
  if (!game) return { ok: false, reason: 'game-not-found' }
  if (game.result.status !== 'ongoing') return { ok: false, reason: 'game-over' }

  const isWhite = game.whitePlayerId === playerId
  const isBlack = game.blackPlayerId === playerId
  if (!isWhite && !isBlack) return { ok: false, reason: 'not-player' }

  const chess = new Chess(game.fen)
  const turn = chess.turn()
  const expectedPlayerIsWhite = turn === 'w'
  if (expectedPlayerIsWhite && !isWhite) return { ok: false, reason: 'not-your-turn' }
  if (!expectedPlayerIsWhite && !isBlack) return { ok: false, reason: 'not-your-turn' }

  const move = chess.move({
    from: from as `${string}${string}`,
    to: to as `${string}${string}`,
    promotion: (promotion ?? 'q') as 'q' | 'r' | 'b' | 'n',
  })
  if (move === null) return { ok: false, reason: 'illegal-move' }

  game.fen = chess.fen()
  game.moves.push(move.san)

  if (chess.isCheckmate()) {
    game.result = { status: 'checkmate', winner: chess.turn() === 'w' ? 'b' : 'w' }
  } else if (chess.isStalemate()) {
    game.result = { status: 'stalemate' }
  } else if (chess.isDraw()) {
    game.result = { status: 'draw', reason: 'draw' }
  }

  return {
    ok: true,
    game: { ...game },
    lastMove: { from: move.from, to: move.to },
  }
}

export function resign(gameId: string, playerId: string): GameState | null {
  const game = games.get(gameId)
  if (!game) return null
  if (game.result.status !== 'ongoing') return null

  const isWhite = game.whitePlayerId === playerId
  const isBlack = game.blackPlayerId === playerId
  if (!isWhite && !isBlack) return null

  const winner = isWhite ? 'b' : 'w'
  game.result = { status: 'resignation', winner }
  return { ...game }
}

export function requestRematch(gameId: string, playerId: string): { newGameId: string } | null {
  const game = games.get(gameId)
  if (!game) return null
  if (game.result.status === 'ongoing') return null
  if (!game.whitePlayerId || !game.blackPlayerId) return null

  const isWhite = game.whitePlayerId === playerId
  const isBlack = game.blackPlayerId === playerId
  if (!isWhite && !isBlack) return null

  if (isWhite) game.whiteWantsRematch = true
  else game.blackWantsRematch = true

  if (game.whiteWantsRematch && game.blackWantsRematch) {
    const newId = nanoid(10)
    const newGame: GameState = {
      id: newId,
      fen: START_FEN,
      moves: [],
      whitePlayerId: game.whitePlayerId,
      blackPlayerId: game.blackPlayerId,
      result: { status: 'ongoing' },
      timeControl: game.timeControl,
      whiteWantsRematch: false,
      blackWantsRematch: false,
      createdAt: Date.now(),
    }
    games.set(newId, newGame)
    game.whiteWantsRematch = false
    game.blackWantsRematch = false
    return { newGameId: newId }
  }
  return null
}

export function flag(gameId: string, playerId: string): GameState | null {
  const game = games.get(gameId)
  if (!game) return null
  if (game.result.status !== 'ongoing') return null
  if (!game.timeControl) return null

  const isWhite = game.whitePlayerId === playerId
  const isBlack = game.blackPlayerId === playerId
  if (!isWhite && !isBlack) return null

  const winner = isWhite ? 'b' : 'w'
  game.result = { status: 'timeout', winner }
  return { ...game }
}

export function isValidGameId(id: string): boolean {
  return /^[A-Za-z0-9_-]{10,}$/.test(id)
}
