const pad2 = (n) => String(n).padStart(2, '0')

/**
 * Split a duration into big display parts for the live timer.
 * @param {number} ms
 * @returns {{ main: string, tenths: string, hours: number, minutes: number, seconds: number }}
 */
export function splitTimer(ms) {
  const safe = Math.max(0, Math.floor(ms))
  const totalTenths = Math.floor(safe / 100)
  const tenths = totalTenths % 10
  const totalSeconds = Math.floor(totalTenths / 10)
  const seconds = totalSeconds % 60
  const totalMinutes = Math.floor(totalSeconds / 60)
  const minutes = totalMinutes % 60
  const hours = Math.floor(totalMinutes / 60)

  const main =
    hours > 0
      ? `${hours}:${pad2(minutes)}:${pad2(seconds)}`
      : `${pad2(minutes)}:${pad2(seconds)}`

  return { main, tenths: String(tenths), hours, minutes, seconds }
}

/**
 * Compact human duration, e.g. 0:42, 12:07, 1:02:33.
 * @param {number} ms
 */
export function formatShort(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '0:00'
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor(totalSeconds / 60) % 60
  const seconds = totalSeconds % 60

  return hours > 0
    ? `${hours}:${pad2(minutes)}:${pad2(seconds)}`
    : `${minutes}:${pad2(seconds)}`
}

/**
 * Precise duration with hundredths, e.g. 0:07.42.
 * @param {number} ms
 */
export function formatPrecise(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '0:00.00'
  const safe = Math.max(0, Math.round(ms))
  const hundredths = Math.floor((safe % 1000) / 10)
  const totalSeconds = Math.floor(safe / 1000)
  const seconds = totalSeconds % 60
  const totalMinutes = Math.floor(totalSeconds / 60)
  const minutes = totalMinutes % 60
  const hours = Math.floor(totalMinutes / 60)

  const head =
    hours > 0 ? `${hours}:${pad2(minutes)}:${pad2(seconds)}` : `${minutes}:${pad2(seconds)}`

  return `${head}.${pad2(hundredths)}`
}

/**
 * Friendly duration for totals: precise under 10s, compact above.
 * @param {number} ms
 */
export function formatValue(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '0:00'
  return ms < 10000 ? formatPrecise(ms) : formatShort(ms)
}

/**
 * Friendly date & time, e.g. "Nov 17, 2026, 8:42 PM".
 * @param {number|string|Date} value
 */
export function formatDateTime(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}

/**
 * Pluralize a count, e.g. 1 turn / 4 turns.
 * @param {number} count
 * @param {string} singular
 */
export function plural(count, singular) {
  return `${count} ${singular}${count === 1 ? '' : 's'}`
}
