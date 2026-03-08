import { useEffect, useMemo, useRef, useState } from 'react'

export type TimeControl = {
  id: string
  label: string // e.g. "3|2"
  initialMs: number
  incrementMs: number
}

export const TIME_CONTROLS: TimeControl[] = [
  { id: 'none', label: 'No limit', initialMs: 0, incrementMs: 0 },
  { id: '1-0', label: '1|0', initialMs: 1 * 60_000, incrementMs: 0 },
  { id: '3-2', label: '3|2', initialMs: 3 * 60_000, incrementMs: 2_000 },
  { id: '5-0', label: '5|0', initialMs: 5 * 60_000, incrementMs: 0 },
  { id: '10-0', label: '10|0', initialMs: 10 * 60_000, incrementMs: 0 },
  { id: '15-10', label: '15|10', initialMs: 15 * 60_000, incrementMs: 10_000 },
]

type Options = {
  timeControl: TimeControl
  isRunning: boolean
  onFlag: () => void
}

export function useHumanClock({ timeControl, isRunning, onFlag }: Options) {
  const [remainingMs, setRemainingMs] = useState(timeControl.initialMs)
  const onFlagRef = useRef(onFlag)
  useEffect(() => {
    onFlagRef.current = onFlag
  }, [onFlag])

  useEffect(() => {
    if (!isRunning) return

    const tickMs = 200
    const id = window.setInterval(() => {
      setRemainingMs((prev) => {
        const next = prev - tickMs
        if (next <= 0) {
          window.clearInterval(id)
          queueMicrotask(() => onFlagRef.current())
          return 0
        }
        return next
      })
    }, tickMs)

    return () => window.clearInterval(id)
  }, [isRunning])

  const addIncrement = () => {
    if (timeControl.incrementMs <= 0) return
    setRemainingMs((prev) => prev + timeControl.incrementMs)
  }

  const reset = () => {
    setRemainingMs(timeControl.initialMs)
  }

  const formatted = useMemo(() => {
    const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000))
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }, [remainingMs])

  return {
    remainingMs,
    formatted,
    addIncrement,
    reset,
  }
}

