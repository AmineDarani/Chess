import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { getTurn, LAST_MOVE_FROM, LAST_MOVE_TO } from '../utils/chess'
import type { GameResult, PlayerRole } from '../api/games'
import type { ChatMessage } from '../components/ChatPanel/ChatPanel'

type GameUpdate = {
  fen: string
  moves: string[]
  lastMove?: { from: string; to: string }
  result?: GameResult
  timeControl?: { initialMs: number; incrementMs: number } | null
  whitePlayerId?: string | null
  blackPlayerId?: string | null
  whiteTimeMs?: number | null
  blackTimeMs?: number | null
}

export function useOnlineGameSocket(
  gameId: string | undefined,
  playerId: string | null,
  role: PlayerRole | null,
  initialFen: string,
  initialMoves: string[],
  initialResult?: GameResult,
  initialTimeControl?: { initialMs: number; incrementMs: number } | null,
  onRematchReady?: (newGameId: string) => void,
) {
  const socketRef = useRef<Socket | null>(null)
  const [fen, setFen] = useState(initialFen)
  const [moves, setMoves] = useState(initialMoves)
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [result, setResult] = useState<GameResult | undefined>(initialResult)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [connected, setConnected] = useState(false)
  const [opponentJoined, setOpponentJoined] = useState(false)
  const [timeControl, setTimeControl] = useState<{ initialMs: number; incrementMs: number } | null>(
    initialTimeControl ?? null,
  )
  const [whiteTimeMs, setWhiteTimeMs] = useState<number | null>(null)
  const [blackTimeMs, setBlackTimeMs] = useState<number | null>(null)
  const onRematchReadyRef = useRef(onRematchReady)
  onRematchReadyRef.current = onRematchReady

  useEffect(() => {
    if (!gameId || !playerId || !role) return

    const url = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : '')
    const socket = io(url, { path: '/socket.io', transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join-game', { gameId, playerId })
    })

    socket.on('disconnect', () => setConnected(false))

    const applyUpdate = (payload: GameUpdate) => {
      setFen(payload.fen)
      setMoves(payload.moves ?? [])
      setLastMove(payload.lastMove ?? null)
      if (payload.result) setResult(payload.result)
      if (payload.timeControl !== undefined) setTimeControl(payload.timeControl ?? null)
      if (payload.whitePlayerId && payload.blackPlayerId) setOpponentJoined(true)
      if (payload.whiteTimeMs !== undefined) setWhiteTimeMs(payload.whiteTimeMs ?? null)
      if (payload.blackTimeMs !== undefined) setBlackTimeMs(payload.blackTimeMs ?? null)
    }

    socket.on('game-state', (payload: GameUpdate & { chat?: ChatMessage[]; timeControl?: { initialMs: number; incrementMs: number } | null; whitePlayerId?: string | null; blackPlayerId?: string | null }) => {
      applyUpdate(payload)
      if (payload.chat) setMessages(payload.chat)
      if (payload.timeControl !== undefined) setTimeControl(payload.timeControl ?? null)
      if (payload.whitePlayerId && payload.blackPlayerId) setOpponentJoined(true)
    })
    socket.on('game-update', applyUpdate)
    socket.on('chat-message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg])
    })
    socket.on('opponent-joined', () => setOpponentJoined(true))

    socket.on('rematch-ready', (payload: { newGameId: string }) => {
      const id = payload?.newGameId
      if (typeof id === 'string') onRematchReadyRef.current?.(id)
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('game-state')
      socket.off('game-update')
      socket.off('chat-message')
      socket.off('opponent-joined')
      socket.off('rematch-ready')
      socket.disconnect()
      socketRef.current = null
    }
  }, [gameId, playerId, role])

  const sendMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      if (!gameId || !playerId || !socketRef.current?.connected) return
      socketRef.current.emit('move', { gameId, playerId, from, to, promotion })
    },
    [gameId, playerId],
  )

  const sendResign = useCallback(() => {
    if (!gameId || !playerId || !socketRef.current?.connected) return
    socketRef.current.emit('resign', { gameId, playerId })
  }, [gameId, playerId])

  const requestRematch = useCallback(() => {
    if (!gameId || !playerId || !socketRef.current?.connected) return
    socketRef.current.emit('rematch-request', { gameId, playerId })
  }, [gameId, playerId])

  const sendFlag = useCallback(() => {
    if (!gameId || !playerId || !socketRef.current?.connected) return
    socketRef.current.emit('flag', { gameId, playerId })
  }, [gameId, playerId])

  const sendChat = useCallback(
    (text: string) => {
      if (!gameId || !playerId || !socketRef.current?.connected) return
      if (role !== 'white' && role !== 'black') return
      socketRef.current.emit('chat-send', { gameId, playerId, text, role })
    },
    [gameId, playerId, role],
  )

  const turn = getTurn(fen)
  const isOngoing = !result || result.status === 'ongoing'
  const isMyTurn =
    isOngoing && (role === 'white' && turn === 'w' ? true : role === 'black' && turn === 'b' ? true : false)
  const canMove = role !== 'spectator' && isMyTurn

  const lastMoveSquares: Record<string, React.CSSProperties> = lastMove
    ? {
        [lastMove.from]: LAST_MOVE_FROM,
        [lastMove.to]: LAST_MOVE_TO,
      }
    : {}

  return {
    fen,
    moves,
    lastMoveSquares,
    sendMove,
    sendResign,
    sendFlag,
    requestRematch,
    sendChat,
    canMove,
    connected,
    result,
    messages,
    opponentJoined,
    timeControl,
    whiteTimeMs,
    blackTimeMs,
  }
}
