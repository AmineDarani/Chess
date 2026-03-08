const API_BASE = import.meta.env.VITE_API_URL || '/api'

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
  result?: GameResult
  timeControl?: TimeControl | null
  whiteTimeMs?: number | null
  blackTimeMs?: number | null
}

export type PlayerRole = 'white' | 'black' | 'spectator'

export type JoinResult = {
  game: GameState
  role: PlayerRole
  playerId: string
}

const PLAYER_STORAGE_KEY = 'chess-online-player'

export function getStoredPlayerId(gameId: string): string | null {
  try {
    const data = sessionStorage.getItem(PLAYER_STORAGE_KEY)
    if (!data) return null
    const parsed = JSON.parse(data) as Record<string, string>
    return parsed[gameId] ?? null
  } catch {
    return null
  }
}

export function setStoredPlayerId(gameId: string, playerId: string): void {
  try {
    const data = sessionStorage.getItem(PLAYER_STORAGE_KEY)
    const parsed = (data ? JSON.parse(data) : {}) as Record<string, string>
    parsed[gameId] = playerId
    sessionStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(parsed))
  } catch {
    /* ignore */
  }
}

export async function createGame(timeControl?: {
  initialMs: number
  incrementMs: number
}): Promise<{
  id: string
  url: string
  creatorPlayerId: string
}> {
  const res = await fetch(`${API_BASE}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(timeControl ? { timeControl } : {}),
  })
  if (!res.ok) throw new Error('Failed to create game')
  return res.json()
}

export async function getGame(id: string): Promise<GameState> {
  const res = await fetch(`${API_BASE}/games/${id}`)
  if (res.status === 404) throw new Error('Game not found')
  if (res.status === 400) throw new Error('Invalid game ID')
  if (!res.ok) throw new Error('Failed to load game')
  return res.json()
}

export async function joinGame(id: string, playerId?: string | null): Promise<JoinResult> {
  const res = await fetch(`${API_BASE}/games/${id}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: playerId ?? undefined }),
  })
  if (res.status === 404) throw new Error('Game not found')
  if (res.status === 400) throw new Error('Invalid game ID')
  if (!res.ok) throw new Error('Failed to join game')
  return res.json()
}
