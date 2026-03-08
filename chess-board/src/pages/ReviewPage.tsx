import { useEffect, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import type { MoveRecord } from '../game/types'
import { useReviewGame } from '../hooks/useReviewGame'
import EvaluationBar from '../components/EvaluationBar/EvaluationBar'
import BestMovesPanel from '../components/BestMovesPanel/BestMovesPanel'
import ReviewMoveList from '../components/ReviewMoveList/ReviewMoveList'
import EvaluationGraph from '../components/EvaluationGraph/EvaluationGraph'
import MoveClassOverlay from '../components/MoveClassOverlay/MoveClassOverlay'
import '../App.css'

export type ReviewGameState = {
  history: MoveRecord[]
  gameOverText: string
  source: 'vs-player' | 'vs-bot' | 'pgn'
}

export default function ReviewPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as ReviewGameState | null
  const history = state?.history ?? []

  const {
    viewFen,
    lastMoveSquares,
    viewIndex,
    currentEval,
    moveClassifications,
    effectiveHistory,
    evals,
    loadingEvals,
    canStepBack,
    canStepForward,
    stepBack,
    stepForward,
    goToPly,
  } = useReviewGame({ history })

  const [showMoveIcons, setShowMoveIcons] = useState(() => {
    try {
      return localStorage.getItem('review-show-move-icons') !== 'false'
    } catch {
      return true
    }
  })

  useEffect(() => {
    if (!state?.history?.length) {
      navigate('/', { replace: true })
    }
  }, [state, navigate])

  const toggleMoveIcons = () => {
    setShowMoveIcons((prev) => {
      const next = !prev
      try {
        localStorage.setItem('review-show-move-icons', String(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }

  if (!state?.history?.length) {
    return (
      <div className="review-layout">
        <p>Redirecting…</p>
      </div>
    )
  }

  const currentMoveClass =
    viewIndex > 0 ? moveClassifications.get(viewIndex) ?? null : null
  const lastMoveTo =
    viewIndex > 0 && effectiveHistory[viewIndex - 1]
      ? effectiveHistory[viewIndex - 1].to
      : null

  return (
    <div className="review-layout">
      <div className="review-main">
        <div className="review-controls">
          <Link to="/">← Back</Link>
        </div>

        <div className="review-result-banner">{state.gameOverText}</div>

        <div className="review-content-row">
          <div className="review-board-section">
            <div className="review-board-row">
              <div className="review-eval-section">
                <div className="review-eval-header">
                  <EvaluationBar eval={currentEval} />
                  <button
                    type="button"
                    className={`review-move-icons-toggle ${showMoveIcons ? 'active' : ''}`}
                    onClick={toggleMoveIcons}
                    title={showMoveIcons ? 'Hide move icons on board' : 'Show move icons on board'}
                    aria-label={showMoveIcons ? 'Hide move icons' : 'Show move icons'}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
                <BestMovesPanel
                  fen={viewFen}
                  pv={currentEval?.pv}
                  maxMoves={7}
                />
              </div>
              <div className="review-board-wrapper">
                <Chessboard
                  options={{
                    position: viewFen,
                    boardOrientation: 'white',
                    allowDragging: false,
                    squareStyles: lastMoveSquares,
                    boardStyle: { width: '100%', height: '100%', aspectRatio: '1' },
                  }}
                />
                {showMoveIcons && lastMoveTo && currentMoveClass && (
                  <MoveClassOverlay
                    square={lastMoveTo}
                    classification={currentMoveClass}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="review-move-history-card">
            <div className="review-move-list-scroll">
              <ReviewMoveList
                history={effectiveHistory}
                selectedPly={viewIndex}
                onMoveClick={goToPly}
                canStepBack={canStepBack}
                canStepForward={canStepForward}
                onStepBack={stepBack}
                onStepForward={stepForward}
              />
            </div>
            <EvaluationGraph
              evals={evals}
              selectedPly={viewIndex}
              totalPlies={effectiveHistory.length}
              onPlyClick={goToPly}
              loading={loadingEvals}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
