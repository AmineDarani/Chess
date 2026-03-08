import { createServer } from 'http'
import express from 'express'
import { Server } from 'socket.io'
import cors from 'cors'
import { addChatMessage, getChatMessages, maybeAnnounceJoin } from './chat.js'
import {
  applyMove,
  createGame,
  flag,
  getGame,
  joinGame,
  isValidGameId,
  requestRematch,
  resign,
} from './games.js'

const app = express()
const httpServer = createServer(app)
const PORT = process.env.PORT ?? 3001

const io = new Server(httpServer, {
  cors: { origin: '*' },
  path: '/socket.io',
})

app.use(cors())
app.use(express.json())

app.post('/games', (req, res) => {
  const body = req.body ?? {}
  const tc = body.timeControl
  const timeControl =
    tc && typeof tc.initialMs === 'number' && typeof tc.incrementMs === 'number'
      ? { initialMs: tc.initialMs, incrementMs: tc.incrementMs }
      : undefined
  const { id, url, creatorPlayerId } = createGame(timeControl)
  res.status(201).json({ id, url, creatorPlayerId })
})

app.get('/games/:id', (req, res) => {
  const { id } = req.params
  if (!isValidGameId(id)) {
    res.status(400).json({ error: 'Invalid game ID' })
    return
  }
  const game = getGame(id)
  if (!game) {
    res.status(404).json({ error: 'Game not found' })
    return
  }
  res.json({
    id: game.id,
    fen: game.fen,
    moves: game.moves,
    whitePlayerId: game.whitePlayerId,
    blackPlayerId: game.blackPlayerId,
    result: game.result,
    timeControl: game.timeControl,
  })
})

app.post('/games/:id/join', (req, res) => {
  const { id } = req.params
  if (!isValidGameId(id)) {
    res.status(400).json({ error: 'Invalid game ID' })
    return
  }
  const { playerId } = req.body ?? {}
  const result = joinGame(id, typeof playerId === 'string' ? playerId : undefined)
  if (!result) {
    res.status(404).json({ error: 'Game not found' })
    return
  }
  res.json({
    game: {
      id: result.game.id,
      fen: result.game.fen,
      moves: result.game.moves,
      whitePlayerId: result.game.whitePlayerId,
      blackPlayerId: result.game.blackPlayerId,
      result: result.game.result,
      timeControl: result.game.timeControl,
    },
    role: result.role,
    playerId: result.playerId,
  })
  if (result.role === 'black') {
    const g = getGame(id)
    if (g) {
      io.to(`game:${id}`).emit('game-update', {
        fen: g.fen,
        moves: g.moves,
        lastMove: undefined,
        result: g.result,
        timeControl: g.timeControl,
        whitePlayerId: g.whitePlayerId,
        blackPlayerId: g.blackPlayerId,
      })
    }
    io.to(`game:${id}`).emit('opponent-joined', { gameId: id })
  }
})

