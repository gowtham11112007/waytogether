import { useEffect, useRef, useState } from 'react'
import { SendHorizontal } from 'lucide-react'
import { Avatar } from './ui'

const QUICK = ['On my way', 'Slow down', 'Wait for me', 'Stopping soon', 'All good', 'Where are you?', 'Take the next exit', 'Let’s regroup']

export default function ChatPanel({ messages, meId, onSend, onSeen }) {
  const [text, setText] = useState('')
  const end = useRef(null)
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
    onSeen?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length])

  const send = (t) => {
    if (!t.trim()) return
    onSend(t)
    setText('')
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-1 pb-2">
        {messages.length === 0 && (
          <p className="py-8 text-center text-[14px] font-semibold text-ink-3">Group chat for this trip. Tap a quick message or type one.</p>
        )}
        <ul className="flex flex-col gap-2">
          {messages.map((m, i) => {
            const mine = m.from === meId
            const showName = !mine && messages[i - 1]?.from !== m.from
            return (
              <li key={m.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : ''}`}>
                {!mine && (showName ? <Avatar member={{ id: m.from, name: m.name, photo: m.photo }} size={28} ring={false} badge={false} /> : <span className="w-7 shrink-0" />)}
                <div className={`max-w-[78%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                  {showName && <span className="mb-0.5 ml-1 text-[11.5px] font-bold text-ink-3">{m.name}</span>}
                  <span className={`rounded-2xl px-3.5 py-2 text-[14.5px] font-medium leading-5 ${mine ? 'rounded-br-md bg-brand text-white' : 'rounded-bl-md bg-canvas text-ink'}`}>{m.text}</span>
                  <span className="mx-1 mt-0.5 text-[10.5px] font-semibold text-ink-3">{new Date(m.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                </div>
              </li>
            )
          })}
        </ul>
        <div ref={end} />
      </div>
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 py-2">
        {QUICK.map((q) => (
          <button key={q} onClick={() => send(q)} className="h-9 shrink-0 rounded-full border border-line px-3.5 text-[13px] font-bold text-ink-2 active:bg-canvas">
            {q}
          </button>
        ))}
      </div>
      <form
        className="flex items-center gap-2 pb-2"
        onSubmit={(e) => {
          e.preventDefault()
          send(text)
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 300))}
          placeholder="Message your convoy"
          aria-label="Message"
          enterKeyHint="send"
          className="h-12 min-w-0 flex-1 rounded-full bg-canvas px-4 text-[15px] font-medium outline-none focus:ring-2 focus:ring-blue-200"
        />
        <button type="submit" aria-label="Send" disabled={!text.trim()} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-white disabled:opacity-40">
          <SendHorizontal size={20} />
        </button>
      </form>
    </div>
  )
}
