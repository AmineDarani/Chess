import { useCallback, useEffect, useState } from 'react'
import { Chessboard, type SquareHandlerArgs } from 'react-chessboard'
import { Link, useNavigate, useParams } from 'react-router-dom'
import '../App.css'
import {
  joinGame,
  getStoredPlayerId,
  setStoredPlayerId,
  type GameState,
  type PlayerRole,
} from '../api/games'
import ChatPanel from '../components/ChatPanel/ChatPanel'
import ClockPanel from '../components/ClockPanel/ClockPanel'
import MoveHistoryPanel from '../components/MoveHistoryPanel/MoveHistoryPanel'
import PromotionModal from '../components/PromotionModal/PromotionModal'
import ResultModal from '../components/Modal/ResultModal'
import { useBoardHighlight } from '../hooks/useBoardHighlight'
import { useHumanClock } from '../hooks/useHumanClock'
import { useMoveHistory } from '../hooks/useMoveHistory'
import { useOnlineGameSocket } from '../hooks/useOnlineGameSocket'
import { usePieceDropHandler } from '../hooks/usePieceDropHandler'
import { buildHistoryFromMoves, formatGameResult, getLegalMovesFromSquare, getTurn } from '../utils/chess'
import type { ReviewGameState } from './ReviewPage'

type Status = 'loading' | 'error' | 'ready'

let joinInProgressForGame: string | null = null

export default function OnlineGamePage() {
  const { id } = useParams<{ id: string }>()
  const shareUrl = typeof window !== 'undefined' && id ? `${window.location.origin}/game/${id}` : ''
  const [status, setStatus] = useState<Status>('loading')
  const [copied, setCopied] = useState(false)
  const [game, setGame] = useState<GameState | null>(null)
  const [role, setRole] = useState<PlayerRole | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')

  const copyLink = () => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  useEffect(() => {
    if (!id) return
    if (joinInProgressForGame === id) return
    joinInProgressForGame = id
    const storedPlayerId = getStoredPlayerId(id)
    joinGame(id, storedPlayerId)
      .then((result) => {
        setGame(result.game)
        setRole(result.role)
        setPlayerId(result.playerId)
        setStoredPlayerId(id, result.playerId)
        setStatus('ready')
      })
      .catch((err: Error) => {
        setStatus('error')
        setErrorMessage(err.message === 'Game not found' ? 'Game not found' : 'Invalid game ID')
      })
      .finally(() => {
        if (joinInProgressForGame === id) joinInProgressForGame = null
      })
  }, [id])

  if (!id) {
    return (
      <div className="online-game-page">
        <div className="online-game-error">
          <h2>Game unavailable</h2>
          <p>Invalid game ID</p>
          <Link to="/">← Back</Link>
        </div>
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <div className="online-game-page">
        <div className="online-game-loading">Loading…</div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="online-game-page">
        <div className="online-game-error">
          <h2>Game unavailable</h2>
          <p>{errorMessage}</p>
          <Link to="/">← Back</Link>
        </div>
      </div>
    )
  }

  if (!game) return null

  return (
    <OnlineGameContent
      key={game.id}
      game={game}
      role={role}
      playerId={playerId}
      shareUrl={shareUrl}
      copied={copied}
      copyLink={copyLink}
    />
  )
}

type OnlineGameContentProps = {
  game: GameState
  role: PlayerRole | null
  playerId: string | null
  shareUrl: string
  copied: boolean
  copyLink: () => void
}

