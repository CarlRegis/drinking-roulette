import { computed, reactive, watch } from 'vue'
import { shuffleArray, uid } from 'src/utils/shuffle'

export const STORAGE_KEY = 'drinking-roulette:state:v1'
export const MAX_PLAYERS = 24
export const MAX_NAME_LENGTH = 18
const HISTORY_LIMIT = 12

function freshState() {
  return {
    version: 1,
    players: [],
    mode: 'order',
    phase: 'setup',
    round: 1,
    queue: [],
    index: 0,
    turns: [],
    startedAt: null,
    finishedAt: null,
    turnStartedAt: null,
    turnAccumulatedMs: 0,
    turnPausedCount: 0,
    history: []
  }
}

function sanitizeName(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH)
}

function sanitizePlayer(player) {
  if (!player || typeof player !== 'object') return null
  const name = sanitizeName(player.name)
  if (!name) return null

  return {
    id: typeof player.id === 'string' && player.id ? player.id : uid(),
    name
  }
}

function sanitizeTurn(turn) {
  if (!turn || typeof turn !== 'object') return null
  const durationMs = Number(turn.durationMs)
  if (!Number.isFinite(durationMs) || durationMs < 0) return null

  return {
    id: typeof turn.id === 'string' && turn.id ? turn.id : uid(),
    playerId: String(turn.playerId ?? ''),
    playerName: sanitizeName(turn.playerName) || 'Player',
    round: Math.max(1, Math.round(Number(turn.round) || 1)),
    index: Math.max(0, Math.round(Number(turn.index) || 0)),
    queue: Array.isArray(turn.queue) ? turn.queue.map(String) : [],
    durationMs: Math.round(durationMs),
    pausedCount: Math.max(0, Math.round(Number(turn.pausedCount) || 0)),
    recordedAt: Number(turn.recordedAt) || Date.now()
  }
}

function sanitizeSession(session) {
  if (!session || typeof session !== 'object') return null
  const turns = Array.isArray(session.turns) ? session.turns.map(sanitizeTurn).filter(Boolean) : []
  if (!turns.length) return null

  return {
    id: typeof session.id === 'string' && session.id ? session.id : uid(),
    startedAt: Number(session.startedAt) || null,
    finishedAt: Number(session.finishedAt) || null,
    mode: session.mode === 'shuffle' ? 'shuffle' : 'order',
    players: Array.isArray(session.players)
      ? session.players.map(sanitizePlayer).filter(Boolean)
      : [],
    rounds: Math.max(1, Math.round(Number(session.rounds) || 1)),
    totalMs: Math.max(0, Number(session.totalMs) || turns.reduce((sum, t) => sum + t.durationMs, 0)),
    turns
  }
}

function loadState() {
  const state = freshState()

  if (typeof localStorage === 'undefined') return state

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return state

    const saved = JSON.parse(raw)
    if (!saved || typeof saved !== 'object') return state

    state.players = Array.isArray(saved.players)
      ? saved.players.map(sanitizePlayer).filter(Boolean)
      : []
    state.mode = saved.mode === 'shuffle' ? 'shuffle' : 'order'
    state.turns = Array.isArray(saved.turns) ? saved.turns.map(sanitizeTurn).filter(Boolean) : []
    state.history = Array.isArray(saved.history)
      ? saved.history.map(sanitizeSession).filter(Boolean).slice(0, HISTORY_LIMIT)
      : []

    state.round = Math.max(1, Math.round(Number(saved.round) || 1))
    state.index = Math.max(0, Math.round(Number(saved.index) || 0))
    state.startedAt = Number(saved.startedAt) || null
    state.finishedAt = Number(saved.finishedAt) || null
    state.turnStartedAt = Number(saved.turnStartedAt) || null
    state.turnAccumulatedMs = Math.max(0, Number(saved.turnAccumulatedMs) || 0)
    state.turnPausedCount = Math.max(0, Math.round(Number(saved.turnPausedCount) || 0))

    const validIds = new Set(state.players.map((p) => p.id))
    state.queue = Array.isArray(saved.queue)
      ? saved.queue.map(String).filter((id) => validIds.has(id))
      : []

    const phase = ['setup', 'playing', 'paused', 'results'].includes(saved.phase)
      ? saved.phase
      : 'setup'
    state.phase = phase

    if (state.phase === 'results' && !state.turns.length) {
      state.phase = 'setup'
    }

    if (state.phase === 'playing' || state.phase === 'paused') {
      if (state.players.length < 2) {
        state.phase = 'setup'
        state.turnStartedAt = null
      } else {
        if (!state.queue.length || state.index >= state.queue.length) {
          state.queue =
            state.mode === 'shuffle'
              ? shuffleArray(state.players.map((p) => p.id))
              : state.players.map((p) => p.id)
          state.index = 0
        }

        if (state.phase === 'paused') {
          state.turnStartedAt = null
        } else if (state.turnStartedAt == null) {
          // A stale/incomplete save: keep the accumulated time but restart the clock.
          state.turnStartedAt = Date.now()
        }
      }
    } else {
      state.turnStartedAt = null
    }
  } catch {
    return freshState()
  }

  return state
}

