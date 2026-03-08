export type MoveRecord = {
  from: string
  to: string
  san: string
  fenAfter: string
  by?: 'human' | 'engine'
  uci?: string
}
