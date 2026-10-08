import { useRef } from 'react'
import { ChevronDown, ChevronRight, MessageCircle, Settings2, Share2, UserPlus, Zap } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { LEVEL, STATUS } from '../data/trip'
import { formatDistance, formatKm, timeAgo } from '../lib/geo'
import ChatPanel from './ChatPanel'
import { Avatar, RoleTag, StatusText } from './ui'

export const PEEK_HEIGHT = 250
export const DETAIL_HEIGHT = 300

function HealthDot({ level }) {
  const lv = LEVEL[level] || LEVEL.info
  return <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: lv.color, boxShadow: `0 0 0 4px ${lv.soft}` }} />
}

function MyStatusButton({ me, onClick }) {
  const st = STATUS[me.status] || STATUS.riding
  const isRiding = me.status === 'riding'
  return (
    <button onClick={onClick} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-brand pl-3 pr-4 text-[13.5px] font-bold text-white shadow-[0_4px_12px_rgba(26,115,232,0.3)] active:scale-95">
      {isRiding ? <Zap size={16} fill="currentColor" /> : <st.Icon size={16} />}
      {isRiding ? 'Status' : st.label}
    </button>
  )
}

function FriendChip({ friend, onClick }) {
  const lv = LEVEL[(STATUS[friend.state] || STATUS.riding).level]
  const warn = friend.state !== 'riding'
  return (
    <button onClick={onClick} className={`flex w-[76px] shrink-0 flex-col items-center gap-1.5 active:scale-95 ${friend.state === 'offline' ? 'opacity-60' : ''}`}>
      <Avatar member={friend} size={54} />
      <span className="mt-1 max-w-[72px] truncate text-[13px] font-bold leading-4">{friend.name}</span>
      <span className="text-[12px] font-semibold leading-3" style={{ color: warn ? lv.text : '#6B7280' }}>
        {friend.fromMe != null ? formatDistance(friend.fromMe) : 'No GPS yet'}
      </span>
    </button>
  )
}