export const game = reactive(loadState())

function persist() {
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game))
  } catch {
    // Storage full or blocked (private mode) — the app still works in memory.
  }
}

watch(game, persist, { deep: true, flush: 'sync' })

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

export const currentPlayer = computed(
  () => game.players.find((p) => p.id === game.queue[game.index]) ?? null
)

export const queuePlayers = computed(() =>
  game.queue.map((id) => game.players.find((p) => p.id === id)).filter(Boolean)
)

export const isRunning = computed(() => game.phase === 'playing')
export const isPaused = computed(() => game.phase === 'paused')

export const totalRecordedMs = computed(() =>
  game.turns.reduce((sum, turn) => sum + turn.durationMs, 0)
)

export const sessionMs = computed(() => {
  if (!game.startedAt) return 0
  const end = game.finishedAt ?? Date.now()
  return Math.max(0, end - game.startedAt)
})

export const results = computed(() => {
  const map = new Map(
    game.players.map((player) => [
      player.id,
      {
        id: player.id,
        name: player.name,
        turns: 0,
        pausedTurns: 0,
        totalMs: 0,
        bestMs: null,
        worstMs: null
      }
    ])
  )

  for (const turn of game.turns) {
    let entry = map.get(turn.playerId)

    if (!entry) {
      entry = {
        id: turn.playerId,
        name: turn.playerName,
        turns: 0,
        pausedTurns: 0,
        totalMs: 0,
        bestMs: null,
        worstMs: null
      }
      map.set(turn.playerId, entry)
    }

    entry.turns += 1
    entry.totalMs += turn.durationMs
    entry.pausedTurns += turn.pausedCount > 0 ? 1 : 0
    entry.bestMs = entry.bestMs == null ? turn.durationMs : Math.min(entry.bestMs, turn.durationMs)
    entry.worstMs =
      entry.worstMs == null ? turn.durationMs : Math.max(entry.worstMs, turn.durationMs)
  }

  return [...map.values()]
    .map((entry) => ({
      ...entry,
      avgMs: entry.turns > 0 ? entry.totalMs / entry.turns : 0
    }))
    .sort((a, b) => b.totalMs - a.totalMs)
})

/**
 * Fastest average first. Ties on the average share a place; the best single
 * turn only decides who is listed first. Players without a finished turn are
 * kept aside so a live board can show them as "no turns yet".
 */
export const leaderboard = computed(() => {
  const ranked = results.value
    .filter((entry) => entry.turns > 0)
    .slice()
    .sort(
      (a, b) =>
        a.avgMs - b.avgMs ||
        (a.bestMs ?? 0) - (b.bestMs ?? 0) ||
        a.name.localeCompare(b.name)
    )

  let lastAvg = null
  let lastRank = 0

  const withRanks = ranked.map((entry, index) => {
    const avg = Math.round(entry.avgMs)
    const rank = avg === lastAvg ? lastRank : index + 1
    lastAvg = avg
    lastRank = rank

    return { ...entry, rank }
  })

  return {
    ranked: withRanks,
    unranked: results.value.filter((entry) => entry.turns === 0),
    champion: withRanks[0] ?? null
  }
})

export const fastestTurn = computed(() => {
  return game.turns.reduce((best, turn) => {
    if (!best || turn.durationMs < best.durationMs) return turn
    return best
  }, null)
})

export const slowestTurn = computed(() => {
  return game.turns.reduce((worst, turn) => {
    if (!worst || turn.durationMs > worst.durationMs) return turn
    return worst
  }, null)
})

export const roundCount = computed(() => {
  if (!game.turns.length) return 0
  return Math.max(...game.turns.map((turn) => turn.round))
})

/* ------------------------------------------------------------------ */
/* Timer helpers                                                       */
/* ------------------------------------------------------------------ */

