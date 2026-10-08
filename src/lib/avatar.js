import { createAvatar } from '@dicebear/core'
import * as notionists from '@dicebear/notionists'

const BGS = ['c7d2fe', 'bbf7d0', 'fbcfe8', 'bae6fd', 'fde68a', 'ddd6fe', 'fecaca', 'a7f3d0', 'fed7aa']
const cache = new Map()

function hash(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

// A friendly face per person, generated on the phone from their id (no uploads, no network).
export function avatarFor(person) {
  if (person.photo) return person.photo // Google profile photo
  const key = person.id || person.name || 'x'
  if (!cache.has(key)) {
    cache.set(
      key,
      createAvatar(notionists, { seed: key, backgroundColor: [BGS[hash(key) % BGS.length]], radius: 50 }).toDataUri(),
    )
  }
  return cache.get(key)
}
