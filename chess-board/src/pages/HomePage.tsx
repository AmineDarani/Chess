import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../App.css'
import { TIME_CONTROLS, type TimeControl } from '../hooks/useHumanClock'
import { parsePgn } from '../utils/chess'
import { createGame, setStoredPlayerId } from '../api/games'

const DEFAULT_PGN = `1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7`

export default function HomePage() {
  const navigate = useNavigate()
  const [localTimeControl, setLocalTimeControl] = useState<TimeControl>(TIME_CONTROLS[2])
  const [onlineTimeControl, setOnlineTimeControl] = useState<TimeControl>(TIME_CONTROLS[2])
  const [stockfishTimeControl, setStockfishTimeControl] = useState<TimeControl>(TIME_CONTROLS[2])
  const [pgnInput, setPgnInput] = useState(DEFAULT_PGN)
  const [pgnError, setPgnError] = useState<string | null>(null)
  const [creatingGame, setCreatingGame] = useState(false)

  const handleCreateOnlineGame = async () => {
    setCreatingGame(true)
    try {
      const tc =
        onlineTimeControl.id !== 'none'
          ? {
              initialMs: onlineTimeControl.initialMs,
              incrementMs: onlineTimeControl.incrementMs,
            }
          : undefined
      const { id, creatorPlayerId } = await createGame(tc)
      setStoredPlayerId(id, creatorPlayerId)
      navigate(`/game/${id}`, {
        state: { timeControl: onlineTimeControl.id !== 'none' ? onlineTimeControl : undefined },
      })
    } finally {
      setCreatingGame(false)
    }
  }

  const handleLocalMultiplayer = () => {
    navigate('/vs-player', {
      state: {
        timeControl:
          localTimeControl.id !== 'none' ? localTimeControl : undefined,
      },
    })
  }

  const handleVsStockfish = () => {
    navigate('/vs-bot', {
      state: { timeControl: stockfishTimeControl },
    })
  }

  const handleReviewPgn = () => {
    const result = parsePgn(pgnInput)
    if (!result) {
      setPgnError('Invalid PGN')
      return
    }
    if (result.history.length === 0) {
      setPgnError('PGN has no moves')
      return
    }
    setPgnError(null)
    navigate('/review', {
      state: {
        history: result.history,
        gameOverText: result.gameOverText,
        source: 'pgn',
      },
    })
  }

  return (
    <div className="home-page">
      <h1 className="home-title">Chess</h1>

      <nav className="home-nav">
        <div className="home-nav-item">
          <span className="home-nav-label">Local</span>
          <select
            value={localTimeControl.id}
            onChange={(e) => {
              const next = TIME_CONTROLS.find((t) => t.id === e.target.value)
              if (next) setLocalTimeControl(next)
            }}
          >
            {TIME_CONTROLS.map((tc) => (
              <option key={tc.id} value={tc.id}>{tc.label}</option>
            ))}
          </select>
          <button onClick={handleLocalMultiplayer}>Play</button>
        </div>

        <div className="home-nav-item">
          <span className="home-nav-label">Online</span>
          <select
            value={onlineTimeControl.id}
            onChange={(e) => {
              const next = TIME_CONTROLS.find((t) => t.id === e.target.value)
              if (next) setOnlineTimeControl(next)
            }}
          >
            {TIME_CONTROLS.map((tc) => (
              <option key={tc.id} value={tc.id}>{tc.label}</option>
            ))}
          </select>
          <button onClick={handleCreateOnlineGame} disabled={creatingGame}>
            {creatingGame ? 'Creating…' : 'Create game'}
          </button>
        </div>

        <div className="home-nav-item">
          <span className="home-nav-label">Vs Stockfish</span>
          <select
            value={stockfishTimeControl.id}
            onChange={(e) => {
              const next = TIME_CONTROLS.find((t) => t.id === e.target.value)
              if (next) setStockfishTimeControl(next)
            }}
          >
            {TIME_CONTROLS.map((tc) => (
              <option key={tc.id} value={tc.id}>{tc.label}</option>
            ))}
          </select>
          <button onClick={handleVsStockfish}>Play</button>
        </div>

        <div className="home-nav-item home-nav-item-review">
          <span className="home-nav-label">Review PGN</span>
          <textarea
            className="home-pgn-input"
            value={pgnInput}
            onChange={(e) => {
              setPgnInput(e.target.value)
              setPgnError(null)
            }}
            placeholder="1. e4 e5 2. Nf3 Nc6..."
            rows={3}
          />
          {pgnError && <span className="home-pgn-error">{pgnError}</span>}
          <button onClick={handleReviewPgn}>Analyze</button>
        </div>
      </nav>
    </div>
  )
}
