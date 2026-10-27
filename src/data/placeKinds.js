import { Banknote, BedDouble, Coffee, Fuel, Hamburger, Landmark, Pill, Plus, Stethoscope, Utensils, Wrench } from 'lucide-react'

// Places riders look for, by OpenMapTiles "poi" class: [icon, colour, name when the place has none, icon line weight].
export const PLACE_KINDS = {
  fuel: [Fuel, '#0891B2', 'Petrol pump'],
  lodging: [BedDouble, '#8B5CF6', 'Hotel'],
  hospital: [Plus, '#E5383B', 'Hospital', 3.4],
  doctors: [Stethoscope, '#E5383B', 'Clinic'],
  pharmacy: [Pill, '#E5383B', 'Pharmacy'],
  restaurant: [Utensils, '#F97316', 'Restaurant'],
  fast_food: [Hamburger, '#F97316', 'Fast food'],
  cafe: [Coffee, '#F97316', 'Café'],
  car: [Wrench, '#64748B', 'Vehicle service'],
  bank: [Landmark, '#16A34A', 'Bank'],
  atm: [Banknote, '#16A34A', 'ATM'],
}

// The "Nearby" chips on the home map.
export const NEARBY = [
  { key: 'fuel', label: 'Petrol', classes: ['fuel'], noun: 'petrol pumps' },
  { key: 'food', label: 'Food', classes: ['restaurant', 'fast_food', 'cafe'], noun: 'places to eat' },
  { key: 'stay', label: 'Hotels', classes: ['lodging'], noun: 'hotels' },
  { key: 'health', label: 'Hospitals', classes: ['hospital', 'doctors'], noun: 'hospitals or clinics' },
  { key: 'cash', label: 'ATMs', classes: ['atm', 'bank'], noun: 'ATMs or banks' },
  { key: 'meds', label: 'Pharmacy', classes: ['pharmacy'], noun: 'pharmacies' },
  { key: 'repair', label: 'Repairs', classes: ['car'], noun: 'vehicle repair shops' },
].map((n) => ({ ...n, Icon: PLACE_KINDS[n.classes[0]][0], color: PLACE_KINDS[n.classes[0]][1] }))
