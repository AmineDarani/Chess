import { useState } from 'react'
import { Chessboard, type SquareHandlerArgs } from 'react-chessboard'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import '../App.css'
import ClockPanel from '../components/ClockPanel/ClockPanel'
import PromotionModal from '../components/PromotionModal/PromotionModal'
import { TIME_CONTROLS, type TimeControl } from '../hooks/useHumanClock'
import { usePieceDropHandler } from '../hooks/usePieceDropHandler'
import { useVsPlayer } from '../hooks/useVsPlayer'
import MoveHistoryPanel from '../components/MoveHistoryPanel/MoveHistoryPanel'
import ResultModal from '../components/Modal/ResultModal'
import type { ReviewGameState } from './ReviewPage'

type VsPlayerLocationState = {
  timeControl?: TimeControl
}

export default function VsPlayerPage() {
  const location = useLocation()
  const state = (location.state as VsPlayerLocationState | null) ?? {}
  const timeControl = state.timeControl ?? TIME_CONTROLS[0]

  const navigate = useNavigate()
  const {
    fen,
    history,
    orientation,
    gameOverText,
    lastMoveSquares,
    moveSquares,
    highlightMovesForSquare,
    clearMoveSquares,
    applyMove,
    resign,
    reset,
    dismissResult,
    undo,
    canUndo,
    scoreText,
    topPlayerName,
    bottomPlayerName,
    topClockText,
    bottomClockText,
    topClockActive,
    bottomClockActive,
    modalVisible,
    formattedMoveList,
    canStepBack,
    canStepForward,
    stepBack,
    stepForward,
    allowDragging,
  } = useVsPlayer({ timeControl })

  const pieceDrop = usePieceDropHandler({
    fen,
    applyMove,
    clearHighlight: clearMoveSquares,
  })

  const handleMouseOverSquare = ({ square }: SquareHandlerArgs) => {
    highlightMovesForSquare(square)
  }

  return (
    <div className="vs-player-layout">
      <div className="vs-player-board-section">
        <div className="vs-player-score-bar">
          <span className="vs-player-score-text">{scoreText}</span>
        </div>


        <ClockPanel
          label={bottomPlayerName}
          clockText={bottomClockText}
          isActive={bottomClockActive}
          isTop={false}
          variant="vs-player"
        />

        <div className="vs-player-main">
          <div className="vs-page-controls">
            <Link to="/">← Back</Link>
            <button onClick={resign}>Resign</button>
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

          <div className="vs-player-board-wrapper" style={{ position: 'relative' }}>
            <Chessboard
              options={{
                position: fen,
                boardOrientation: orientation,
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
        </div>

        <ClockPanel
          label={topPlayerName}
          clockText={topClockText}
          isActive={topClockActive}
          isTop
          variant="vs-player"
        />

      </div>

      <ResultModal
        open={gameOverText !== null && modalVisible}
        title={gameOverText ?? 'Game over'}
        scoreText={scoreText}
        icon={
          gameOverText &&
          !gameOverText.toLowerCase().includes('draw')
            ? 'crown'
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
              source: 'vs-player',
            } satisfies ReviewGameState,
          })
        }
        onClose={dismissResult}
      />
    </div>
  )
}
