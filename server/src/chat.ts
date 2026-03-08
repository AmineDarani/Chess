import { nanoid } from 'nanoid'

const joinAnnounced = new Map<string, Set<string>>()

export type ChatMessage = {
  id: string
  type: 'user' | 'system'
  role?: 'white' | 'black'
  text: string
  ts: number
}

const gameChat = new Map<string, ChatMessage[]>()

const MAX_MESSAGES = 100

export function addChatMessage(
  gameId: string,
  msg: Omit<ChatMessage, 'id' | 'ts'>,
): ChatMessage {
  const list = gameChat.get(gameId) ?? []
  const full: ChatMessage = {
    ...msg,
    id: nanoid(8),
    ts: Date.now(),
  }
  list.push(full)
  if (list.length > MAX_MESSAGES) list.shift()
  gameChat.set(gameId, list)
  return full
}

export function getChatMessages(gameId: string): ChatMessage[] {
  return gameChat.get(gameId) ?? []
}

export function maybeAnnounceJoin(
  gameId: string,
  playerId: string,
  role: 'white' | 'black',
): ChatMessage | null {
  const set = joinAnnounced.get(gameId) ?? new Set()
  if (set.has(playerId)) return null
  set.add(playerId)
  joinAnnounced.set(gameId, set)
  const text =
    role === 'white' ? 'White created the game' : 'Black joined the game'
  return addChatMessage(gameId, { type: 'system', text })
}