/**
 * Time on the current player's clock. While running this is computed live
 * from the wall clock start, so it stays accurate across renders and reloads.
 * @param {number} [at]
 */
export function elapsedMs(at = Date.now()) {
  if (game.phase === 'playing' && game.turnStartedAt != null) {
    return game.turnAccumulatedMs + Math.max(0, at - game.turnStartedAt)
  }

  return game.turnAccumulatedMs
}

/* ------------------------------------------------------------------ */
/* Setup actions                                                       */
/* ------------------------------------------------------------------ */

export function addPlayer(rawName) {
  if (game.phase !== 'setup') {
    return { ok: false, message: 'Finish the current game first.' }
  }

  const name = sanitizeName(rawName)
  if (!name) return { ok: false, message: 'Type a name first.' }

  if (game.players.length >= MAX_PLAYERS) {
    return { ok: false, message: `That's the ${MAX_PLAYERS} player limit.` }
  }

  if (game.players.some((player) => player.name.toLowerCase() === name.toLowerCase())) {
    return { ok: false, message: `${name} is already in the game.` }
  }

  game.players.push({ id: uid(), name })
  return { ok: true, name }
}

export function renamePlayer(id, rawName) {
  if (game.phase !== 'setup') return false

  const name = sanitizeName(rawName)
  const player = game.players.find((p) => p.id === id)
  if (!player || !name) return false

  if (
    game.players.some(
      (other) => other.id !== id && other.name.toLowerCase() === name.toLowerCase()
    )
  ) {
    return false
  }

  player.name = name
  return true
}

export function removePlayer(id) {
  if (game.phase !== 'setup') return false
  game.players = game.players.filter((player) => player.id !== id)
  return true
}

export function movePlayer(id, offset) {
  if (game.phase !== 'setup') return false

  const from = game.players.findIndex((player) => player.id === id)
  const to = from + offset
  if (from < 0 || to < 0 || to >= game.players.length) return false

  const [player] = game.players.splice(from, 1)
  game.players.splice(to, 0, player)
  return true
}

export function clearPlayers() {
  if (game.phase !== 'setup') return false
  game.players = []
  return true
}

export function setMode(mode) {
  game.mode = mode === 'shuffle' ? 'shuffle' : 'order'
}

/* ------------------------------------------------------------------ */
/* Game actions                                                        */
/* ------------------------------------------------------------------ */

function buildQueue() {
  const ids = game.players.map((player) => player.id)
  return game.mode === 'shuffle' ? shuffleArray(ids) : ids
}

function beginTurn() {
  game.turnStartedAt = Date.now()
  game.turnAccumulatedMs = 0
  game.turnPausedCount = 0
  game.phase = 'playing'
}

/**
 * @param {'order'|'shuffle'} [mode]
 * @param {string[]|null} [firstOrder] ids to use for round 1 (e.g. the previewed shuffle)
 */
export function startGame(mode = game.mode, firstOrder = null) {
  if (game.players.length < 2) return false

  game.mode = mode === 'shuffle' ? 'shuffle' : 'order'
  game.round = 1
  game.turns = []
  game.startedAt = Date.now()
  game.finishedAt = null
  game.index = 0

  const ids = game.players.map((player) => player.id)
  const validFirstOrder =
    Array.isArray(firstOrder) &&
    firstOrder.length === ids.length &&
    ids.every((id) => firstOrder.includes(id))

  game.queue = validFirstOrder ? [...firstOrder] : buildQueue()
  beginTurn()
  return true
}

export function nextTurn() {
  if (game.phase !== 'playing' && game.phase !== 'paused') return null

  const player = currentPlayer.value
  if (!player) return null

  const turn = {
    id: uid(),
    playerId: player.id,
    playerName: player.name,
    round: game.round,
    index: game.index,
    queue: [...game.queue],
    durationMs: Math.round(elapsedMs()),
    pausedCount: game.turnPausedCount,
    recordedAt: Date.now()
  }

  game.turns.push(turn)

  if (game.index + 1 < game.queue.length) {
    game.index += 1
  } else {
    game.round += 1
    game.index = 0
    game.queue = buildQueue()
  }

  beginTurn()
  return turn
}

export function pauseTurn() {
  if (game.phase !== 'playing') return false

  if (game.turnStartedAt != null) {
    game.turnAccumulatedMs += Math.max(0, Date.now() - game.turnStartedAt)
  }

  game.turnStartedAt = null
  game.turnPausedCount += 1
  game.phase = 'paused'
  return true
}

