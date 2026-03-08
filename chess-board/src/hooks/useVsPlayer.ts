import { useEffect, useRef, useState } from 'react'
import { VsPlayerController } from '../game/VsPlayerController'
import { START_FEN, getTurn } from '../utils/chess'
import { useBoardHighlight } from './useBoardHighlight'
import { useMoveHistory } from './useMoveHistory'
import {
  TIME_CONTROLS,
  type TimeControl,
  useHumanClock,
} from './useHumanClock'
import { useGameScore } from './useGameScore'

function formatLocalScore(local: {
  player1Wins: number
  player2Wins: number
  draws: number
}): string {
  const { player1Wins, player2Wins, draws } = local
  const parts = [`Player 1 ${player1Wins}`, `Player 2 ${player2Wins}`]
  if (draws > 0) parts.push(`${draws} draw${draws !== 1 ? 's' : ''}`)
  return parts.join('  ·  ')
}

export type UseVsPlayerOptions = {
  timeControl?: TimeControl
}

export function useVsPlayer(options: UseVsPlayerOptions = {}) {
  const timeControl = options.timeControl ?? TIME_CONTROLS[0]
  const isTimedMode = timeControl.id !== 'none'

  const controllerRef = useRef<VsPlayerController | null>(null)
  const [fen, setFen] = useState(START_FEN)
  const [history, setHistory] = useState<
    { from: string; to: string; san: string; fenAfter: string }[]
  >(() => controllerRef.current?.history ?? [])
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  const [gameOverText, setGameOverText] = useState<string | null>(null)
  const [lastMoveSquares, setLastMoveSquares] = useState<
    Record<string, React.CSSProperties>
  >({})
  const [player1IsWhite, setPlayer1IsWhite] = useState(true)
  const [modalVisible, setModalVisible] = useState(true)

  if (!controllerRef.current) {
    controllerRef.current = new VsPlayerController()
  }
  const controller = controllerRef.current

  const { score, recordLocalResult } = useGameScore()
  const lastRecordedGameOverRef = useRef<string | null>(null)

  const turn = getTurn(fen)
  const hasGameStarted = fen !== START_FEN
  const whiteToMove = turn === 'w'
  const blackToMove = turn === 'b'

  const whiteClock = useHumanClock({
    timeControl,
    isRunning:
      isTimedMode &&
      hasGameStarted &&
      whiteToMove &&
      !gameOverText,
    onFlag: () => {
      controller.flag('w')
      syncFromController()
    },
  })

  const blackClock = useHumanClock({
    timeControl,
    isRunning:
      isTimedMode &&
      hasGameStarted &&
      blackToMove &&
      !gameOverText,
    onFlag: () => {
      controller.flag('b')
      syncFromController()
    },
  })

  const syncFromController = () => {
    setFen(controller.fen)
    setHistory(controller.history)
    setOrientation(controller.orientation)
    setGameOverText(controller.gameOverText)
    setLastMoveSquares(controller.lastMoveSquares)
    setPlayer1IsWhite(controller.player1IsWhite)
  }

  const prevHistoryLengthRef = useRef(0)
  const shouldSnapToHead = history.length > prevHistoryLengthRef.current
  prevHistoryLengthRef.current = history.length

  const moveHistory = useMoveHistory({
    history,
    liveFen: fen,
    canHumanMove: !gameOverText,
    shouldSnapToHead,
  })

  const boardHighlight = useBoardHighlight({
    getLegalMoves: (square) => controller.getLegalMoveTargets(square),
    canHighlight: () =>
      moveHistory.isAtHead && !gameOverText,
    includeSelectedSquare: false,
  })

  const addIncrementForMover = (moverIsWhite: boolean) => {
    if (moverIsWhite) {
      whiteClock.addIncrement()
    } else {
      blackClock.addIncrement()
    }
  }

  const applyMove = (from: string, to: string, promotion?: string) => {
    const moverIsWhite = turn === 'w'
    const result = controller.applyMove(from, to, promotion)
    if (result.ok) {
      if (isTimedMode) addIncrementForMover(moverIsWhite)
      syncFromController()
    }
    return result.ok
  }

  const resign = () => {
    controller.resign()
    syncFromController()
  }

  const dismissResult = () => {
    setModalVisible(false)
  }

  const reset = () => {
    lastRecordedGameOverRef.current = null
    setModalVisible(true)
    controller.reset(true)
    whiteClock.reset()
    blackClock.reset()
    syncFromController()
    boardHighlight.clearMoveSquares()
  }

  const undo = () => controller.undo() && syncFromController()
  const canUndo = !gameOverText && history.length >= 1

  useEffect(() => {
    syncFromController()
  }, [])

  useEffect(() => {
    if (gameOverText) setModalVisible(true)
  }, [gameOverText])

  useEffect(() => {
    if (!gameOverText || lastRecordedGameOverRef.current === gameOverText)
      return
    lastRecordedGameOverRef.current = gameOverText
    const lower = gameOverText.toLowerCase()
    if (lower.includes('draw')) {
      recordLocalResult('draw')
    } else if (lower.includes('player 1')) {
      recordLocalResult('player1Win')
    } else if (lower.includes('player 2')) {
      recordLocalResult('player2Win')
    }
  }, [gameOverText, recordLocalResult])

  const topPlayerName = player1IsWhite ? 'Player 1' : 'Player 2'
  const bottomPlayerName = player1IsWhite ? 'Player 2' : 'Player 1'
  const topClockText = isTimedMode ? whiteClock.formatted : '—'
  const bottomClockText = isTimedMode ? blackClock.formatted : '—'
  const topClockActive =
    isTimedMode && hasGameStarted && whiteToMove && !gameOverText
  const bottomClockActive =
    isTimedMode && hasGameStarted && blackToMove && !gameOverText

  return {
    fen: moveHistory.viewFen,
    history,
    orientation,
    gameOverText,
    lastMoveSquares: moveHistory.lastMoveSquares,
    moveSquares: boardHighlight.moveSquares,
    highlightMovesForSquare: boardHighlight.highlightMovesForSquare,
    clearMoveSquares: boardHighlight.clearMoveSquares,
    applyMove,
    resign,
    reset,
    dismissResult,
    undo,
    canUndo,
    scoreText: formatLocalScore(score.local),
    isTimedMode,
    hasGameStarted,
    topPlayerName,
    bottomPlayerName,
    topClockText,
    bottomClockText,
    topClockActive,
    bottomClockActive,
    modalVisible,
    // Move history
    formattedMoveList: moveHistory.formattedMoveList,
    viewIndex: moveHistory.viewIndex,
    isAtHead: moveHistory.isAtHead,
    canStepBack: moveHistory.canStepBack,
    canStepForward: moveHistory.canStepForward,
    stepBack: moveHistory.stepBack,
    stepForward: moveHistory.stepForward,
    allowDragging: moveHistory.allowDragging,
  }
}
