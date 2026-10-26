import { useEffect, useState } from 'react'
import { RULE_CHOICES } from '../data/trip'
import { formatKm } from '../lib/geo'
import { ModalSheet, PrimaryButton, Segmented } from './ui'

const minutes = (m) => (m === 0 ? 'Off' : `${m} min`)

// The leader decides what counts as together, behind and off route — for the whole convoy at once.
export default function RulesSheet({ open, onClose, rules, canEdit, leaderName, onSave }) {
  const [draft, setDraft] = useState(rules)
  useEffect(() => {
    if (open) setDraft(rules)
  }, [open, rules])
  const set = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }))
  const changed = JSON.stringify(draft) !== JSON.stringify(rules)
  const dist = (values) => values.map((v) => [v, formatKm(v)])
  const rows = [
    ['spread', 'Together means within', 'Riders this close to each other count as one group', dist(RULE_CHOICES.spread)],
    ['behind', 'Alert when someone is this far away', 'Falling behind, or racing ahead of the group', dist(RULE_CHOICES.behind)],
    ['offRoute', 'Off route after', 'How far from the planned route', dist(RULE_CHOICES.offRoute)],
    ['stillMin', 'Ask “Are you OK?” after not moving for', 'Only when they haven’t reported a stop', RULE_CHOICES.stillMin.map((v) => [v, minutes(v)])],
    ['checkinMin', 'Automatic SOS if there’s no answer in', 'Their phone counts down, then alerts everyone', RULE_CHOICES.checkinMin.map((v) => [v, minutes(v)])],
  ]
  return (
    <ModalSheet open={open} onClose={onClose} title="Convoy rules" subtitle={canEdit ? 'They apply to everyone in this trip.' : `Set by ${leaderName || 'the leader'} for everyone.`}>
      <div className="no-scrollbar -mx-1 max-h-[60vh] overflow-y-auto px-1">
        {rows.map(([k, label, hint, options]) => (
          <div key={k} className="border-b border-line py-3 last:border-0">
            <div className="text-[14.5px] font-bold">{label}</div>
            <div className="mb-2 text-[12.5px] font-medium text-ink-3">{hint}</div>
            <Segmented label={label} value={draft[k]} options={options} onChange={set(k)} disabled={!canEdit} />
          </div>
        ))}
      </div>
      {canEdit && (
        <PrimaryButton
          className="mt-3"
          disabled={!changed}
          onClick={() => {
            onSave(draft)
            onClose()
          }}
        >
          Save for everyone
        </PrimaryButton>
      )}
    </ModalSheet>
  )
}
