import { LEVEL, STATUS, STATUS_OPTIONS } from '../data/trip'
import { ModalSheet } from './ui'

export default function StatusSheet({ open, onClose, current, onPick }) {
  return (
    <ModalSheet open={open} onClose={onClose} title="What's happening?" subtitle="One tap tells your whole convoy.">
      <div className="grid grid-cols-4 gap-x-2 gap-y-4 pb-2">
        {STATUS_OPTIONS.map((o) => {
          const st = STATUS[o.key]
          const Icon = o.Icon || st.Icon
          const lv = LEVEL[o.key === 'riding' ? 'ok' : st.level]
          const active = current === o.key
          return (
            <button key={o.key} onClick={() => onPick(o)} className="flex flex-col items-center gap-2 rounded-2xl py-1 active:scale-95">
              <span
                className="flex h-16 w-16 items-center justify-center rounded-full transition"
                style={{ background: active ? lv.color : lv.soft, color: active ? '#fff' : lv.color }}
              >
                <Icon size={26} strokeWidth={2.2} />
              </span>
              <span className="text-center text-[12.5px] font-bold leading-4 text-ink">{o.label}</span>
            </button>
          )
        })}
      </div>
    </ModalSheet>
  )
}
