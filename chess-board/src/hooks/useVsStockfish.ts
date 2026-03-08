import { useEffect, useRef, useState } from 'react'
import { VsStockfishController, type MoveRecord } from '../game/VsStockfishController'
import { useBoardHighlight } from './useBoardHighlight'
import { useMoveHistory } from './useMoveHistory'
import {
  TIME_CONTROLS,
  type TimeControl,
  useHumanClock,
} from './useHumanClock'
import { useGameScore } from './useGameScore'
import { STOCKFISH_STRONGEST } from '../services/engine'
import { START_FEN } from '../utils/chess'

function humanWonVsBot(result: string): boolean {
  return /^You win/.test(result)
}

function formatVsBotScore(vsBot: {
  humanWins: number
  botWins: number
  draws: number
}): string {
  const { humanWins, botWins, draws } = vsBot
  if (humanWins === 0 && botWins === 0 && draws === 0) return ''
  const parts = [`You ${humanWins}`, `Stockfish ${botWins}`]
  if (draws > 0) parts.push(`${draws} draw${draws !== 1 ? 's' : ''}`)
  return parts.join('  ·  ')
}

export type UseVsStockfishOptions = {
  timeControl?: TimeControl
}

export function useVsStockfish(options: UseVsStockfishOptions = {}) {
  const timeControl = options.timeControl ?? TIME_CONTROLS[1]

  const controllerRef = useRef<VsStockfishController | null>(null)
  const mountedRef = useRef(true)
  const addIncrementRef = useRef<() => void>(() => {})

  const [fen, setFen] = useState(START_FEN)
  const [history, setHistory] = useState<MoveRecord[]>([])
  const [gameOverText, setGameOverText] = useState<string | null>(null)
  const [lastMoveSquares, setLastMoveSquares] = useState<
    Record<string, React.CSSProperties>
  >({})
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [canHumanMove, setCanHumanMove] = useState(false)
  const [modalVisible, setModalVisible] = useState(true)

  const { score, recordVsBotResult } = useGameScore()
  const lastRecordedGameOverRef = useRef<string | null>(null)

  const isTimedMode = timeControl.id !== 'none'

  const hasGameStarted = history.length > 0

  const { formatted: humanClockText, addIncrement, reset: resetClock } =
    useHumanClock({
      timeControl,
      isRunning:
        isTimedMode &&
        canHumanMove &&
        hasGameStarted &&
        !gameOverText,
      onFlag: () => {
        controllerRef.current?.flag()
      },
    })

  addIncrementRef.current = addIncrement

  useEffect(() => {
    mountedRef.current = true

    controllerRef.current = new VsStockfishController({
      level: STOCKFISH_STRONGEST,
      addIncrement: isTimedMode
        ? () => addIncrementRef.current?.()
        : () => {},
      onUpdate: (update) => {
        if (update.fen !== undefined) setFen(update.fen)
        if (update.history !== undefined) setHistory(update.history)
        if (update.lastMoveSquares !== undefined)
          setLastMoveSquares(update.lastMoveSquares)
        if (update.gameOverText !== undefined)
          setGameOverText(update.gameOverText)
        if (update.isAiThinking !== undefined)
          setIsAiThinking(update.isAiThinking)
        if (update.canHumanMove !== undefined)
          setCanHumanMove(update.canHumanMove)
      },
      isMounted: () => mountedRef.current,
    })

    setFen(controllerRef.current.fen)
    setHistory(controllerRef.current.history)
    setLastMoveSquares(controllerRef.current.lastMoveSquares)
    setGameOverText(controllerRef.current.gameOverText)
    setIsAiThinking(controllerRef.current.isAiThinking)
    setCanHumanMove(controllerRef.current.canHumanMove)

    return () => {
      mountedRef.current = false
      controllerRef.current?.dispose()
      controllerRef.current = null
    }
  }, [isTimedMode])

  useEffect(() => {
    if (gameOverText) setModalVisible(true)
  }, [gameOverText])

  const prevHistoryLengthRef = useRef(0)
  const shouldSnapToHead = history.length > prevHistoryLengthRef.current
  prevHistoryLengthRef.current = history.length

  const moveHistory = useMoveHistory({
    history,
    liveFen: fen,
    canHumanMove,
    shouldSnapToHead,
  })

  const boardHighlight = useBoardHighlight({
    getLegalMoves: (square) =>
      controllerRef.current?.getLegalMoveTargets(square) ?? [],
    canHighlight: () =>
      moveHistory.isAtHead && (controllerRef.current?.canHumanMove ?? false),
    includeSelectedSquare: true,
  })

  const applyHumanMove = (from: string, to: string, promotion?: string) => {
    return controllerRef.current?.applyHumanMove(from, to, promotion) ?? false
  }

  const resign = () => {
    controllerRef.current?.resign()
  }

  const dismissResult = () => {
    setModalVisible(false)
  }

  const reset = () => {
    lastRecordedGameOverRef.current = null
    setModalVisible(true)
    controllerRef.current?.reset()
    resetClock()
    boardHighlight.clearMoveSquares()
  }

  const undo = () => {
    return controllerRef.current?.undo() ?? false
  }

  const canUndo =
    !gameOverText &&
    !isAiThinking &&
    history.length >= 2

  useEffect(() => {
    if (!gameOverText || lastRecordedGameOverRef.current === gameOverText)
      return
    lastRecordedGameOverRef.current = gameOverText
    if (gameOverText.toLowerCase().includes('draw')) {
      recordVsBotResult('draw')
    } else if (humanWonVsBot(gameOverText)) {
      recordVsBotResult('humanWin')
    } else {
      recordVsBotResult('botWin')
    }
  }, [gameOverText, recordVsBotResult])

  return {
    fen: moveHistory.viewFen,
    history,
    gameOverText,
    lastMoveSquares: moveHistory.lastMoveSquares,
    moveSquares: boardHighlight.moveSquares,
    highlightMovesForSquare: boardHighlight.highlightMovesForSquare,
    clearMoveSquares: boardHighlight.clearMoveSquares,
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
    scoreText: formatVsBotScore(score.vsBot),
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
