import { createHash, randomInt } from 'node:crypto'

// Crockford base32 minus I, L, O, U — no character pairs a person can confuse
// when copying a code off a screen by hand, and no accidental words.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const LENGTH = 8

/**
 * A fresh reference code, e.g. SV-3KQ7WM2A.
 *
 * Uses randomInt (CSPRNG, rejection-sampled) rather than Math.random. The code
 * is the only thing standing between a stranger and a submission's contents, so
 * it must not be guessable or sequential — a sequential code would also leak
 * submission order, which invariant 4 exists to prevent.
 */
export function generateReferenceCode(): string {
  let out = ''
  for (let i = 0; i < LENGTH; i++) out += ALPHABET[randomInt(ALPHABET.length)]
  return `SV-${out}`
}

/** SHA-256 hex. Only this is ever persisted — never the code itself. */
export function hashReferenceCode(code: string): string {
  return createHash('sha256').update(normalizeReferenceCode(code)).digest('hex')
}

/**
 * Lookup must survive the ways people actually retype a code: lowercase, lost
 * hyphen, stray whitespace. Normalising here (and in hashing) means all of those
 * hash identically.
 */
export function normalizeReferenceCode(code: string): string {
  return code.trim().toUpperCase().replace(/[\s-]/g, '')
}
