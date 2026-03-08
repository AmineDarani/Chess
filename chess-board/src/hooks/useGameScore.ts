import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'chess-game-score'

export type VsBotScore = {
  humanWins: number
  botWins: number
  draws: number
}

export type LocalScore = {
  player1Wins: number
  player2Wins: number
  draws: number
}

export type GameScore = {
  vsBot: VsBotScore
  local: LocalScore
}

const DEFAULT_SCORE: GameScore = {
  vsBot: { humanWins: 0, botWins: 0, draws: 0 },
  local: { player1Wins: 0, player2Wins: 0, draws: 0 },
}

function loadScore(): GameScore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SCORE }
    const parsed = JSON.parse(raw) as Partial<GameScore>
    return {
      vsBot: { ...DEFAULT_SCORE.vsBot, ...parsed.vsBot },
      local: { ...DEFAULT_SCORE.local, ...parsed.local },
    }
  } catch {
    return { ...DEFAULT_SCORE }
  }
}

function saveScore(score: GameScore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(score))
  } catch {
    // ignore
  }
}

export function useGameScore() {
  const [score, setScore] = useState<GameScore>(loadScore)

  useEffect(() => {
    setScore(loadScore())
  }, [])

  const recordVsBotResult = useCallback(
    (result: 'humanWin' | 'botWin' | 'draw') => {
      setScore((prev) => {
        const next = {
          ...prev,
          vsBot: {
            ...prev.vsBot,
            humanWins:
              prev.vsBot.humanWins + (result === 'humanWin' ? 1 : 0),
            botWins: prev.vsBot.botWins + (result === 'botWin' ? 1 : 0),
            draws: prev.vsBot.draws + (result === 'draw' ? 1 : 0),
          },
        }
        saveScore(next)
        return next
      })
    },
    [],
  )

  const recordLocalResult = useCallback(
    (result: 'player1Win' | 'player2Win' | 'draw') => {
      setScore((prev) => {
        const next = {
          ...prev,
          local: {
            ...prev.local,
            player1Wins:
              prev.local.player1Wins + (result === 'player1Win' ? 1 : 0),
            player2Wins:
              prev.local.player2Wins + (result === 'player2Win' ? 1 : 0),
            draws: prev.local.draws + (result === 'draw' ? 1 : 0),
          },
        }
        saveScore(next)
        return next
      })
    },
    [],
  )

  return {
    score,
    recordVsBotResult,
    recordLocalResult,
  }
}
