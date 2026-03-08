import './ResultModal.css'

function CrownIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="result-modal-icon result-modal-icon-crown"
    >
      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
      <path d="M2 4h20" />
    </svg>
  )
}

function SadIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="result-modal-icon result-modal-icon-sad"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  )
}

type Props = {
  open: boolean
  title: string
  body?: string
  scoreText?: string
  icon?: 'crown' | 'sad'
  primaryActionText: string
  onPrimaryAction: () => void
  secondaryActionText: string
  onSecondaryAction: () => void
  tertiaryActionText?: string
  onTertiaryAction?: () => void
  onClose?: () => void
}

export default function ResultModal({
  open,
  title,
  body,
  scoreText,
  icon,
  primaryActionText,
  onPrimaryAction,
  secondaryActionText,
  onSecondaryAction,
  tertiaryActionText,
  onTertiaryAction,
  onClose,
}: Props) {
  if (!open) return null

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Game result"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.()
        }
      }}
    >
      <div className="modal-card">
        {icon === 'crown' && <CrownIcon />}
        {icon === 'sad' && <SadIcon />}
        <div className="modal-title">{title}</div>
        {body ? <div className="modal-body">{body}</div> : null}
        {scoreText ? (
          <div className="modal-score">{scoreText}</div>
        ) : null}
        <div className="modal-actions">
          <button className="btn secondary" onClick={onSecondaryAction}>
            {secondaryActionText}
          </button>
          {tertiaryActionText && onTertiaryAction && (
            <button className="btn secondary" onClick={onTertiaryAction}>
              {tertiaryActionText}
            </button>
          )}
          <button className="btn primary" onClick={onPrimaryAction}>
            {primaryActionText}
          </button>
        </div>
      </div>
    </div>
  )
}

