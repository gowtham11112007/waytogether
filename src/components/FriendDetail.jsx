import { Battery, BatteryLow, Loader2, MessageCircle, Navigation2, ShieldQuestion, X } from 'lucide-react'
import { ROLE_LABEL } from '../data/trip'
import { formatDistance, timeAgo } from '../lib/geo'
import { Avatar, StatusText } from './ui'

export default function FriendDetail({ friend, now, onClose, onPing, onCheckIn }) {
  const navUrl = friend.latlng
    ? `https://www.google.com/maps/dir/?api=1&destination=${friend.latlng[0].toFixed(6)},${friend.latlng[1].toFixed(6)}&travelmode=driving`
    : null
  const lowBattery = friend.battery != null && friend.battery < 15
  return (
    <div className="animate-fade-up px-5">
      <div className="flex items-center gap-4">
        <Avatar member={friend} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h2 className="truncate text-[22px] font-extrabold tracking-tight">{friend.name}</h2>
            <span className="shrink-0 text-[13px] font-semibold text-ink-3">{ROLE_LABEL[friend.role]}</span>
          </div>
          <div className="mt-0.5 text-[14px] font-medium text-ink-3">
            <StatusText state={friend.state} />
            {friend.state === 'still' && ` ${Math.round(friend.stillFor / 60000)} min`} · updated {timeAgo(now - friend.updatedAt)}
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-full bg-canvas text-ink-2">
          <X size={20} />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-3 divide-x divide-line rounded-2xl bg-canvas py-3 text-center">
        <div>
          <div className="text-[18px] font-extrabold">{friend.fromMe != null ? formatDistance(friend.fromMe) : '—'}</div>
          <div className="text-[12px] font-semibold text-ink-3">from you</div>
        </div>
        <div>
          <div className="text-[18px] font-extrabold">
            {friend.state === 'offline' ? '—' : friend.speed} <span className="text-[13px]">km/h</span>
          </div>
          <div className="text-[12px] font-semibold text-ink-3">speed</div>
        </div>
        <div>
          <div className={`flex items-center justify-center gap-1 text-[18px] font-extrabold ${lowBattery ? 'text-danger' : ''}`}>
            {lowBattery ? <BatteryLow size={18} /> : <Battery size={18} />}
            {friend.battery != null ? `${Math.round(friend.battery)}%` : '—'}
          </div>
          <div className="text-[12px] font-semibold text-ink-3">battery</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_1fr] gap-2.5">
        <a
          href={navUrl || undefined}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!navUrl}
          className={`flex items-center justify-center gap-2 rounded-full bg-brand py-3.5 text-[15px] font-bold text-white active:scale-[0.98] ${navUrl ? '' : 'pointer-events-none opacity-40'}`}
        >
          <Navigation2 size={18} fill="currentColor" /> Navigate
        </a>
        {friend.checkin ? (
          <span className="flex items-center justify-center gap-2 rounded-full bg-amber-50 py-3.5 text-[14px] font-bold text-amber-700">
            <Loader2 size={17} className="animate-spin" /> Waiting for reply
          </span>
        ) : ['still', 'noreply', 'offline'].includes(friend.state) ? (
          <button onClick={onCheckIn} className="flex items-center justify-center gap-2 rounded-full bg-amber-500 py-3.5 text-[15px] font-bold text-white active:scale-[0.98]">
            <ShieldQuestion size={18} /> Are you OK?
          </button>
        ) : (
          <button onClick={onPing} className="flex items-center justify-center gap-2 rounded-full border border-line py-3.5 text-[15px] font-bold text-brand active:scale-[0.98]">
            <MessageCircle size={18} /> Where are you?
          </button>
        )}
      </div>
    </div>
  )
}
