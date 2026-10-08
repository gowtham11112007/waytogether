import { X } from 'lucide-react'
import { LEVEL, STATUS } from '../data/trip'
import { avatarFor } from '../lib/avatar'

export function Avatar({ member, size = 48, ring = true, badge = true }) {
  const st = STATUS[member.state || member.status] || STATUS.riding
  const lv = LEVEL[st.level]
  const showBadge = badge && (member.state || member.status) !== 'riding'
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <img
        src={avatarFor(member)}
        alt=""
        referrerPolicy="no-referrer"
        className="h-full w-full rounded-full bg-white object-cover"
        style={ring ? { boxShadow: `0 0 0 2.5px #fff, 0 0 0 5px ${lv.color}` } : undefined}
      />
      {showBadge && (
        <span
          className="absolute -right-1 -top-1 flex items-center justify-center rounded-full border-[2.5px] border-white"
          style={{ background: lv.color, width: size * 0.42, height: size * 0.42 }}
        >
          <st.Icon size={size * 0.22} strokeWidth={2.6} color="#fff" />
        </span>
      )}
    </span>
  )
}

export function StatusText({ state, className = '' }) {
  const st = STATUS[state] || STATUS.riding
  return (
    <span className={`font-semibold ${className}`} style={{ color: LEVEL[st.level].text }}>
      {st.label}
    </span>
  )
}

export function RoleTag({ role }) {
  if (role === 'leader')
    return <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-brand">Leader</span>
  if (role === 'sweep')
    return <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-info">Sweep</span>
  return null
}

// Modal bottom sheet with a dimmed backdrop.
export function ModalSheet({ open, onClose, title, subtitle, children, tone = 'light' }) {
  if (!open) return null
  return (
    <div className="absolute inset-0 z-[1200] flex flex-col justify-end">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/35" />
      <section
        role="dialog"
        aria-modal="true"
        className={`animate-fade-up relative rounded-t-[28px] px-5 pb-safe pt-2 shadow-2xl ${tone === 'light' ? 'bg-white' : 'bg-ink text-white'}`}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-300" />
        {title && (
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[20px] font-extrabold tracking-tight">{title}</h2>
              {subtitle && <p className="mt-0.5 text-sm font-medium text-ink-3">{subtitle}</p>}
            </div>
            <button onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full bg-canvas text-ink-2">
              <X size={20} />
            </button>
          </div>
        )}
        {children}
      </section>
    </div>
  )
}

export function Toast({ toast, onAction, onClose }) {
  if (!toast) return null
  const lv = LEVEL[toast.level || 'info']
  const member = toast.member
  return (
    <div className="animate-slide-down pointer-events-auto flex items-center gap-3 rounded-2xl bg-white p-3 pr-2 shadow-[0_10px_30px_rgba(17,24,39,0.18)]" role="status">
      {member ? (
        <Avatar member={member} size={40} />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: lv.soft, color: lv.color }}>
          {toast.Icon ? <toast.Icon size={20} strokeWidth={2.4} /> : null}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-bold leading-5">{toast.title}</div>
        {toast.body && <div className="truncate text-[12.5px] font-medium text-ink-3">{toast.body}</div>}
      </div>
      {toast.action ? (
        <button onClick={onAction} className="shrink-0 rounded-full px-3 py-2 text-[13px] font-bold" style={{ background: lv.soft, color: lv.text }}>
          {toast.actionShort || 'View'}
        </button>
      ) : (
        <button onClick={onClose} aria-label="Dismiss" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-3">
          <X size={18} />
        </button>
      )}
    </div>
  )
}

export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-[16px] font-bold text-white shadow-[0_8px_20px_rgba(26,115,232,0.3)] transition active:scale-[0.98] disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-white text-[16px] font-bold text-ink transition active:scale-[0.98] ${className}`}
    >
      {children}
    </button>
  )
}

export function Logo({ size = 36 }) {
  return (
    <span className="inline-flex items-center justify-center rounded-[30%] bg-brand" style={{ width: size, height: size }}>
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 18 C 8 12, 12 9, 19 6" stroke="#fff" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
        <circle cx="6" cy="17" r="2.3" fill="#fff" fillOpacity="0.6" />
        <circle cx="11.5" cy="11.4" r="2.7" fill="#fff" fillOpacity="0.85" />
        <circle cx="18" cy="6.6" r="3.1" fill="#fff" />
      </svg>
    </span>
  )
}

export function ConfirmDialog({ open, title, body, confirmLabel, danger, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div className="absolute inset-0 z-[1800] flex items-center justify-center bg-black/45 p-6" role="alertdialog" aria-modal="true" aria-label={title}>
      <div className="animate-pop w-full max-w-[340px] rounded-3xl bg-white p-6">
        <div className="text-[19px] font-extrabold tracking-tight">{title}</div>
        {body && <p className="mt-1.5 text-[14.5px] font-medium leading-[21px] text-ink-2">{body}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button onClick={onCancel} className="h-12 rounded-2xl border border-line text-[15px] font-bold text-ink">Cancel</button>
          <button onClick={onConfirm} className={`h-12 rounded-2xl text-[15px] font-bold text-white ${danger ? 'bg-danger' : 'bg-brand'}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

export function Toggle({ on, onChange, label, hint, icon }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex w-full items-center gap-3.5 py-3 text-left">
      {icon && <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-canvas text-ink-2">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold">{label}</span>
        {hint && <span className="block text-[12.5px] font-medium text-ink-3">{hint}</span>}
      </span>
      <span className={`relative h-8 w-[52px] shrink-0 rounded-full transition ${on ? 'bg-brand' : 'bg-gray-300'}`}>
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? 'left-[24px]' : 'left-1'}`} />
      </span>
    </button>
  )
}
