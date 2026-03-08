import {
  formatGameOutcome,
  isLegalPromotionMove,
  LAST_MOVE_FROM,
  LAST_MOVE_TO,
  START_FEN,
} from '../utils/chess'
import { ChessGame } from './ChessGame'
import type { MoveRecord } from './types'

export type SquareStyles = Record<string, React.CSSProperties>

export class VsPlayerController {
  private game: ChessGame
  private _orientation: 'white' | 'black'
  private _player1IsWhite: boolean
  private _gameOverText: string | null
  private _lastFrom: string | null
  private _lastTo: string | null
  private _history: MoveRecord[] = []

  constructor() {
    this.game = new ChessGame()
    this._orientation = 'white'
    this._player1IsWhite = true
    this._gameOverText = null
    this._lastFrom = null
    this._lastTo = null
  }

  get fen(): string {
    return this.game.fen
  }

  get history(): MoveRecord[] {
    return [...this._history]
  }

  get orientation(): 'white' | 'black' {
    return this._orientation
  }

  get player1IsWhite(): boolean {
    return this._player1IsWhite
  }

  get gameOverText(): string | null {
    return this._gameOverText
  }

  get lastMoveSquares(): SquareStyles {
    if (!this._lastFrom || !this._lastTo) return {}
    return {
      [this._lastFrom]: LAST_MOVE_FROM,
      [this._lastTo]: LAST_MOVE_TO,
    }
  }

  getLegalMoveTargets(square: string): string[] {
    return this.game.getLegalMovesFromSquare(square).map((m) => m.to)
  }

  isLegalPromotionMove(from: string, to: string): boolean {
    return isLegalPromotionMove(this.game.fen, from, to)
  }

  applyMove(from: string, to: string, promotion?: string): { ok: boolean } {
    if (this._gameOverText) return { ok: false }
    const result = this.game.tryMove(from, to, promotion ?? 'q')
    if (!result.ok) return { ok: false }

    this._lastFrom = from
    this._lastTo = to
    this._history.push({
      from,
      to,
      san: result.san,
      fenAfter: result.nextFen,
      uci: result.uci,
    })

    if (result.isGameOver) {
      this._gameOverText = formatGameOutcome(result.outcome, {
        player1IsWhite: this._player1IsWhite,
        player1Label: 'Player 1',
        player2Label: 'Player 2',
      })
    }
    return { ok: true }
  }

  flag(sideThatFlagged: 'w' | 'b'): void {
    if (this._gameOverText) return
    const flaggerHadWhite = sideThatFlagged === 'w'
    const winnerIsPlayer1 =
      (flaggerHadWhite && !this._player1IsWhite) ||
      (!flaggerHadWhite && this._player1IsWhite)
    const winner = winnerIsPlayer1 ? 'Player 1' : 'Player 2'
    this._gameOverText = `${winner} wins on time!`
  }

  resign(): void {
    if (this._gameOverText) return
    const sideToMove = this.game.turn
    const resignerHadWhite = sideToMove === 'w'
    const winnerIsPlayer1 =
      (resignerHadWhite && !this._player1IsWhite) ||
      (!resignerHadWhite && this._player1IsWhite)
    const winner = winnerIsPlayer1 ? 'Player 1' : 'Player 2'
    this._gameOverText = `${winner} wins by resignation!`
  }

  dismissResult(): void {
    if (!this._gameOverText) return
    this._gameOverText = null
  }

  undo(): boolean {
    if (this._gameOverText || this._history.length === 0) return false
    this._history.pop()
    const newFen =
      this._history.length > 0
        ? this._history[this._history.length - 1].fenAfter
        : START_FEN
    this.game.loadFen(newFen)
    if (this._history.length > 0) {
      const last = this._history[this._history.length - 1]
      this._lastFrom = last.from
      this._lastTo = last.to
    } else {
      this._lastFrom = null
      this._lastTo = null
    }
    return true
  }

  reset(switchSides = false): void {
    this.game.reset()
    this._history.length = 0
    this._orientation = 'white'
    this._gameOverText = null
    this._lastFrom = null
    this._lastTo = null
    if (switchSides) {
      this._player1IsWhite = !this._player1IsWhite
    }
  }
}