function ConvoyStrip({ members }) {
  const ms = members.filter((m) => m.along != null)
  if (ms.length < 2) return null
  const ps = ms.map((m) => m.along)
  const min = Math.min(...ps)
  const span = Math.max(1, Math.max(...ps) - min)
  const pack = ms.filter((m) => m.inPack).map((m) => m.along)
  const x = (p) => 5 + ((p - min) / span) * 90
  return (
    <div className="mt-3">
      <div className="relative h-12">
        <div className="absolute left-0 right-0 top-[22px] h-1 rounded-full bg-line" />
        {pack.length > 1 && (
          <div
            className="absolute top-[12px] h-6 rounded-full border border-green-400 bg-green-50"
            style={{ left: `calc(${x(Math.min(...pack))}% - 16px)`, width: `calc(${x(Math.max(...pack)) - x(Math.min(...pack))}% + 32px)` }}
          />
        )}
        {ms.map((m) => (
          <span key={m.id} className="absolute top-[8px] -ml-4" style={{ left: `${x(m.along)}%` }}>
            {m.you ? (
              <span className="flex h-8 w-8 items-center justify-center"><span className="h-5 w-5 rounded-full border-[3px] border-white bg-brand shadow" /></span>
            ) : (
              <Avatar member={m} size={32} badge={false} />
            )}
          </span>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] font-bold uppercase tracking-wide text-ink-3">
        <span>Back</span>
        <span>Front</span>
      </div>
    </div>
  )
}

function AlertRow({ alert, member, now, onAction }) {
  const lv = LEVEL[alert.level] || LEVEL.info
  const canAct = alert.action && (member?.latlng || alert.regroup)
  return (
    <div className="rounded-2xl border p-3.5" style={{ borderColor: alert.level === 'danger' ? '#FCA5A5' : '#E5E7EB', background: alert.level === 'danger' ? '#FEF2F2' : '#fff' }}>
      <div className="flex gap-3">
        {member ? <Avatar member={member} size={40} /> : <span className="h-10 w-10 shrink-0 rounded-full" style={{ background: lv.soft }} />}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[14.5px] font-bold leading-5">{alert.title}</span>
            <span className="shrink-0 text-[12px] font-semibold text-ink-3">{timeAgo(now - alert.at)}</span>
          </div>
          <p className="mt-0.5 text-[13px] font-medium leading-[18px] text-ink-2">{alert.body}</p>
        </div>
      </div>
      {canAct && (
        <button
          onClick={() => onAction(alert)}
          className="mt-3 h-11 w-full rounded-xl text-[14px] font-bold"
          style={alert.level === 'danger' ? { background: '#E5383B', color: '#fff' } : { background: lv.soft, color: lv.text }}
        >
          {alert.action}
        </button>
      )}
    </div>
  )
}

export function InviteCard({ code, onShare, compact }) {
  return (
    <div className={`flex items-center gap-4 rounded-3xl border border-line ${compact ? 'p-3' : 'p-4'}`}>
      <div className="rounded-xl bg-white p-1 ring-1 ring-line">
        <QRCodeSVG value={`WayTogether trip code: ${code}`} size={compact ? 72 : 88} level="M" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-bold uppercase tracking-wide text-ink-3">Trip code</div>
        <div className="font-mono text-[26px] font-bold tracking-wider">{code}</div>
        <button onClick={onShare} className="mt-1.5 flex h-9 items-center gap-1.5 rounded-full bg-blue-50 px-3.5 text-[13px] font-bold text-brand">
          <Share2 size={15} /> Invite friends
        </button>
      </div>
    </div>
  )
}

function duration(ms) {
  const m = Math.max(0, Math.round(ms / 60000))
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`
}

export default function ConvoySheet({
  me, friends, members, health, alerts, unread, markSeen, messages, unreadChat, markChatSeen, onSend,
  progress, trip, code, now, stats, tab, setTab, expanded, setExpanded,
  onSelectFriend, onOpenStatus, onAlertAction, onInvite, onOptions, detail,
}) {
  const drag = useRef(null)
  const byId = Object.fromEntries(members.map((m) => [m.id, m]))

  const onHandleDown = (e) => {
    drag.current = e.clientY
  }
  const onHandleUp = (e) => {
    if (drag.current == null) return
    const dy = e.clientY - drag.current
    drag.current = null
    if (dy < -24) setExpanded(true)
    else if (dy > 24) setExpanded(false)
    else setExpanded(!expanded)
  }
  const openTab = (t) => {
    setTab(t)
    setExpanded(true)
    if (t === 'alerts') markSeen()
    if (t === 'chat') markChatSeen()
  }
  const etaText = progress ? new Date(progress.eta).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : null

  return (
    <section
      aria-label="Your convoy"
      className="absolute inset-x-0 bottom-0 z-[1000] flex flex-col rounded-t-[28px] bg-white shadow-[0_-8px_30px_rgba(17,24,39,0.14)] transition-[height] duration-300 ease-out"
      style={{ height: expanded ? 'calc(100% - 84px)' : detail ? DETAIL_HEIGHT : PEEK_HEIGHT }}
    >
      <button
        aria-label={expanded ? 'Collapse' : 'Expand'}
        onPointerDown={onHandleDown}
        onPointerUp={onHandleUp}
        className="flex h-6 w-full shrink-0 items-center justify-center"
        style={{ touchAction: 'none' }}
      >
        <span className="h-1.5 w-10 rounded-full bg-gray-300" />
      </button>

      {detail ? (
        detail
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 px-5 pb-3">
            <button onClick={() => openTab('trip')} className="min-w-0 flex-1 text-left">
              <div className="flex items-center gap-2">
                <HealthDot level={health.level} />
                <span className="truncate text-[17px] font-extrabold tracking-tight">{health.title}</span>
              </div>
              <div className="mt-0.5 truncate pl-[18px] text-[13px] font-medium text-ink-3">{health.line}</div>
            </button>
            {!expanded && (
              <button onClick={() => openTab('chat')} aria-label="Group chat" className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-canvas text-ink-2 active:scale-95">
                <MessageCircle size={19} />
                {unreadChat > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-extrabold text-white">{unreadChat}</span>}
              </button>
            )}
            {me && <MyStatusButton me={me} onClick={onOpenStatus} />}
            {expanded && (
              <button onClick={() => setExpanded(false)} aria-label="Close panel" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-canvas text-ink-2 active:scale-95">
                <ChevronDown size={22} />
              </button>
            )}
          </div>

          {!expanded &&
            (friends.length ? (
              <div className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 pt-1">
                {friends.map((f) => (
                  <FriendChip key={f.id} friend={f} onClick={() => onSelectFriend(f.id)} />
                ))}
                <button onClick={onInvite} className="flex w-[76px] shrink-0 flex-col items-center gap-1.5 active:scale-95">
                  <span className="flex h-[54px] w-[54px] items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-ink-3">
                    <UserPlus size={22} />
                  </span>
                  <span className="mt-1 text-[13px] font-bold leading-4 text-ink-3">Invite</span>
                </button>
              </div>
            ) : (
              <div className="px-5">
                <InviteCard code={code} onShare={onInvite} compact />
              </div>
            ))}

          {expanded && (
            <>
              <div className="mx-5 mb-3 grid grid-cols-4 rounded-full bg-canvas p-1" role="tablist">
                {[
                  ['friends', 'Friends', 0],
                  ['chat', 'Chat', tab === 'chat' ? 0 : unreadChat],
                  ['alerts', 'Alerts', tab === 'alerts' ? 0 : unread],
                  ['trip', 'Trip', 0],
                ].map(([id, label, badge]) => (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => openTab(id)}
                    className={`relative h-10 rounded-full text-[13.5px] font-bold transition ${tab === id ? 'bg-white text-ink shadow-sm' : 'text-ink-3'}`}
                  >
                    {label}
                    {badge > 0 && (
                      <span className="absolute right-1 top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-extrabold text-white">{badge}</span>
                    )}
                  </button>
                ))}
              </div>

              <div className={`no-scrollbar min-h-0 flex-1 px-5 pb-safe ${tab === 'chat' ? 'flex flex-col' : 'overflow-y-auto'}`}>
                {tab === 'friends' && (
                  <>
                    {friends.length === 0 && <div className="py-6"><InviteCard code={code} onShare={onInvite} /></div>}
                    <ul className="flex flex-col">
                      {friends.map((f) => (
                        <li key={f.id}>
                          <button onClick={() => onSelectFriend(f.id)} className={`flex w-full items-center gap-3.5 py-3 text-left active:bg-canvas ${f.state === 'offline' ? 'opacity-70' : ''}`}>
                            <Avatar member={f} size={46} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-[16px] font-bold">{f.name}</span>
                                <RoleTag role={f.role} />
                              </div>
                              <div className="truncate text-[13px] font-medium text-ink-3">
                                <StatusText state={f.state} />
                                {f.state === 'still' && ` ${Math.round(f.stillFor / 60000)} min`}
                                {f.checkin && ' · waiting for reply'}
                                {f.speed > 3 && f.state !== 'offline' && ` · ${f.speed} km/h`} · {timeAgo(now - f.updatedAt)}
                              </div>
                            </div>
                            <span className="text-[15px] font-extrabold tabular-nums">{f.fromMe != null ? formatDistance(f.fromMe) : '—'}</span>
                            <ChevronRight size={18} className="text-gray-300" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {tab === 'chat' && <ChatPanel messages={messages} meId={me?.id} onSend={onSend} onSeen={markChatSeen} />}

                {tab === 'alerts' && (
                  <div className="flex flex-col gap-2.5 pb-4">
                    {alerts.length === 0 && (
                      <div className="py-10 text-center text-[14px] font-semibold text-ink-3">No alerts yet. Stops, wrong turns, offline friends and SOS show up here.</div>
                    )}
                    {alerts.map((a) => (
                      <AlertRow key={a.id} alert={a} member={byId[a.memberId]} now={now} onAction={onAlertAction} />
                    ))}
                  </div>
                )}

                {tab === 'trip' && (
                  <div className="flex flex-col gap-4 pb-6">
                    <div className="rounded-3xl border border-line p-4">
                      <div className="text-[17px] font-extrabold">{trip.name}</div>
                      <div className="text-[13px] font-medium text-ink-3">
                        {trip.start?.name} → {trip.dest?.name} · {trip.type} · led by {trip.leaderName}
                      </div>
                      {progress && (
                        <>
                          <div className="mt-3 h-2 rounded-full bg-canvas">
                            <div className="h-2 rounded-full bg-brand" style={{ width: `${Math.round(Math.min(1, Math.max(0, progress.fraction)) * 100)}%` }} />
                          </div>
                          <div className="mt-2 flex justify-between text-[13px] font-bold">
                            <span>{formatKm(progress.remaining)} to go</span>
                            <span className="text-ink-3">ETA {etaText}</span>
                          </div>
                        </>
                      )}
                      <div className="mt-4 grid grid-cols-3 divide-x divide-line rounded-2xl bg-canvas py-3 text-center">
                        <div>
                          <div className="text-[16px] font-extrabold">{formatKm(stats?.distance || 0)}</div>
                          <div className="text-[11.5px] font-semibold text-ink-3">you rode</div>
                        </div>
                        <div>
                          <div className="text-[16px] font-extrabold">{duration(now - (stats?.startedAt || now))}</div>
                          <div className="text-[11.5px] font-semibold text-ink-3">on the road</div>
                        </div>
                        <div>
                          <div className="text-[16px] font-extrabold">{Math.round(stats?.maxSpeed || 0)} km/h</div>
                          <div className="text-[11.5px] font-semibold text-ink-3">top speed</div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-line p-4">
                      <div className="flex items-center gap-2">
                        <HealthDot level={health.level} />
                        <span className="text-[16px] font-extrabold" style={{ color: (LEVEL[health.level] || LEVEL.info).text }}>{health.title}</span>
                        <span className="ml-auto text-[13px] font-bold text-ink-3">{health.together}/{health.n} together</span>
                      </div>
                      <p className="mt-1 text-[13.5px] font-medium text-ink-2">{health.line}</p>
                      <ConvoyStrip members={members} />
                    </div>

                    <InviteCard code={code} onShare={onInvite} />

                    <button onClick={onOptions} className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-line text-[15px] font-bold text-ink-2">
                      <Settings2 size={18} /> Trip options · change destination · end trip
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}
