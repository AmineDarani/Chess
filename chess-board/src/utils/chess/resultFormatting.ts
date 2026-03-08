import type { GameOutcome } from './chessDomain'

/** Compatible with api/games GameResult. */
export type GameResult =
  | { status: 'ongoing' }
  | { status: 'checkmate'; winner: 'w' | 'b' }
  | { status: 'stalemate' }
  | { status: 'draw'; reason?: string }
  | { status: 'resignation'; winner: 'w' | 'b' }
  | { status: 'timeout'; winner: 'w' | 'b' }

export type FormatGameResultOptions = {
  whiteLabel?: string
  blackLabel?: string
  /** For local mode: maps w/b to Player 1/2. player1Label/player2Label used with player1IsWhite. */
  player1IsWhite?: boolean
  player1Label?: string
  player2Label?: string
  /** Append "!" to victory messages. Default true for local/online, false for vs-bot. */
  exclamation?: boolean
}

const DEFAULT_WHITE = 'White'
const DEFAULT_BLACK = 'Black'

function getWinnerLabel(
  winner: 'w' | 'b',
  opts: FormatGameResultOptions,
): string {
  if (opts.player1IsWhite != null && opts.player1Label != null && opts.player2Label != null) {
    return winner === 'w' ? opts.player1Label : opts.player2Label
  }
  const white = opts.whiteLabel ?? DEFAULT_WHITE
  const black = opts.blackLabel ?? DEFAULT_BLACK
  return winner === 'w' ? white : black
}

/** Format outcome from local or vs-bot game (GameOutcome). */
export function formatGameOutcome(
  outcome: GameOutcome,
  options?: FormatGameResultOptions,
): string {
  if (outcome.status === 'ongoing') return 'Game over'
  if (outcome.status === 'checkmate') {
    const winner = getWinnerLabel(outcome.winner, options ?? {})
    const punct = options?.exclamation !== false ? '!' : ''
    return `${winner} win${winner === 'You' ? '' : 's'} by checkmate${punct}`
  }
  if (outcome.status === 'draw' && outcome.reason === 'stalemate') {
    return 'Draw by stalemate'
  }
  return 'Draw'
}

/** Format result from online game (GameResult). */
export function formatGameResult(
  result: GameResult | undefined,
  options?: FormatGameResultOptions,
): string {
  if (!result || result.status === 'ongoing') return ''
  const punct = options?.exclamation !== false ? '!' : ''
  if (result.status === 'checkmate') {
    const winner = getWinnerLabel(result.winner, options ?? {})
    return `${winner} wins by checkmate${punct}`
  }
  if (result.status === 'stalemate') return 'Draw by stalemate'
  if (result.status === 'draw') return 'Draw'
  if (result.status === 'resignation') {
    const winner = getWinnerLabel(result.winner, options ?? {})
    return `${winner} wins by resignation${punct}`
  }
  if (result.status === 'timeout') {
    const winner = getWinnerLabel(result.winner, options ?? {})
    return `${winner} wins on time${punct}`
  }
  return 'Game over'
}
