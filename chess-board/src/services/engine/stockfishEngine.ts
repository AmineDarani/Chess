export type StockfishLevel = {
  id: string
  label: string // e.g. "Beginner (800)"
  elo: number
  movetimeMs?: number
}

export type UciMove = string

export const STOCKFISH_LEVELS: StockfishLevel[] = [
  { id: 'elo-200', label: 'Novice (200)', elo: 200, movetimeMs: 100 },
  { id: 'elo-400', label: 'Amateur (400)', elo: 400, movetimeMs: 120 },
  { id: 'elo-600', label: 'Beginner (600)', elo: 600, movetimeMs: 150 },
  { id: 'elo-1000', label: 'Intermediate (1000)', elo: 1000, movetimeMs: 200 },
  { id: 'elo-1200', label: 'Club (1200)', elo: 1200, movetimeMs: 400 },
  { id: 'elo-1600', label: 'Advanced (1600)', elo: 1600, movetimeMs: 700 },
  { id: 'elo-2000', label: 'Expert (2000)', elo: 2000, movetimeMs: 1100 },
  { id: 'elo-2400', label: 'Master (2400)', elo: 2400, movetimeMs: 1600 },
]

export const STOCKFISH_STRONGEST: StockfishLevel = STOCKFISH_LEVELS[STOCKFISH_LEVELS.length - 1]

type PendingRequest = {
  id: number
  resolve: (move: UciMove | null) => void
}

export type PositionEval = {
  /** Centipawns from white's perspective (for bar display) */
  cp: number
  /** Mate in N plies when decisive; positive = white wins, negative = black */
  mateIn?: number
  /** Principal variation - best line (UCI moves) */
  pv?: string[]
  /** Second-best move eval (for "only good move" detection). Present when MultiPV used. */
  secondBestCp?: number
}

type PendingEvalRequest = {
  id: number
  /** 'w' | 'b' - side to move in the position being evaluated */
  turn: 'w' | 'b'
  resolve: (result: PositionEval | null) => void
}

const MATE_CP = 10000

export class StockfishEngine {
  private worker: Worker
  private disposed = false
  private requestSeq = 0
  private pending: PendingRequest | null = null
  private pendingEval: PendingEvalRequest | null = null
  private lastEvalScore: number | null = null
  private lastMateIn: number | null = null
  private lastPv: string[] = []
  private lastMultipvScores: Map<number, number> = new Map()
  private configuredElo: number | null = null
  private analysisReady = false

  constructor(workerUrl: string = '/stockfish/stockfish-18-lite-single.js') {
    this.worker = new Worker(workerUrl)
    this.worker.onmessage = (event) => {
      const line =
        typeof event.data === 'string' ? event.data : String(event.data ?? '')
      this.handleLine(line)
    }

    this.worker.postMessage('uci')
    this.worker.postMessage('isready')
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true

    // Resolve any pending request so callers don't hang.
    this.pending?.resolve(null)
    this.pending = null
    this.pendingEval?.resolve(null)
    this.pendingEval = null

    this.worker.terminate?.()
  }

  setElo(elo: number) {
    if (this.disposed) return
    if (this.configuredElo === elo) return
    this.configuredElo = elo

    this.worker.postMessage('setoption name UCI_LimitStrength value true')
    this.worker.postMessage(`setoption name UCI_Elo value ${elo}`)
  }

  getBestMove(fen: string, level: StockfishLevel): Promise<UciMove | null> {
    if (this.disposed) return Promise.resolve(null)

    // Only allow one in-flight request; resolve any older one as cancelled.
    this.pending?.resolve(null)

    const id = ++this.requestSeq
    this.setElo(level.elo)
    const movetime = level.movetimeMs ?? 800

    return new Promise<UciMove | null>((resolve) => {
      this.pending = { id, resolve }

      this.worker.postMessage('ucinewgame')
      this.worker.postMessage(`position fen ${fen}`)
      this.worker.postMessage(`go movetime ${movetime}`)
    })
  }

