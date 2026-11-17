export const PLAYER_COLORS = [
  '#ff4d9d',
  '#22d3ee',
  '#ffd166',
  '#a78bfa',
  '#4ade80',
  '#fb923c',
  '#f472b6',
  '#38bdf8',
  '#f87171',
  '#c084fc',
  '#34d399',
  '#facc15'
]

/**
 * Stable color for a player, based on their setup-list position.
 * @param {string} playerId
 * @param {{ id: string }[]} players
 */
export function colorFor(playerId, players) {
  const index = Array.isArray(players) ? players.findIndex((p) => p.id === playerId) : -1
  const safeIndex = index < 0 ? 0 : index

  return PLAYER_COLORS[safeIndex % PLAYER_COLORS.length]
}
