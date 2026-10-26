import { AudioLines, Eye, Flag, LogOut, MapPinned, Music2, Navigation2, Settings, Share2, SlidersHorizontal, Sun, Volume2, XCircle } from 'lucide-react'
import { setSetting, useSettings } from '../lib/settings'
import { speak, voiceAvailable } from '../lib/speech'
import { ModalSheet, Segmented, Toggle } from './ui'

function Row({ icon, label, hint, onClick, danger }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3.5 py-3 text-left active:bg-canvas">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${danger ? 'bg-red-50 text-danger' : 'bg-canvas text-ink-2'}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[15px] font-bold ${danger ? 'text-danger' : ''}`}>{label}</span>
        {hint && <span className="block truncate text-[12.5px] font-medium text-ink-3">{hint}</span>}
      </span>
    </button>
  )
}

export default function TripMenu({ open, onClose, role, trip, onChangeDest, onDropPin, onClearRegroup, onNavigate, onInvite, onFamily, onMusic, onRules, onSettings, onLeave, onEnd }) {
  const settings = useSettings()
  const leader = role === 'leader'
  return (
    <ModalSheet open={open} onClose={onClose} title="Trip options" subtitle={`${trip.name} · code ${trip.code}`}>
      <div className="no-scrollbar -mx-1 max-h-[64vh] overflow-y-auto px-1">
        <div className="divide-y divide-line">
          {leader && <Row icon={<MapPinned size={19} />} label="Change destination" hint={`Now: ${trip.dest?.name}. Everyone's route updates.`} onClick={onChangeDest} />}
          <Row icon={<Flag size={19} />} label={trip.regroup ? 'Move regroup point' : 'Set a regroup point'} hint="Drop a meeting pin everyone can see" onClick={onDropPin} />
          {trip.regroup && <Row icon={<XCircle size={19} />} label="Clear regroup point" hint={trip.regroup.name} onClick={onClearRegroup} />}
          <Row icon={<Navigation2 size={19} />} label="Turn-by-turn in Google Maps" hint={`Directions to ${trip.regroup?.name || trip.dest?.name}`} onClick={onNavigate} />
          <Row icon={<Music2 size={19} />} label="Music" hint={trip.playlist ? 'Trip playlist shared' : 'Controls + trip playlist'} onClick={onMusic} />
          <Row icon={<Share2 size={19} />} label="Invite friends" hint="Share the code or QR" onClick={onInvite} />
          {onFamily && <Row icon={<Eye size={19} />} label="Live view for family" hint="View-only link: they follow the ride, no app needed" onClick={onFamily} />}
          {onRules && <Row icon={<SlidersHorizontal size={19} />} label="Convoy rules" hint={leader ? 'When the group counts as together, behind or off route' : 'Set by the leader for everyone'} onClick={onRules} />}
        </div>

        <div className="mt-3 text-[12px] font-bold uppercase tracking-wide text-ink-3">Map</div>
        <div className="mt-2">
          <Segmented
            label="Map style"
            value={settings.mapStyle}
            onChange={(v) => setSetting('mapStyle', v)}
            options={[['auto', 'Auto'], ['light', 'Default'], ['dark', 'Night'], ['satellite', 'Satellite']]}
          />
        </div>
        <div className="mt-2 divide-y divide-line">
          <Toggle icon={<Sun size={19} />} label="Keep screen on" hint="During trips, so the map stays visible" on={settings.keepAwake} onChange={(v) => setSetting('keepAwake', v)} />
          <Toggle icon={<Volume2 size={19} />} label="Alert sounds" hint="SOS siren, chimes for stops and messages" on={settings.sounds} onChange={(v) => setSetting('sounds', v)} />
          {onSettings && (
            <button onClick={onSettings} className="flex w-full items-center gap-3.5 py-3 text-left active:bg-canvas">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-canvas text-ink-2">
                <Settings size={19} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold">All settings</span>
                <span className="block truncate text-[12.5px] font-medium text-ink-3">Theme, units, alerts, safety, chat</span>
              </span>
            </button>
          )}
          {voiceAvailable() && (
            <Toggle
              icon={<AudioLines size={19} />}
              label="Speak alerts"
              hint="Reads out SOS, stops and messages, so you can keep your eyes on the road"
              on={settings.voice}
              onChange={(v) => {
                setSetting('voice', v)
                if (v) speak('Spoken alerts are on.')
              }}
            />
          )}
        </div>

        <div className="mt-4 grid gap-2.5 pb-2">
          {leader ? (
            <>
              <button onClick={onEnd} className="flex h-13 items-center justify-center gap-2 rounded-2xl bg-danger py-3.5 text-[15.5px] font-bold text-white">
                <XCircle size={19} /> End trip for everyone
              </button>
              <button onClick={onLeave} className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-line text-[15px] font-bold text-ink-2">
                <LogOut size={18} /> Leave (trip continues for others)
              </button>
            </>
          ) : (
            <button onClick={onLeave} className="flex items-center justify-center gap-2 rounded-2xl bg-danger py-3.5 text-[15.5px] font-bold text-white">
              <LogOut size={19} /> Leave trip & stop sharing
            </button>
          )}
        </div>
      </div>
    </ModalSheet>
  )
}
