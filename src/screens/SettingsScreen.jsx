import { useState } from 'react'
import {
  ArrowLeft, AudioLines, BatteryMedium, Gauge, MessageCircle, Plus, RotateCcw, Shuffle, Store, Sun, Trash2, Vibrate, Volume2, X,
} from 'lucide-react'
import { Avatar, ConfirmDialog, Segmented, Toggle, useEscape } from '../components/ui'
import { chime } from '../lib/alarm'
import { haptic } from '../lib/notify'
import { clearHistory, loadHistory, newId } from '../lib/profile'
import { DEFAULT_QUICK, resetSettings, setNotify, setSetting, useSettings } from '../lib/settings'
import { speak, voiceAvailable } from '../lib/speech'
import { VERSION_LABEL } from '../lib/updates'

function Section({ title, note, children, delay = 0 }) {
  return (
    <section className="animate-rise mt-6" style={{ animationDelay: `${delay}ms` }}>
      <h2 className="px-1 text-[12.5px] font-bold uppercase tracking-wide text-ink-3">{title}</h2>
      <div className="mt-2 rounded-3xl border border-line bg-white px-4">{children}</div>
      {note && <p className="mt-1.5 px-1 text-[12px] font-medium leading-[17px] text-ink-3">{note}</p>}
    </section>
  )
}

// A labelled control (segmented choice, inputs) inside a section.
function Field({ label, hint, children }) {
  return (
    <div className="border-b border-line py-3.5 last:border-0">
      <div className="text-[15px] font-bold">{label}</div>
      {hint && <div className="text-[12.5px] font-medium text-ink-3">{hint}</div>}
      <div className="mt-2.5">{children}</div>
    </div>
  )
}

const Line = ({ children }) => <div className="border-b border-line last:border-0">{children}</div>

const input = 'h-12 w-full min-w-0 rounded-xl border border-line bg-transparent px-3.5 text-[15px] font-semibold outline-none focus:border-brand focus:ring-4 focus:ring-blue-100'

const NOTIFY = [
  ['stops', 'Someone stops', 'Fuel, food, breaks and regroup calls'],
  ['route', 'Someone leaves the route', 'And when they’re back on it'],
  ['spread', 'Someone falls behind or races ahead', 'And when a late friend reaches the group'],
  ['battery', 'A friend’s battery runs low', 'Below 15%'],
  ['members', 'Friends join, leave or go offline', ''],
]

