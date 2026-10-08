import { Coffee, Fuel, MapPin, Navigation, OctagonPause, Siren, UtensilsCrossed, Wrench, CircleCheck, Route, TriangleAlert, WifiOff, Hourglass, PhoneOff } from 'lucide-react'

export const LEVEL = {
  ok: { color: '#16A34A', soft: '#DCFCE7', text: '#15803D' },
  warn: { color: '#F59E0B', soft: '#FEF3C7', text: '#B45309' },
  danger: { color: '#E5383B', soft: '#FEE2E2', text: '#B91C1C' },
  info: { color: '#0284C7', soft: '#E0F2FE', text: '#0369A1' },
  muted: { color: '#9CA3AF', soft: '#F3F4F6', text: '#6B7280' },
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
  sos: { label: 'SOS', level: 'danger', Icon: Siren, stop: true },
  offline: { label: 'Offline', level: 'muted', Icon: WifiOff },
  still: { label: 'Not moving', level: 'warn', Icon: Hourglass },
  noreply: { label: 'No response', level: 'danger', Icon: PhoneOff },
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
