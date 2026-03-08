function ClockIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

export type ClockPanelProps = {
  label: string
  clockText: string
  isActive: boolean
  /** For vs-player layout: true = top (white), false = bottom (black). Omit for online. */
  isTop?: boolean
  /** Layout variant. */
  variant?: 'vs-player' | 'online'
}

export default function ClockPanel({
  label,
  clockText,
  isActive,
  isTop,
  variant = 'online',
}: ClockPanelProps) {
  if (variant === 'vs-player') {
    return (
      <div
        className={`vs-player-clock-panel vs-player-clock-${isTop ? 'top' : 'bottom'}`}
      >
        <div className="vs-player-clock-row">
          <span className="vs-player-clock-name">{label}</span>
          <span className="vs-player-clock-icon">
            <ClockIcon />
          </span>
          <span
            className={`vs-player-clock-value ${isActive ? 'vs-player-clock-active' : ''}`}
          >
            {clockText}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="online-game-clock-panel">
      <span className="online-game-clock-label">{label}</span>
      <span className="online-game-clock-icon">
        <ClockIcon />
      </span>
      <span
        className={`online-game-clock-value ${isActive ? 'online-game-clock-active' : ''}`}
      >
        {clockText}
      </span>
    </div>
  )
}
