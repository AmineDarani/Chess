import type { GameOutcome } from '../utils/chess'
import {
  formatGameOutcome,
  isLegalPromotionMove as isLegalPromotionMoveUtil,
  LAST_MOVE_FROM,
  LAST_MOVE_TO,
  START_FEN,
} from '../utils/chess'
import {
  StockfishEngine,
  type StockfishLevel,
  type UciMove,
} from '../services/engine'
import { ChessGame } from './ChessGame'
import type { MoveRecord } from './types'

export type { MoveRecord }
export type SquareStyles = Record<string, React.CSSProperties>

export type VsStockfishUpdate = {
  fen?: string
  history?: MoveRecord[]
  lastMoveSquares?: SquareStyles
  gameOverText?: string | null
  isAiThinking?: boolean
  canHumanMove?: boolean
}

export type VsStockfishControllerOptions = {
  level: StockfishLevel
  addIncrement: () => void
  onUpdate: (update: VsStockfishUpdate) => void
  isMounted: () => boolean
  workerUrl?: string
}

export class VsStockfishController {
  private game: ChessGame
  private engine: StockfishEngine
  private level: StockfishLevel
  private _history: MoveRecord[] = []
  private _isAiThinking = false
  private _gameOverText: string | null = null
  private _lastFrom: string | null = null
  private _lastTo: string | null = null

  private addIncrement: () => void
  private onUpdate: (update: VsStockfishUpdate) => void
  private isMounted: () => boolean

  constructor(options: VsStockfishControllerOptions) {
    this.game = new ChessGame()
    this.engine = new StockfishEngine(options.workerUrl)
    this.level = options.level
    this.addIncrement = options.addIncrement
    this.onUpdate = options.onUpdate
    this.isMounted = options.isMounted
  }

  get fen(): string {
    return this.game.fen
  }

  get gameOverText(): string | null {
    return this._gameOverText
  }

  get isAiThinking(): boolean {
    return this._isAiThinking
  }

  get canHumanMove(): boolean {
    return (
      !this._gameOverText &&
      !this._isAiThinking &&
      this.game.turn === 'w'
    )
  }

  get history(): MoveRecord[] {
    return [...this._history]
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
    return isLegalPromotionMoveUtil(this.game.fen, from, to)
  }

  applyHumanMove(from: string, to: string, promotion?: string): boolean {
    if (!this.canHumanMove || this._gameOverText) return false

    const result = this.game.tryMove(from, to, promotion ?? 'q')
    if (!result.ok) return false

    this.addIncrement()

    this._lastFrom = from
    this._lastTo = to
    this._history.push({
      by: 'human',
      from,
      to,
      uci: result.uci,
      san: result.san,
      fenAfter: result.nextFen,
    })

    if (result.isGameOver) {
      this._gameOverText = formatGameOutcome(result.outcome, {
        whiteLabel: 'You',
        blackLabel: 'Stockfish',
        exclamation: false,
      })
      this.notifyUpdate()
      return true
    }

    this.notifyUpdate()
    void this.applyEngineMove()
    return true
  }

  private async applyEngineMove(): Promise<void> {
    const fen = this.game.fen
    this._isAiThinking = true
    this.notifyUpdate()

    const best: UciMove | null = await this.engine.getBestMove(fen, this.level)

    if (!this.isMounted()) return

    this._isAiThinking = false

    if (!best) {
      this.notifyUpdate()
      return
    }

    const from = best.substring(0, 2)
    const to = best.substring(2, 4)
    const promotion = best.length > 4 ? best[4] : undefined

    const result = this.game.tryMove(from, to, promotion)
    if (!result.ok) {
      if (import.meta.env.DEV) {
        console.error('Illegal engine move', result.reason, best)
      }
      this.notifyUpdate()
      return
    }

    this._lastFrom = from
    this._lastTo = to
    this._history.push({
      by: 'engine',
      from,
      to,
      uci: result.uci,
      san: result.san,
      fenAfter: result.nextFen,
    })

    if (result.isGameOver) {
      this._gameOverText = formatGameOutcome(result.outcome, {
        whiteLabel: 'You',
        blackLabel: 'Stockfish',
        exclamation: false,
      })
    }

    this.notifyUpdate()
  }

  resign(): void {
    if (this._gameOverText) return
    this._gameOverText = 'Stockfish wins by resignation'
    this.notifyUpdate()
  }

  flag(): void {
    if (this._gameOverText) return
    this._gameOverText = 'Stockfish wins on time'
    this.notifyUpdate()
  }

  dismissResult(): void {
    if (!this._gameOverText) return
    this._gameOverText = null
    this.notifyUpdate()
  }

  undo(): boolean {
    if (this._gameOverText || this._isAiThinking) return false
    // Undo both human and engine move (one full turn)
    if (this._history.length < 2) return false
    this._history.pop()
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
    this._gameOverText = null
    this.notifyUpdate()
    return true
  }

  reset(): void {
    this.game.reset()
    this._history.length = 0
    this._isAiThinking = false
    this._gameOverText = null
    this._lastFrom = null
    this._lastTo = null
    this.notifyUpdate()
  }

  dispose(): void {
    this.engine.dispose()
  }

  private notifyUpdate(): void {
    this.onUpdate({
      fen: this.game.fen,
      history: this._history,
      lastMoveSquares: this.lastMoveSquares,
      gameOverText: this._gameOverText,
      isAiThinking: this._isAiThinking,
      canHumanMove: this.canHumanMove,
    })
  }
}