export function resumeTurn() {
  if (game.phase !== 'paused') return false

  game.turnStartedAt = Date.now()
  game.phase = 'playing'
  return true
}

export function undoLastTurn() {
  if (game.phase !== 'playing' && game.phase !== 'paused') return null

  const last = game.turns.pop()
  if (!last) return null

  const validIds = new Set(game.players.map((player) => player.id))
  const restoredQueue = Array.isArray(last.queue)
    ? last.queue.filter((id) => validIds.has(id))
    : []

  game.queue =
    restoredQueue.length > 0 ? restoredQueue : game.players.map((player) => player.id)
  game.round = Math.max(1, last.round)
  game.index = Math.min(Math.max(0, last.index), game.queue.length - 1)

  beginTurn()
  return last
}

export function endGame() {
  if (game.phase !== 'playing' && game.phase !== 'paused') return false
  if (!game.turns.length) return false

  const finishedAt = Date.now()
  const turns = game.turns.map(({ queue, ...turn }) => turn)

  const session = {
    id: uid(),
    startedAt: game.startedAt,
    finishedAt,
    mode: game.mode,
    players: game.players.map((player) => ({ id: player.id, name: player.name })),
    rounds: Math.max(...game.turns.map((turn) => turn.round)),
    totalMs: game.turns.reduce((sum, turn) => sum + turn.durationMs, 0),
    turns
  }

  game.history = [session, ...game.history].slice(0, HISTORY_LIMIT)
  game.finishedAt = finishedAt
  game.phase = 'results'
  game.turnStartedAt = null
  game.turnAccumulatedMs = 0
  game.turnPausedCount = 0
  return true
}

export function newGame() {
  game.phase = 'setup'
  game.round = 1
  game.queue = []
  game.index = 0
  game.turns = []
  game.startedAt = null
  game.finishedAt = null
  game.turnStartedAt = null
  game.turnAccumulatedMs = 0
  game.turnPausedCount = 0
}

export function deleteHistoryEntry(id) {
  game.history = game.history.filter((session) => session.id !== id)
}

export function clearHistory() {
  game.history = []
}

/* ------------------------------------------------------------------ */
/* Backup / restore                                                    */
/* ------------------------------------------------------------------ */

export function exportData() {
  return {
    app: 'drinking-roulette',
    version: 1,
    exportedAt: new Date().toISOString(),
    players: game.players.map((player) => ({ id: player.id, name: player.name })),
    mode: game.mode,
    currentSession: game.turns.length
      ? {
          mode: game.mode,
          startedAt: game.startedAt,
          finishedAt: game.finishedAt,
          turns: game.turns.map(({ queue, ...turn }) => turn)
        }
      : null,
    history: game.history
  }
}

/**
 * Restore players + saved games from an exported JSON file.
 * @param {unknown} payload
 */
export function importData(payload) {
  const source = Array.isArray(payload) ? { players: payload } : payload

  if (!source || typeof source !== 'object') {
    return { ok: false, message: 'That file is not a drinking-roulette backup.' }
  }

  const players = Array.isArray(source.players)
    ? source.players
        .map((entry) =>
          typeof entry === 'string' ? sanitizePlayer({ name: entry }) : sanitizePlayer(entry)
        )
        .filter(Boolean)
        .slice(0, MAX_PLAYERS)
    : []

  if (players.length < 2) {
    return { ok: false, message: 'The backup needs at least 2 players.' }
  }

  game.players = players
  game.mode = source.mode === 'shuffle' ? 'shuffle' : 'order'
  game.history = Array.isArray(source.history)
    ? source.history.map(sanitizeSession).filter(Boolean).slice(0, HISTORY_LIMIT)
    : []
  newGame()

  return { ok: true, message: `Loaded ${players.length} players.` }
}

export function useGame() {
  return {
    game,
    currentPlayer,
    queuePlayers,
    isRunning,
    isPaused,
    totalRecordedMs,
    sessionMs,
    results,
    fastestTurn,
    slowestTurn,
    leaderboard,
    roundCount,
    elapsedMs,
    addPlayer,
    renamePlayer,
    removePlayer,
    movePlayer,
    clearPlayers,
    setMode,
    startGame,
    nextTurn,
    pauseTurn,
    resumeTurn,
    undoLastTurn,
    endGame,
    newGame,
    deleteHistoryEntry,
    clearHistory,
    exportData,
    importData
  }
}