  /** One-time setup for analysis mode (MultiPV, no ELO limit). */
  prepareForAnalysis() {
    if (this.disposed || this.analysisReady) return
    this.analysisReady = true
    this.worker.postMessage('setoption name UCI_LimitStrength value false')
    this.worker.postMessage('setoption name MultiPV value 2')
    this.worker.postMessage('ucinewgame')
    this.worker.postMessage('isready')
  }

  /**
   * Get position evaluation. Returns centipawns from white's perspective.
   * For mate, also includes mateIn (positive = white wins, negative = black).
   * Call prepareForAnalysis() once before a batch of evaluations.
   */
  getPositionEval(fen: string, depth = 20): Promise<PositionEval | null> {
    if (this.disposed) return Promise.resolve(null)

    this.pendingEval?.resolve(null)
    this.lastEvalScore = null
    this.lastMateIn = null
    this.lastPv = []
    this.lastMultipvScores = new Map()

    if (!this.analysisReady) this.prepareForAnalysis()

    const turn = (fen.split(/\s+/)[1] ?? 'w') as 'w' | 'b'
    const id = ++this.requestSeq

    return new Promise<PositionEval | null>((resolve) => {
      this.pendingEval = { id, turn, resolve }

      this.worker.postMessage(`position fen ${fen}`)
      this.worker.postMessage(`go depth ${depth}`)
    })
  }

  private handleLine(line: string) {
    if (this.disposed) return
    if (!line) return

    // Handle eval: parse info lines for score and pv (MultiPV 2 gives multipv 1 and 2)
    if (this.pendingEval && line.startsWith('info ')) {
      const multipvMatch = line.match(/ multipv (\d+)/)
      const multipv = multipvMatch ? parseInt(multipvMatch[1], 10) : 1
      const cpMatch = line.match(/ score cp (-?\d+)/)
      const mateMatch = line.match(/ score mate (-?\d+)/)
      const pvMatch = line.match(/ pv (.+)/)
      if (mateMatch) {
        const mateIn = parseInt(mateMatch[1], 10)
        const cp = mateIn > 0 ? MATE_CP : -MATE_CP
        this.lastMultipvScores.set(multipv, cp)
        if (multipv === 1) {
          this.lastEvalScore = cp
          this.lastMateIn = mateIn
        }
      } else if (cpMatch) {
        const cp = parseInt(cpMatch[1], 10)
        this.lastMultipvScores.set(multipv, cp)
        if (multipv === 1) {
          this.lastEvalScore = cp
          this.lastMateIn = null
        }
      }
      if (pvMatch && multipv === 1) {
        const uciMoves = pvMatch[1].trim().split(/\s+/).filter((m) =>
          /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m)
        )
        this.lastPv = uciMoves
      }
      return
    }

    if (!(line.indexOf('bestmove') === 0 || line.includes(' bestmove ')))
      return

    // Eval request completion: bestmove marks end of analysis
    const evalPending = this.pendingEval
    if (evalPending) {
      this.pendingEval = null
      const raw = this.lastEvalScore ?? 0
      const fromWhite = evalPending.turn === 'w' ? raw : -raw
      const mateIn =
        this.lastMateIn !== null
          ? evalPending.turn === 'w'
            ? this.lastMateIn
            : -this.lastMateIn
          : undefined
      const pv = this.lastPv.length > 0 ? this.lastPv : undefined
      const secondRaw = this.lastMultipvScores.get(2)
      // Stockfish outputs cp from white's perspective; secondBestCp is for comparison
      const secondBestCp = secondRaw
      evalPending.resolve({ cp: fromWhite, mateIn, pv, secondBestCp })
      return
    }

    const pending = this.pending
    if (!pending) return

    const parts = line.trim().split(/\s+/)
    const moveStr = parts[1]

    this.pending = null

    if (!moveStr || moveStr === '(none)') {
      pending.resolve(null)
      return
    }

    // UCI move: e2e4 or e7e8q
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(moveStr)) {
      pending.resolve(null)
      return
    }

    pending.resolve(moveStr)
  }
}

