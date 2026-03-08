import { useEffect, useRef, useState } from 'react'
import './ChatPanel.css'

export type ChatMessage = {
  id: string
  type: 'user' | 'system'
  role?: 'white' | 'black'
  text: string
  ts: number
}

type Props = {
  messages: ChatMessage[]
  onSend: (text: string) => void
  disabled?: boolean
}

export default function ChatPanel({ messages, onSend, disabled }: Props) {
  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setInput('')
  }

  return (
    <div className="chat-panel">
      <div className="chat-messages" ref={listRef}>
        {messages.length === 0 ? (
          <div className="chat-empty">No messages yet</div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`chat-message chat-message-${m.type}`}
              data-role={m.role}
            >
              {m.type === 'user' && m.role && (
                <span className="chat-message-sender">
                  {m.role === 'white' ? 'White' : 'Black'}:
                </span>
              )}
              <span className="chat-message-text">{m.text}</span>
            </div>
          ))
        )}
      </div>
      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          maxLength={500}
          disabled={disabled}
        />
        <button type="submit" className="chat-send" disabled={disabled || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  )
}