io.on('connection', (socket) => {
  socket.on('join-game', (payload: { gameId: string; playerId: string }) => {
    const { gameId, playerId } = payload ?? {}
    if (typeof gameId !== 'string' || typeof playerId !== 'string') return
    if (!isValidGameId(gameId)) return
    const game = getGame(gameId)
    if (!game) return
    const room = `game:${gameId}`
    socket.join(room)
    socket.data.gameId = gameId
    socket.data.playerId = playerId
    const role =
      game.whitePlayerId === playerId
        ? ('white' as const)
        : game.blackPlayerId === playerId
          ? ('black' as const)
          : null
    if (role) {
      const joinMsg = maybeAnnounceJoin(gameId, playerId, role)
      if (joinMsg) io.to(room).emit('chat-message', joinMsg)
    }
    socket.emit('game-state', {
      fen: game.fen,
      moves: game.moves,
      lastMove: undefined,
      result: game.result,
      timeControl: game.timeControl,
      whitePlayerId: game.whitePlayerId,
      blackPlayerId: game.blackPlayerId,
      chat: getChatMessages(gameId),
    })
  })

  socket.on(
    'move',
    (payload: { gameId: string; playerId: string; from: string; to: string; promotion?: string }) => {
      const { gameId, playerId, from, to, promotion } = payload ?? {}
      if (
        typeof gameId !== 'string' ||
        typeof playerId !== 'string' ||
        typeof from !== 'string' ||
        typeof to !== 'string'
      )
        return
      if (!isValidGameId(gameId)) return
      const result = applyMove(gameId, playerId, from, to, promotion)
      if (!result.ok) {
        socket.emit('move-rejected', { reason: result.reason })
        return
      }
      const room = `game:${gameId}`
      const updatePayload = {
        fen: result.game.fen,
        moves: result.game.moves,
        lastMove: result.lastMove,
        result: result.game.result,
        timeControl: result.game.timeControl,
        whitePlayerId: result.game.whitePlayerId,
        blackPlayerId: result.game.blackPlayerId,
      }
      io.to(room).emit('game-update', updatePayload)
      if (result.game.result.status !== 'ongoing') {
        const res = result.game.result
        const text =
          res.status === 'checkmate'
            ? `${res.winner === 'w' ? 'White' : 'Black'} wins by checkmate!`
            : res.status === 'resignation'
              ? `${res.winner === 'w' ? 'White' : 'Black'} wins by resignation!`
              : res.status === 'timeout'
                ? `${res.winner === 'w' ? 'White' : 'Black'} wins on time!`
                : res.status === 'stalemate'
                  ? 'Draw by stalemate'
                  : 'Draw'
        const sys = addChatMessage(gameId, { type: 'system', text })
        io.to(room).emit('chat-message', sys)
      }
    },
  )

  socket.on('resign', (payload: { gameId: string; playerId: string }) => {
    const { gameId, playerId } = payload ?? {}
    if (typeof gameId !== 'string' || typeof playerId !== 'string') return
    if (!isValidGameId(gameId)) return
    const updated = resign(gameId, playerId)
    if (updated) {
      const room = `game:${gameId}`
      io.to(room).emit('game-update', {
        fen: updated.fen,
        moves: updated.moves,
        lastMove: undefined,
        result: updated.result,
        timeControl: updated.timeControl,
      })
      const winner =
        updated.result.status === 'resignation'
          ? updated.result.winner === 'w'
            ? 'White'
            : 'Black'
          : null
      const text = winner ? `${winner} wins by resignation!` : 'Game over'
      const sys = addChatMessage(gameId, { type: 'system', text })
      io.to(room).emit('chat-message', sys)
    }
  })

  socket.on(
    'chat-send',
    (payload: { gameId: string; playerId: string; text: string; role: 'white' | 'black' }) => {
      const { gameId, playerId, text, role } = payload ?? {}
      if (
        typeof gameId !== 'string' ||
        typeof playerId !== 'string' ||
        typeof text !== 'string' ||
        typeof role !== 'string'
      )
        return
      if (!isValidGameId(gameId)) return
      const game = getGame(gameId)
      if (!game) return
      const isWhite = game.whitePlayerId === playerId
      const isBlack = game.blackPlayerId === playerId
      if (!isWhite && !isBlack) return
      const trimmed = text.trim().slice(0, 500)
      if (!trimmed) return
      const msg = addChatMessage(gameId, { type: 'user', role, text: trimmed })
      const room = `game:${gameId}`
      io.to(room).emit('chat-message', msg)
    },
  )

  socket.on('flag', (payload: { gameId: string; playerId: string }) => {
    const { gameId, playerId } = payload ?? {}
    if (typeof gameId !== 'string' || typeof playerId !== 'string') return
    if (!isValidGameId(gameId)) return
    const updated = flag(gameId, playerId)
    if (updated) {
      const room = `game:${gameId}`
      io.to(room).emit('game-update', {
        fen: updated.fen,
        moves: updated.moves,
        lastMove: undefined,
        result: updated.result,
      })
      const winner =
        updated.result.status === 'timeout'
          ? updated.result.winner === 'w'
            ? 'White'
            : 'Black'
          : null
      const text = winner ? `${winner} wins on time!` : 'Game over'
      const sys = addChatMessage(gameId, { type: 'system', text })
      io.to(room).emit('chat-message', sys)
    }
  })

  socket.on('rematch-request', (payload: { gameId: string; playerId: string }) => {
    const { gameId, playerId } = payload ?? {}
    if (typeof gameId !== 'string' || typeof playerId !== 'string') return
    if (!isValidGameId(gameId)) return
    const rematch = requestRematch(gameId, playerId)
    if (rematch) {
      const room = `game:${gameId}`
      io.to(room).emit('rematch-ready', { newGameId: rematch.newGameId })
    }
  })

  socket.on('disconnect', () => {
    socket.data.gameId = undefined
    socket.data.playerId = undefined
  })
})

httpServer.listen(PORT, () => {
  console.log(`Chess server on http://localhost:${PORT}`)
})
