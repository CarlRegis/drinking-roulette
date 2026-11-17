<template>
  <q-page v-if="currentPlayer" class="play-page">
    <div class="play-wrap">
      <header class="play-header">
        <div class="round-chip">
          <span class="round-chip-round">Round {{ game.round }}</span>
          <span class="round-chip-sep" />
          <span>{{ turnLabel }}</span>
        </div>
        <div class="header-actions">
          <q-btn
            class="board-btn"
            flat
            dense
            round
            icon="leaderboard"
            aria-label="Show leaderboard"
            @click="showBoard = true"
          />
          <q-btn
            class="end-btn"
            flat
            dense
            no-caps
            icon="stop_circle"
            label="End"
            @click="confirmEnd"
          />
        </div>
      </header>

      <div class="play-main">
        <Transition name="turn" mode="out-in">
          <div :key="turnKey" class="player-block">
            <div class="turn-kicker">
              {{ paused ? 'Paused' : 'On the clock' }}
            </div>
            <h1 class="player-name" :style="{ color: playerColor }">
              {{ currentPlayer.name }}
            </h1>
          </div>
        </Transition>

        <div class="timer-shell" :class="{ 'is-paused': paused }">
          <span v-if="paused" class="paused-pill">PAUSED</span>
          <TimerDisplay :ms="elapsed" :paused="paused" />
          <p class="timer-caption">
            <template v-if="paused">
              <q-icon name="pause_circle" size="15px" /> Time is frozen — resume when ready
            </template>
            <template v-else>
              Tap NEXT the moment they stop
            </template>
          </p>
        </div>

        <div class="mini-stats">
          <div class="mini-stat">
            <span>Round total</span>
            <strong>{{ formatShort(roundRecordedMs) }}</strong>
          </div>
          <div class="mini-stat">
            <span>Turns</span>
            <strong>{{ game.turns.length }}</strong>
          </div>
          <div class="mini-stat">
            <span>Session</span>
            <strong>{{ formatShort(totalRecordedMs) }}</strong>
          </div>
        </div>

        <button
          v-if="leaderChip"
          type="button"
          class="leader-chip"
          :aria-label="`Leaderboard: ${leaderChip.name} leads with ${formatValue(leaderChip.avgMs)} average`"
          @click="showBoard = true"
        >
          <span class="leader-chip-trophy">🏆</span>
          <span class="leader-chip-name" :style="{ color: leaderChip.color }">
            {{ leaderChip.name }}
          </span>
          <span class="leader-chip-avg">{{ formatValue(leaderChip.avgMs) }} avg</span>
          <q-icon name="leaderboard" size="15px" />
        </button>
      </div>

      <div class="controls">
        <button type="button" class="next-btn" @click="onNext">
          <span>{{ paused ? 'Record &amp; next' : 'Next' }}</span>
          <q-icon name="arrow_forward" size="30px" />
        </button>

        <div class="control-row">
          <q-btn
            class="ghost-btn"
            outline
            no-caps
            :icon="paused ? 'play_arrow' : 'pause'"
            :label="paused ? 'Resume' : 'Pause'"
            @click="onPause"
          />
          <q-btn
            class="ghost-btn"
            outline
            no-caps
            icon="undo"
            label="Undo last"
            :disable="!canUndo"
            @click="onUndo"
          />
        </div>

        <p class="kbd-hint">Space = next · P = pause · Ctrl+Z = undo</p>
      </div>

      <section v-if="queue.length" class="queue-strip" aria-label="Turn order">
        <div
          v-for="(player, index) in queue"
          :key="`${player.id}-${index}`"
          class="queue-pill"
          :class="{ done: index < game.index, current: index === game.index }"
          :style="{ '--pill-color': colorFor(player.id, game.players) }"
        >
          <span class="queue-dot" />
          <span class="queue-name">{{ player.name }}</span>
        </div>
      </section>

      <section v-if="lastTurns.length" class="last-turns">
        <h3>Just recorded</h3>
        <div class="last-list">
          <div v-for="turn in lastTurns" :key="turn.id" class="last-item">
            <span class="last-name">{{ turn.playerName }}</span>
            <span class="last-time">{{ formatPrecise(turn.durationMs) }}</span>
            <span v-if="turn.pausedCount" class="last-paused" title="Paused during turn">
              <q-icon name="pause" size="13px" />{{ turn.pausedCount }}
            </span>
          </div>
        </div>
      </section>
    </div>

    <q-dialog v-model="showBoard" position="bottom">
      <div class="lb-sheet">
        <div class="lb-sheet-head">
          <div>
            <p class="lb-sheet-kicker">Live standings</p>
            <h2>Leaderboard</h2>
          </div>
          <q-btn flat round dense icon="close" aria-label="Close leaderboard" v-close-popup />
        </div>

        <Leaderboard
          :items="leaderboardItems"
          :unranked="unrankedItems"
          :current-player-id="currentPlayer?.id"
        />

        <p class="lb-sheet-note">Average of finished turns · fastest first</p>
      </div>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'

