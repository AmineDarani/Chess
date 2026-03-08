import {
  START_FEN,
  getLegalMovesFromSquare,
  getOutcome,
  getTurn,
  tryMove as domainTryMove,
  type Fen,
  type GameOutcome,
  type LegalMove,
  type MoveInput,
  type TryMoveResult,
} from '../utils/chess'

export type { Fen, GameOutcome, LegalMove, TryMoveResult }

export { START_FEN }

export class ChessGame {
  private _fen: Fen

  constructor(fen: Fen = START_FEN) {
    this._fen = fen
  }

  get fen(): Fen {
    return this._fen
  }

  get turn(): 'w' | 'b' | null {
    return getTurn(this._fen)
  }

  get outcome(): GameOutcome | null {
    return getOutcome(this._fen)
  }

  get isGameOver(): boolean {
    const o = this.outcome
    return o !== null && o.status !== 'ongoing'
  }

  tryMove(from: string, to: string, promotion?: string): TryMoveResult {
    const input: MoveInput = { from, to, promotion }
    const result = domainTryMove(this._fen, input)
    if (result.ok) {
      this._fen = result.nextFen
    }
    return result
  }

  getLegalMovesFromSquare(square: string): LegalMove[] {
    return getLegalMovesFromSquare(this._fen, square)
  }

  reset(): void {
    this._fen = START_FEN
  }

  loadFen(fen: Fen): void {
    this._fen = fen
  }
}
