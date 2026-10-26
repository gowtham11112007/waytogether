import { Coffee, FastForward, Fuel, MapPin, Merge, Navigation, OctagonPause, Siren, UtensilsCrossed, Wrench, CircleCheck, Route, TriangleAlert, WifiOff, Hourglass, PhoneOff } from 'lucide-react'

// `color` is the same in both themes; `soft` (backgrounds) and `text` switch with light/dark (see index.css).
export const LEVEL = {
  ok: { color: '#16A34A', soft: 'var(--lv-ok-soft)', text: 'var(--lv-ok-text)' },
  warn: { color: '#F59E0B', soft: 'var(--lv-warn-soft)', text: 'var(--lv-warn-text)' },
  danger: { color: '#E5383B', soft: 'var(--lv-danger-soft)', text: 'var(--lv-danger-text)' },
  info: { color: '#0284C7', soft: 'var(--lv-info-soft)', text: 'var(--lv-info-text)' },
  muted: { color: '#9CA3AF', soft: 'var(--lv-muted-soft)', text: 'var(--lv-muted-text)' },
}

// Convoy rules: what counts as together, behind, off route, and when to check on a stopped rider.
// The leader can change them for the whole trip (Trip options → Convoy rules); cars spread out more than bikes.
export const DEFAULT_RULES = {
  Bike: { spread: 800, behind: 1500, offRoute: 300, stillMin: 5, checkinMin: 2 },
  Car: { spread: 1500, behind: 3000, offRoute: 300, stillMin: 5, checkinMin: 2 },
  Mixed: { spread: 1200, behind: 2500, offRoute: 300, stillMin: 5, checkinMin: 2 },
}
export const rulesFor = (type) => DEFAULT_RULES[type] || DEFAULT_RULES.Bike
export const RULE_CHOICES = {
  spread: [300, 500, 800, 1500, 3000],
  behind: [1000, 1500, 2500, 3000, 5000],
  offRoute: [150, 300, 600, 1000],
  stillMin: [0, 3, 5, 10, 15],
  checkinMin: [1, 2, 5],
}

export const STATUS = {
  riding: { label: 'Riding', level: 'ok', Icon: Navigation },
  fuel: { label: 'Fuel stop', level: 'warn', Icon: Fuel, stop: true },
  problem: { label: 'Vehicle problem', level: 'danger', Icon: Wrench, stop: true },
  food: { label: 'Food stop', level: 'warn', Icon: UtensilsCrossed, stop: true },
  rest: { label: 'Rest break', level: 'warn', Icon: Coffee, stop: true },
  accident: { label: 'Accident', level: 'danger', Icon: Siren, stop: true },
  waiting: { label: 'Waiting', level: 'warn', Icon: OctagonPause, stop: true },
  regroup: { label: 'Regroup here', level: 'info', Icon: MapPin, stop: true },
  offroute: { label: 'Off route', level: 'warn', Icon: Route },
  behind: { label: 'Falling behind', level: 'warn', Icon: TriangleAlert },
  ahead: { label: 'Far ahead', level: 'warn', Icon: FastForward },
  sos: { label: 'SOS', level: 'danger', Icon: Siren, stop: true },
  offline: { label: 'Offline', level: 'muted', Icon: WifiOff },
  still: { label: 'Not moving', level: 'warn', Icon: Hourglass },
  noreply: { label: 'No response', level: 'danger', Icon: PhoneOff },
  // Joined from somewhere else and hasn't reached the route or the group yet.
  joining: { label: 'On the way', level: 'info', Icon: Merge },
}

// The one-tap options in "What's happening?"
export const STATUS_OPTIONS = [
  { key: 'fuel', label: 'Fuel Stop' },
  { key: 'problem', label: 'Bike/Car Problem' },
  { key: 'food', label: 'Food Stop' },
  { key: 'rest', label: 'Rest Break' },
  { key: 'accident', label: 'Accident' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'regroup', label: 'Regroup Here' },
  { key: 'riding', label: 'Back on Road', Icon: CircleCheck },
]

export const ROLE_LABEL = { leader: 'Trip Leader', sweep: 'Sweep Rider', member: 'Member' }

export const TRIP_TYPES = ['Bike', 'Car', 'Mixed']

// "Are you OK?" check-in: the choices the stopped rider sees, and the status each one sets.
export const CHECKIN_OPTIONS = [
  { key: 'ok', label: 'I’m fine, short break', status: 'rest', level: 'ok' },
  { key: 'stop', label: 'Fuel or food stop', status: 'food', level: 'warn' },
  { key: 'problem', label: 'Vehicle problem', status: 'problem', level: 'danger' },
  { key: 'help', label: 'I need help now', status: 'sos', level: 'danger' },
]