import TimerDisplay from 'src/components/TimerDisplay.vue'
import Leaderboard from 'src/components/Leaderboard.vue'
import { useGame } from 'src/composables/useGame'
import { colorFor } from 'src/utils/palette'
import { formatPrecise, formatShort, formatValue, plural } from 'src/utils/time'

const router = useRouter()
const $q = useQuasar()

const {
  game,
  currentPlayer,
  queuePlayers,
  leaderboard,
  elapsedMs,
  nextTurn,
  pauseTurn,
  resumeTurn,
  undoLastTurn,
  endGame,
  newGame,
  totalRecordedMs
} = useGame()

const tick = ref(Date.now())
let ticker = null

const elapsed = computed(() => {
  // Reading tick.value makes this computed re-evaluate on every timer tick.
  void tick.value
  return elapsedMs()
})

const paused = computed(() => game.phase === 'paused')
const isPlaying = computed(() => game.phase === 'playing')
const turnLabel = computed(() => `Turn ${game.index + 1} of ${game.queue.length}`)
const turnKey = computed(
  () => `${game.round}:${game.index}:${currentPlayer.value?.id ?? 'none'}`
)
const playerColor = computed(() =>
  currentPlayer.value ? colorFor(currentPlayer.value.id, game.players) : '#ffffff'
)
const canUndo = computed(() => game.turns.length > 0)
const queue = queuePlayers
const lastTurns = computed(() => game.turns.slice(-3).reverse())

const showBoard = ref(false)

const leaderboardItems = computed(() =>
  leaderboard.value.ranked.map((player) => ({
    ...player,
    color: colorFor(player.id, game.players)
  }))
)

const unrankedItems = computed(() =>
  leaderboard.value.unranked.map((player) => ({
    ...player,
    color: colorFor(player.id, game.players)
  }))
)

const leaderChip = computed(() => leaderboardItems.value[0] ?? null)

const roundRecordedMs = computed(() => {
  const recorded = game.turns
    .filter((turn) => turn.round === game.round)
    .reduce((sum, turn) => sum + turn.durationMs, 0)

  return recorded + (isPlaying.value ? elapsed.value : 0)
})

function onNext() {
  const turn = nextTurn()
  if (!turn) return

  tick.value = Date.now()
}

function onPause() {
  if (paused.value) {
    resumeTurn()
  } else {
    pauseTurn()
  }

  tick.value = Date.now()
}

function onUndo() {
  const turn = undoLastTurn()
  if (!turn) return

  tick.value = Date.now()
  $q.notify({
    message: `Undid ${turn.playerName} · ${formatPrecise(turn.durationMs)}`,
    icon: 'undo'
  })
}

function confirmEnd() {
  if (!game.turns.length) {
    $q.dialog({
      title: 'Cancel this game?',
      message: 'Nothing has been recorded yet.',
      cancel: true,
      ok: { label: 'Cancel game', color: 'negative', unelevated: true }
    }).onOk(() => {
      newGame()
      router.replace({ name: 'setup' })
    })
    return
  }

  const runningName = currentPlayer.value?.name ?? 'The current player'

  $q.dialog({
    title: 'End the game?',
    message: `${plural(game.turns.length, 'turn')} recorded. ${runningName}'s current timer will be discarded.`,
    cancel: true,
    persistent: true,
    ok: { label: 'End game', color: 'negative', unelevated: true }
  }).onOk(() => {
    endGame()
    router.replace('/results')
  })
}

function onKeydown(event) {
  if (event.defaultPrevented || event.repeat) return
  if (document.querySelector('.q-dialog')) return

  const target = event.target
  const typing =
    target &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable)

  if (typing) return

  const onControl = target?.closest?.('button, a, .q-btn')

  if (!onControl && (event.key === ' ' || event.key === 'Enter')) {
    event.preventDefault()
    onNext()
    return
  }

  if (event.key.toLowerCase() === 'p' && !event.ctrlKey && !event.metaKey) {
    event.preventDefault()
    onPause()
    return
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    onUndo()
  }
}

onMounted(() => {
  if (game.phase === 'setup') {
    router.replace({ name: 'setup' })
    return
  }

  if (game.phase === 'results') {
    router.replace('/results')
    return
  }

  tick.value = Date.now()
  ticker = window.setInterval(() => {
    if (game.phase === 'playing') tick.value = Date.now()
  }, 50)

  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  if (ticker != null) window.clearInterval(ticker)
  window.removeEventListener('keydown', onKeydown)
})
</script>

