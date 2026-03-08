import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getFenAtPly,
  getLastMoveAtPly,
  classifyMove,
  LAST_MOVE_FROM,
  LAST_MOVE_TO,
  type MoveRecordLike,
} from '../utils/chess'
import type { MoveClassification } from '../utils/chess'
import {
  StockfishEngine,
  type PositionEval,
} from '../services/engine'

const EVAL_DEPTH = 14
const BATCH_SIZE = 4

export type UseReviewGameOptions = {
  history: MoveRecordLike[]
}

export function useReviewGame({ history }: UseReviewGameOptions) {
  const [viewIndex, setViewIndex] = useState(0)
  const [evals, setEvals] = useState<Map<number, PositionEval>>(new Map())
  const [loadingEvals, setLoadingEvals] = useState(true)
  const engineRef = useRef<StockfishEngine | null>(null)
  const mountedRef = useRef(true)

  const viewFen = useMemo(() => getFenAtPly(history, viewIndex), [history, viewIndex])

  const lastMoveSquares = useMemo(() => {
    const lastMove = getLastMoveAtPly(history, viewIndex)
    if (!lastMove) return {} as Record<string, React.CSSProperties>
    return {
      [lastMove.from]: LAST_MOVE_FROM,
      [lastMove.to]: LAST_MOVE_TO,
    } as Record<string, React.CSSProperties>
  }, [history, viewIndex])

  const currentEval = evals.get(viewIndex) ?? null

  const moveClassifications = useMemo(() => {
    const map = new Map<number, MoveClassification>()
    for (let ply = 1; ply <= history.length; ply++) {
      const prevEval = evals.get(ply - 1)
      const next = evals.get(ply)?.cp
      const c = classifyMove(
        prevEval?.cp,
        next,
        ply - 1,
        prevEval?.secondBestCp,
      )
      if (c) map.set(ply, c)
    }
    return map
  }, [evals, history.length])

  const canStepBack = viewIndex > 0
  const canStepForward = viewIndex < history.length

  const stepBack = useCallback(() => setViewIndex((prev) => Math.max(0, prev - 1)), [])
  const stepForward = useCallback(
    () => setViewIndex((prev) => Math.min(history.length, prev + 1)),
    [history.length],
  )
  const goToPly = useCallback(
    (ply: number) => setViewIndex(Math.max(0, Math.min(history.length, ply))),
    [history.length],
  )

  useEffect(() => {
    mountedRef.current = true
    const engine = new StockfishEngine()
    engineRef.current = engine
    engine.prepareForAnalysis()

    const plies = history.length + 1
    let cancelled = false

    const runEvals = async () => {
      const batch = new Map<number, PositionEval>()

      for (let ply = 0; ply < plies && !cancelled && mountedRef.current; ply++) {
        const fen = getFenAtPly(history, ply)
        if (!engineRef.current) break

        const result = await engineRef.current.getPositionEval(fen, EVAL_DEPTH)
        if (cancelled || !mountedRef.current) return

        if (result !== null) batch.set(ply, result)

        if (batch.size >= BATCH_SIZE || ply === plies - 1) {
          const toFlush = new Map(batch)
          batch.clear()
          setEvals((prev) => {
            const next = new Map(prev)
            for (const [k, v] of toFlush) next.set(k, v)
            return next
          })
        }
      }
      if (mountedRef.current) setLoadingEvals(false)
    }

    runEvals()
    return () => {
      cancelled = true
      mountedRef.current = false
      engineRef.current?.dispose()
      engineRef.current = null
    }
  }, [history])

  return {
    viewFen,
    lastMoveSquares,
    viewIndex,
    currentEval,
    moveClassifications,
    effectiveHistory: history,
    evals,
    loadingEvals,
    canStepBack,
    canStepForward,
    stepBack,
    stepForward,
    goToPly,
  }
}
