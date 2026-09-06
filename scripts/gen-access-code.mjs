// Prints a fresh member access code and session secret.
// Run: npm run gen:code
//
// Used at term rollover, or immediately if a code leaks. Rotating
// SESSION_SECRET additionally invalidates every live session, which is the
// emergency lever when a code has escaped mid-term.
import { randomInt, randomBytes } from 'node:crypto'

// Same unambiguous alphabet as src/lib/reference.ts — no I, L, O or U, so a
// code read aloud or copied off a whiteboard can't be mistyped.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const group = (n) =>
  Array.from({ length: n }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')

const code = `SOF-${group(4)}-${group(4)}-${group(4)}`
const bits = Math.round(12 * Math.log2(ALPHABET.length))

console.log(`MEMBER_ACCESS_CODE=${code}`)
console.log(`SESSION_SECRET=${randomBytes(32).toString('base64url')}`)
console.log(`\n# ~${bits} bits of entropy. Paste into .env.local.`)
console.log('# Rotating SESSION_SECRET signs every live member out.')