// Everything you can make your own. Saved on this phone; your name and face are shared with your trips.
export default function SettingsScreen({ profile, leaving, onClose, onSaveProfile, onSignOut }) {
  const s = useSettings()
  const [name, setName] = useState(profile.name)
  const [contactName, setContactName] = useState(s.contact?.name || '')
  const [contactPhone, setContactPhone] = useState(s.contact?.phone || '')
  const [reply, setReply] = useState('')
  const [confirm, setConfirm] = useState(null) // { title, body, label, danger, run }
  const [trips, setTrips] = useState(() => loadHistory().length)
  useEscape(!leaving && !confirm, onClose) // with a confirmation open, Escape only closes that

  const quick = s.quickReplies?.length ? s.quickReplies : DEFAULT_QUICK
  const customReplies = quick.join('|') !== DEFAULT_QUICK.join('|')
  const nameOk = name.trim().length >= 2 && name.trim() !== profile.name
  const cleanPhone = (v) => v.replace(/[^0-9+*# ]/g, '').slice(0, 20)
  const contactOk = contactPhone.replace(/\D/g, '').length >= 3
  const contactSaved = !!s.contact && s.contact.name === contactName.trim() && s.contact.phone === contactPhone.trim()

  const addReply = () => {
    const t = reply.trim().slice(0, 40)
    if (!t || quick.includes(t) || quick.length >= 12) return
    setSetting('quickReplies', [...quick, t])
    setReply('')
  }

  return (
    <div className={`absolute inset-0 z-[1350] flex flex-col bg-canvas ${leaving ? 'animate-page-out pointer-events-none' : 'animate-page-in'}`} role="dialog" aria-modal="true" aria-label="Settings">
      <header className="flex shrink-0 items-center gap-2 border-b border-line bg-white px-2 pb-2 pt-safe">
        <button onClick={onClose} aria-label="Back" className="flex h-11 w-11 items-center justify-center rounded-full text-ink-2 active:bg-canvas">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-[19px] font-extrabold tracking-tight">Settings</h1>
      </header>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-10">
        <Section title="Profile">
          <div className="flex items-center gap-4 py-4">
            <span key={`${profile.avatar}-${profile.useAvatar}`} className="animate-pop">
              <Avatar member={{ ...profile, photo: profile.useAvatar ? null : profile.photo }} size={68} ring={false} badge={false} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[18px] font-extrabold">{profile.name}</div>
              <div className="truncate text-[12.5px] font-medium text-ink-3">{profile.email ? `Google · ${profile.email}` : 'Saved on this phone'}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => onSaveProfile({ ...profile, avatar: newId().slice(0, 8), useAvatar: true })}
                  className="flex h-9 items-center gap-1.5 rounded-full bg-blue-50 px-3 text-[13px] font-bold text-brand active:scale-95"
                >
                  <Shuffle size={15} /> New face
                </button>
                {profile.photo && profile.useAvatar && (
                  <button onClick={() => onSaveProfile({ ...profile, useAvatar: false })} className="flex h-9 items-center rounded-full bg-canvas px-3 text-[13px] font-bold text-ink-2 active:scale-95">
                    Use my Google photo
                  </button>
                )}
              </div>
            </div>
          </div>
          <Field label="Your name" hint="What friends see on the map">
            <div className="flex gap-2">
              <input value={name} onChange={(e) => setName(e.target.value.slice(0, 24))} aria-label="Your name" className={input} />
              <button
                disabled={!nameOk}
                onClick={() => onSaveProfile({ ...profile, name: name.trim() })}
                className="h-12 shrink-0 rounded-xl bg-brand px-4 text-[14.5px] font-bold text-white disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </Field>
          <button
            onClick={() =>
              setConfirm({
                title: profile.google ? 'Sign out?' : 'Reset your profile?',
                body: 'Any trip you’re in on this phone is left, and you’ll set up WayTogether again.',
                label: profile.google ? 'Sign out' : 'Reset',
                danger: true,
                run: onSignOut,
              })
            }
            className="w-full py-3.5 text-left text-[15px] font-bold text-danger"
          >
            {profile.google ? 'Sign out' : 'Reset profile'}
          </button>
        </Section>

        <Section title="Appearance" delay={40}>
          <Field label="Theme">
            <Segmented label="Theme" value={s.theme} onChange={(v) => setSetting('theme', v)} options={[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']]} />
          </Field>
          <Field label="Map" hint="Auto uses the Night map in the dark theme">
            <Segmented label="Map style" value={s.mapStyle} onChange={(v) => setSetting('mapStyle', v)} options={[['auto', 'Auto'], ['light', 'Default'], ['dark', 'Night'], ['satellite', 'Satellite']]} />
          </Field>
          <Line>
            <Toggle icon={<Store size={19} />} label="Places on the map" hint="Petrol, hotels, food, hospitals and ATMs" on={s.mapPlaces} onChange={(v) => setSetting('mapPlaces', v)} />
          </Line>
          <Line>
            <Toggle icon={<Gauge size={19} />} label="Speed while riding" hint="Your speed in the corner of the map" on={s.showSpeed} onChange={(v) => setSetting('showSpeed', v)} />
          </Line>
        </Section>

        <Section title="Units" delay={80}>
          <Field label="Distance and speed">
            <Segmented label="Units" value={s.units} onChange={(v) => setSetting('units', v)} options={[['metric', 'Kilometres · km/h'], ['imperial', 'Miles · mph']]} />
          </Field>
          <Field label="Time">
            <Segmented label="Clock" value={s.clock} onChange={(v) => setSetting('clock', v)} options={[['auto', 'Like my phone'], ['12', '12-hour'], ['24', '24-hour']]} />
          </Field>
        </Section>

        <Section title="Alerts" delay={120} note="SOS, accidents, vehicle problems and riders who don’t answer “Are you OK?” always alert you.">
          <Line>
            <Toggle icon={<Volume2 size={19} />} label="Alert sounds" hint="SOS siren and chimes" on={s.sounds} onChange={(v) => setSetting('sounds', v)} />
          </Line>
          <Field label="Volume">
            <Segmented
              label="Volume"
              disabled={!s.sounds}
              value={s.volume}
              onChange={(v) => {
                setSetting('volume', v)
                chime('info') // hear the new level
              }}
              options={[['low', 'Low'], ['medium', 'Medium'], ['high', 'High']]}
            />
          </Field>
          <Line>
            <Toggle
              icon={<Vibrate size={19} />}
              label="Vibration"
              on={s.vibrate}
              onChange={(v) => {
                setSetting('vibrate', v)
                if (v) haptic('ok')
              }}
            />
          </Line>
          {voiceAvailable() && (
            <Line>
              <Toggle
                icon={<AudioLines size={19} />}
                label="Speak alerts"
                hint="Reads out SOS, stops and messages"
                on={s.voice}
                onChange={(v) => {
                  setSetting('voice', v)
                  if (v) speak('Spoken alerts are on.')
                }}
              />
            </Line>
          )}
          <Line>
            <Toggle icon={<MessageCircle size={19} />} label="Chat message sounds" on={s.chatSounds} onChange={(v) => setSetting('chatSounds', v)} />
          </Line>
          <div className="pt-4 text-[12px] font-bold uppercase tracking-wide text-ink-3">Tell me when</div>
          {NOTIFY.map(([k, label, hint]) => (
            <Line key={k}>
              <Toggle label={label} hint={hint || undefined} on={s.notify[k] !== false} onChange={(v) => setNotify(k, v)} />
            </Line>
          ))}
        </Section>

        <Section title="Safety" delay={160}>
          <Field label="Emergency number" hint="Called from the SOS screen. 112 works across India and Europe; 911 in the US.">
            <input
              value={s.emergencyNumber}
              onChange={(e) => setSetting('emergencyNumber', cleanPhone(e.target.value).replace(/ /g, '').slice(0, 15))}
              inputMode="tel"
              placeholder="112"
              aria-label="Emergency number"
              className={input}
            />
          </Field>
          <Field label="Emergency contact" hint="On the SOS screen you can call them, or text them your location">
            <div className="grid gap-2">
              <input value={contactName} onChange={(e) => setContactName(e.target.value.slice(0, 24))} placeholder="Name, e.g. Amma" aria-label="Contact name" className={input} />
              <input value={contactPhone} onChange={(e) => setContactPhone(cleanPhone(e.target.value))} inputMode="tel" placeholder="Phone number" aria-label="Contact phone" className={input} />
              <div className="flex gap-2">
                <button
                  disabled={!contactOk || contactSaved}
                  onClick={() => setSetting('contact', { name: contactName.trim(), phone: contactPhone.trim() })}
                  className="h-11 flex-1 rounded-xl bg-brand text-[14.5px] font-bold text-white disabled:opacity-40"
                >
                  {contactSaved ? 'Saved' : 'Save contact'}
                </button>
                {s.contact && (
                  <button
                    onClick={() => {
                      setSetting('contact', null)
                      setContactName('')
                      setContactPhone('')
                    }}
                    className="h-11 rounded-xl border border-line px-4 text-[14.5px] font-bold text-danger"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </Field>
          <Field label="Hold SOS for" hint="Long enough not to set it off by accident">
            <Segmented label="SOS hold time" value={s.sosHold} onChange={(v) => setSetting('sosHold', v)} options={[[1, '1 sec'], [2, '2 sec'], [3, '3 sec'], [5, '5 sec']]} />
          </Field>
          <Line>
            <Toggle icon={<Sun size={19} />} label="Keep screen on during trips" hint="So the map stays visible on the handlebar" on={s.keepAwake} onChange={(v) => setSetting('keepAwake', v)} />
          </Line>
        </Section>

        <Section title="Privacy" delay={200} note="Your location is shared only while you’re in a trip, and only with that trip.">
          <Line>
            <Toggle icon={<BatteryMedium size={19} />} label="Share my battery level" hint="So friends know if your phone might die" on={s.shareBattery} onChange={(v) => setSetting('shareBattery', v)} />
          </Line>
        </Section>

        <Section title="Trips and chat" delay={240}>
          <Field label="New trips are for" hint="Sets the starting convoy rules (cars spread out more)">
            <Segmented label="Trip type" value={s.tripType} onChange={(v) => setSetting('tripType', v)} options={[['Bike', 'Bikes'], ['Car', 'Cars'], ['Mixed', 'Mixed']]} />
          </Field>
          <Field label="Quick replies" hint="One tap in the trip chat">
            <div className="flex flex-wrap gap-2">
              {quick.map((q) => (
                <span key={q} className="animate-pop flex h-9 items-center gap-1 rounded-full border border-line pl-3 pr-1 text-[13px] font-bold text-ink-2">
                  {q}
                  <button onClick={() => setSetting('quickReplies', quick.filter((x) => x !== q))} aria-label={`Remove ${q}`} className="flex h-7 w-7 items-center justify-center rounded-full text-ink-3 active:bg-canvas">
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
            <form
              className="mt-2.5 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                addReply()
              }}
            >
              <input value={reply} onChange={(e) => setReply(e.target.value.slice(0, 40))} placeholder={quick.length >= 12 ? '12 replies at most' : 'Add a reply'} disabled={quick.length >= 12} aria-label="New quick reply" className={input} />
              <button type="submit" disabled={!reply.trim()} aria-label="Add reply" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand text-white disabled:opacity-40">
                <Plus size={20} />
              </button>
            </form>
            {customReplies && (
              <button onClick={() => setSetting('quickReplies', DEFAULT_QUICK)} className="mt-2 flex items-center gap-1.5 text-[13px] font-bold text-brand">
                <RotateCcw size={14} /> Back to the default replies
              </button>
            )}
          </Field>
        </Section>

        <Section title="Data" delay={280}>
          <button
            disabled={!trips}
            onClick={() =>
              setConfirm({
                title: 'Clear trip history?',
                body: `${trips} past ${trips === 1 ? 'trip' : 'trips'} and their stats are deleted from this phone.`,
                label: 'Clear',
                danger: true,
                run: () => {
                  clearHistory()
                  setTrips(0)
                },
              })
            }
            className="flex w-full items-center gap-3 border-b border-line py-3.5 text-left text-[15px] font-bold text-danger disabled:opacity-40"
          >
            <Trash2 size={18} /> Clear trip history{trips ? ` (${trips})` : ''}
          </button>
          <button
            onClick={() =>
              setConfirm({
                title: 'Reset all settings?',
                body: 'Theme, map, units, alerts, safety and chat settings go back to how they started. Your profile and trips stay.',
                label: 'Reset',
                danger: true,
                run: () => {
                  resetSettings()
                  setContactName('')
                  setContactPhone('')
                },
              })
            }
            className="flex w-full items-center gap-3 py-3.5 text-left text-[15px] font-bold text-ink-2"
          >
            <RotateCcw size={18} /> Reset all settings
          </button>
        </Section>

        <p className="mt-6 text-center text-[12px] font-semibold text-ink-3">WayTogether {VERSION_LABEL}</p>
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        body={confirm?.body}
        confirmLabel={confirm?.label}
        danger={confirm?.danger}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const run = confirm?.run
          setConfirm(null)
          run?.()
        }}
      />
    </div>
  )
}