function OnlineGameContent({
  game,
  role,
  playerId,
  shareUrl,
  copied,
  copyLink,
}: OnlineGameContentProps) {
  const navigate = useNavigate()
  const handleRematchReady = useCallback(
    (newGameId: string) => {
      if (playerId) setStoredPlayerId(newGameId, playerId)
      navigate(`/game/${newGameId}`, { replace: true })
    },
    [navigate, playerId],
  )

  const { fen, moves, sendMove, sendResign, sendFlag, requestRematch, sendChat, canMove, result, messages, opponentJoined, timeControl, whiteTimeMs, blackTimeMs } =
    useOnlineGameSocket(
      game.id,
      playerId,
      role,
      game.fen,
      game.moves,
      game.result,
      game.timeControl ?? null,
      handleRematchReady,
    )

  const gameOverText = formatGameResult(result)
  const isGameOver = !!gameOverText

  const turn = getTurn(fen)
  const whiteToMove = turn === 'w'
  const blackToMove = turn === 'b'
  const gameReady = opponentJoined
  const isTimedMode = !!timeControl && timeControl.initialMs > 0
  const tcForClock = timeControl
    ? {
        id: 'online',
        label: `${Math.floor(timeControl.initialMs / 60000)}|${timeControl.incrementMs / 1000}`,
        initialMs: timeControl.initialMs,
        incrementMs: timeControl.incrementMs,
      }
    : null

  const whiteClock = useHumanClock({
    timeControl: tcForClock ?? { id: 'none', label: '—', initialMs: 0, incrementMs: 0 },
    isRunning:
      isTimedMode &&
      gameReady &&
      whiteToMove &&
      !isGameOver,
    onFlag: () => role === 'white' && sendFlag(),
    serverTimeMs: whiteTimeMs,
  })

  const blackClock = useHumanClock({
    timeControl: tcForClock ?? { id: 'none', label: '—', initialMs: 0, incrementMs: 0 },
    isRunning:
      isTimedMode &&
      gameReady &&
      blackToMove &&
      !isGameOver,
    onFlag: () => role === 'black' && sendFlag(),
    serverTimeMs: blackTimeMs,
  })

  const history = buildHistoryFromMoves(moves)
  const moveHistory = useMoveHistory({
    history,
    liveFen: fen,
    canHumanMove: canMove,
    shouldSnapToHead: true,
  })
  const boardFen = moveHistory.viewFen
  const boardLastMoveSquares = moveHistory.lastMoveSquares
  const allowDragging = moveHistory.allowDragging

  const boardHighlight = useBoardHighlight({
    getLegalMoves: (square) =>
      getLegalMovesFromSquare(boardFen, square).map((m) => m.to),
    canHighlight: () => allowDragging,
    includeSelectedSquare: false,
  })

  const pieceDrop = usePieceDropHandler({
    fen: boardFen,
    applyMove: sendMove,
    clearHighlight: boardHighlight.clearMoveSquares,
  })

  const handleMouseOverSquare = ({ square }: SquareHandlerArgs) => {
    boardHighlight.highlightMovesForSquare(square)
  }

  const squareStyles = { ...boardLastMoveSquares, ...boardHighlight.moveSquares }

  const hintText = isGameOver
    ? gameOverText
    : role === 'spectator'
      ? 'You can watch the game but cannot move.'
      : canMove
        ? 'Your turn.'
        : role === 'white'
          ? 'Waiting for Black to move.'
          : 'Waiting for White to move.'

  return (
    <div className="online-game-page">
      <div className="online-game-header">
        <Link to="/">← Back</Link>
        <span className="online-game-id">Game {game.id}</span>
        {!isGameOver && role !== 'spectator' && (
          <button type="button" className="online-game-resign" onClick={sendResign}>
            Resign
          </button>
        )}
        <button
          type="button"
          className="online-game-copy"
          onClick={copyLink}
          disabled={!shareUrl}
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>
      <div className="online-game-role">
        {role === 'white' && 'You play as White'}
        {role === 'black' && 'You play as Black'}
        {role === 'spectator' && 'Spectator — viewing only'}
      </div>
      {isTimedMode && (
        <div className="online-game-clocks">
          <ClockPanel
            label="White"
            clockText={whiteClock.formatted}
            isActive={gameReady && whiteToMove && !isGameOver}
            variant="online"
          />
          <ClockPanel
            label="Black"
            clockText={blackClock.formatted}
            isActive={gameReady && blackToMove && !isGameOver}
            variant="online"
          />
        </div>
      )}
      <div className="online-game-content-row">
        <div className="online-game-board-column">
          <MoveHistoryPanel
            formattedMoveList={moveHistory.formattedMoveList}
            canStepBack={moveHistory.canStepBack}
            canStepForward={moveHistory.canStepForward}
            canUndo={false}
            onStepBack={moveHistory.stepBack}
            onStepForward={moveHistory.stepForward}
          />
          <div className="online-game-board-wrapper" style={{ position: 'relative' }}>
            <Chessboard
              options={{
                position: boardFen,
                boardOrientation: role === 'black' ? 'black' : 'white',
                allowDragging,
                onPieceDrop: pieceDrop.handlePieceDrop,
                onMouseOverSquare: handleMouseOverSquare,
                onMouseOutSquare: boardHighlight.clearMoveSquares,
                squareStyles,
                boardStyle: { width: '100%', aspectRatio: '1' },
              }}
            />
            {pieceDrop.pendingPromotion && (
              <PromotionModal
                isWhite={pieceDrop.pendingPromotion.isWhite}
                onSelect={pieceDrop.handlePromotionSelect}
              />
            )}
          </div>
        </div>
        <ChatPanel
          messages={messages}
          onSend={sendChat}
          disabled={role === 'spectator'}
        />
      </div>
      <p className="online-game-hint">{hintText}</p>

      <ResultModal
        open={isGameOver}
        title={gameOverText}
        icon={
          gameOverText &&
          !gameOverText.toLowerCase().includes('draw') &&
          !gameOverText.toLowerCase().includes('stalemate')
            ? 'crown'
            : undefined
        }
        primaryActionText="Rematch"
        onPrimaryAction={requestRematch}
        secondaryActionText="Menu"
        onSecondaryAction={() => navigate('/')}
        tertiaryActionText="Review"
        onTertiaryAction={() =>
          navigate('/review', {
            state: {
              history,
              gameOverText,
              source: 'vs-player',
            } satisfies ReviewGameState,
          })
        }
      />
    </div>
  )
}
