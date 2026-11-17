/**
 * Small id generator that does not depend on any external library.
 */
export function uid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function randomInt(maxExclusive) {
  if (maxExclusive <= 0) return 0

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buffer = new Uint32Array(1)
    // Rejection sampling keeps the distribution uniform for every list size.
    const limit = Math.floor(0xffffffff / maxExclusive) * maxExclusive
    let value

    do {
      crypto.getRandomValues(buffer)
      value = buffer[0]
    } while (value >= limit)

    return value % maxExclusive
  }

  return Math.floor(Math.random() * maxExclusive)
}

/**
 * Fisher-Yates shuffle that returns a new array.
 * @template T
 * @param {T[]} list
 * @returns {T[]}
 */
export function shuffleArray(list) {
  const result = Array.isArray(list) ? [...list] : []

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1)
    const tmp = result[i]
    result[i] = result[j]
    result[j] = tmp
  }

  return result
}
