<template>
  <q-page class="results-page">
    <div class="page-wrap">
      <header class="brand results-brand">
        <div class="brand-badge">🏁</div>
        <div>
          <p class="results-kicker">Session complete</p>
          <h1 class="brand-title">The <span class="grad-text">results</span> are in</h1>
          <p class="brand-sub">
            {{ formatDateTime(game.finishedAt ?? game.startedAt) }}
            · {{ game.mode === 'shuffle' ? 'shuffle mode' : 'set order' }}
          </p>
        </div>
      </header>

      <section class="hero-total glass-card">
        <div class="hero-time">
          <span>Time on the clock</span>
          <strong>{{ formatValue(totalRecordedMs) }}</strong>
        </div>
        <div class="hero-facts">
          <div>
            <span>Rounds</span>
            <strong>{{ roundCount }}</strong>
          </div>
          <div>
            <span>Turns</span>
            <strong>{{ game.turns.length }}</strong>
          </div>
          <div>
            <span>Players</span>
            <strong>{{ game.players.length }}</strong>
          </div>
          <div>
            <span>Wall time</span>
            <strong>{{ formatShort(sessionWallMs) }}</strong>
          </div>
        </div>
      </section>

      <div v-if="fastestTurn && slowestTurn" class="highlight-row">
        <div class="highlight">
          <span class="highlight-icon">⚡</span>
          <div class="highlight-copy">
            <span class="highlight-label">Quickest turn</span>
            <strong>{{ fastestTurn.playerName }}</strong>
            <em>{{ formatPrecise(fastestTurn.durationMs) }}</em>
          </div>
        </div>
        <div class="highlight">
          <span class="highlight-icon">🐢</span>
          <div class="highlight-copy">
            <span class="highlight-label">Longest turn</span>
            <strong>{{ slowestTurn.playerName }}</strong>
            <em>{{ formatPrecise(slowestTurn.durationMs) }}</em>
          </div>
        </div>
      </div>

      <section v-if="leaderboardItems.length" class="glass-card panel">
        <div class="panel-head">
          <h2>Leaderboard</h2>
          <span class="muted">fastest average → slowest</span>
        </div>
        <Leaderboard
          :items="leaderboardItems"
          :unranked="unrankedItems"
          show-champion
        />
      </section>

      <section v-if="chartItems.length" class="glass-card panel">
        <div class="panel-head">
          <h2>Time per player</h2>
          <span class="muted">total on the timer</span>
        </div>
        <ResultChart :items="chartItems" />
      </section>

      <section class="glass-card panel">
        <div class="panel-head">
          <h2>Player breakdown</h2>
          <span class="muted">best / average</span>
        </div>

        <div class="summary-grid">
          <div
            v-for="player in summary"
            :key="player.id"
            class="summary-card"
            :class="{ 'is-empty': !player.turns }"
          >
            <div class="summary-top">
              <span class="summary-name" :style="{ color: player.color }">{{ player.name }}</span>
              <span class="summary-total">{{ formatValue(player.totalMs) }}</span>
            </div>
            <div class="summary-meta">
              <span>{{ plural(player.turns, 'turn') }}</span>
              <span v-if="player.turns">avg {{ formatValue(player.avgMs) }}</span>
              <span v-if="player.turns">best {{ formatPrecise(player.bestMs) }}</span>
              <span v-if="player.pausedTurns">
                <q-icon name="pause_circle" size="13px" /> {{ player.pausedTurns }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section class="glass-card panel">
        <div class="panel-head">
          <h2>Every turn</h2>
          <span class="muted">{{ plural(game.turns.length, 'turn') }}</span>
        </div>

        <div class="rounds">
          <div v-for="group in roundGroups" :key="group.round" class="round-block">
            <div class="round-head">
              <span>Round {{ group.round }}</span>
              <span>{{ formatValue(group.totalMs) }}</span>
            </div>

            <div class="turn-table">
              <div class="turn-head">
                <span>#</span>
                <span>Player</span>
                <span>Time</span>
                <span>Pause</span>
              </div>
              <div v-for="(turn, index) in group.turns" :key="turn.id" class="turn-row">
                <span class="turn-num">{{ index + 1 }}</span>
                <span
                  class="turn-player"
                  :style="{ color: colorFor(turn.playerId, game.players) }"
                >
                  {{ turn.playerName }}
                </span>
                <span class="turn-time">{{ formatPrecise(turn.durationMs) }}</span>
                <span class="turn-pause">
                  <template v-if="turn.pausedCount">
                    <q-icon name="pause_circle" size="15px" />{{ turn.pausedCount }}
                  </template>
                  <span v-else class="turn-dash">—</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="action-stack">
        <q-btn
          class="start-btn"
          no-caps
          unelevated
          icon="replay"
          label="Play again"
          @click="again"
        />
        <div class="control-row">
          <q-btn
            class="ghost-btn"
            outline
            no-caps
            icon="tune"
            label="Change players"
            @click="backToSetup"
          />
          <q-btn
            class="ghost-btn"
            outline
            no-caps
            icon="download"
            label="Export JSON"
            @click="exportResults"
          />
        </div>
      </div>

      <footer class="page-foot">Saved locally · Drinking Roulette v1.0</footer>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'

import ResultChart from 'src/components/ResultChart.vue'
import Leaderboard from 'src/components/Leaderboard.vue'
import { useGame } from 'src/composables/useGame'
import { colorFor } from 'src/utils/palette'
import { downloadJson } from 'src/utils/download'
import { formatDateTime, formatPrecise, formatShort, formatValue, plural } from 'src/utils/time'

const router = useRouter()
const $q = useQuasar()

const {
  game,
  results,
  leaderboard,
  fastestTurn,
  slowestTurn,
  totalRecordedMs,
  roundCount,
  startGame,
  newGame,
  exportData
} = useGame()

const summary = computed(() =>
  results.value.map((player) => ({
    ...player,
    color: colorFor(player.id, game.players)
  }))
)

const chartItems = computed(() =>
  summary.value.map((player) => ({
    id: player.id,
    name: player.name,
    totalMs: player.totalMs,
    color: player.color
  }))
)

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

const sessionWallMs = computed(() => {
  if (!game.startedAt) return 0
  return Math.max(0, (game.finishedAt ?? Date.now()) - game.startedAt)
})

const roundGroups = computed(() => {
  const map = new Map()

  for (const turn of game.turns) {
    if (!map.has(turn.round)) map.set(turn.round, [])
    map.get(turn.round).push(turn)
  }

  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([round, turns]) => ({
      round,
      turns,
      totalMs: turns.reduce((sum, turn) => sum + turn.durationMs, 0)
    }))
})

function again() {
  if (!startGame(game.mode)) {
    $q.notify({ message: 'Add at least 2 players first.', icon: 'error_outline' })
    return
  }

  router.push('/play')
}

function backToSetup() {
  newGame()
  router.push({ name: 'setup' })
}

function exportResults() {
  const stamp = new Date(game.finishedAt ?? Date.now()).toISOString().slice(0, 10)
  downloadJson(`drinking-roulette-results-${stamp}.json`, exportData())
  $q.notify({ message: 'Results exported', icon: 'download_done' })
}

onMounted(() => {
  if (game.phase === 'results') return

  router.replace({ name: game.phase === 'setup' ? 'setup' : 'play' })
})
</script>


