import { Chessboard, type SquareHandlerArgs } from 'react-chessboard'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import '../App.css'
import PromotionModal from '../components/PromotionModal/PromotionModal'
import { usePieceDropHandler } from '../hooks/usePieceDropHandler'
import { STOCKFISH_STRONGEST } from '../services/engine'
import {
  TIME_CONTROLS,
  type TimeControl,
} from '../hooks/useHumanClock'
import { useVsStockfish } from '../hooks/useVsStockfish'
import MoveHistoryPanel from '../components/MoveHistoryPanel/MoveHistoryPanel'
import ResultModal from '../components/Modal/ResultModal'
import type { ReviewGameState } from './ReviewPage'

function humanWonVsBot(result: string): boolean {
  return /^You win/.test(result)
}

type VsBotLocationState = {
  timeControl?: TimeControl
}

export default function VsStockfishPage() {
  const location = useLocation()
  const state = (location.state as VsBotLocationState | null) ?? {}
  const timeControl = state.timeControl ?? TIME_CONTROLS[1]

  const navigate = useNavigate()
  const {
    fen,
    history,
    gameOverText,
    lastMoveSquares,
    moveSquares,
    highlightMovesForSquare,
    clearMoveSquares,
    applyHumanMove,
    resign,
    reset,
    dismissResult,
    undo,
    canUndo,
    isAiThinking,
    canHumanMove,
    hasGameStarted,
    isTimedMode,
    humanClockText,
    scoreText,
    modalVisible,
    formattedMoveList,
    canStepBack,
    canStepForward,
    stepBack,
    stepForward,
    allowDragging,
  } = useVsStockfish({ timeControl })

  const pieceDrop = usePieceDropHandler({
    fen,
    applyMove: applyHumanMove,
    clearHighlight: clearMoveSquares,
  })

  const handleMouseOverSquare = ({ square }: SquareHandlerArgs) => {
    highlightMovesForSquare(square)
  }

  return (
    <div className="vs-stockfish-layout">
      <aside className="vs-stockfish-sidebar">
        <div className="vs-stockfish-clock-panel">
          <div
            className={`vs-stockfish-clock-value ${isTimedMode && hasGameStarted && canHumanMove ? 'vs-stockfish-clock-active' : ''}`}
          >
            {isTimedMode ? humanClockText : '—'}
          </div>
          <div className="vs-stockfish-clock-hint">
            {!hasGameStarted ? '—' : canHumanMove ? 'You' : '…'}
          </div>
        </div>
      </aside>

      <div className="vs-stockfish-main">
        <div className="vs-page-controls">
          <Link to="/">← Back</Link>
          <button onClick={resign} disabled={isAiThinking}>Resign</button>
        </div>

        <MoveHistoryPanel
          formattedMoveList={formattedMoveList}
          canStepBack={canStepBack}
          canStepForward={canStepForward}
          canUndo={canUndo}
          onStepBack={stepBack}
          onStepForward={stepForward}
          onUndo={undo}
        />

        <div className="vs-stockfish-board-wrapper" style={{ position: 'relative' }}>
          <Chessboard
            options={{
              position: fen,
              boardOrientation: 'white',
              allowDragging,
              onPieceDrop: pieceDrop.handlePieceDrop,
              onMouseOverSquare: handleMouseOverSquare,
              onMouseOutSquare: clearMoveSquares,
              squareStyles: { ...lastMoveSquares, ...moveSquares },
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

        <ResultModal
          open={gameOverText !== null && modalVisible}
          title={gameOverText ?? 'Game over'}
          scoreText={scoreText}
          icon={
            gameOverText
              ? humanWonVsBot(gameOverText)
                ? 'crown'
                : gameOverText.toLowerCase().includes('draw')
                  ? undefined
                  : 'sad'
              : undefined
          }
          primaryActionText="Rematch"
          onPrimaryAction={reset}
          secondaryActionText="Menu"
          onSecondaryAction={() => navigate('/')}
          tertiaryActionText="Review"
          onTertiaryAction={() =>
            navigate('/review', {
              state: {
                history,
                gameOverText: gameOverText ?? 'Game over',
                source: 'vs-bot',
              } satisfies ReviewGameState,
            })
          }
          onClose={dismissResult}
        />
      </div>
    </div>
  )
}
