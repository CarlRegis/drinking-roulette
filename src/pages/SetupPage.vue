<template>
  <q-page class="setup-page">
    <div class="page-wrap">
      <header class="brand">
        <div class="brand-badge">🍸</div>
        <div>
          <h1 class="brand-title">Drinking <span class="grad-text">Roulette</span></h1>
          <p class="brand-sub">
            Add the crew, pick an order — then time every single turn.
          </p>
        </div>
      </header>

      <div v-if="hasFinishedGame" class="resume-banner glass-card">
        <q-icon name="flag_circle" size="22px" />
        <div class="resume-copy">
          <strong>Your last game finished.</strong>
          <span>{{ plural(game.turns.length, 'turn') }} · {{ formatShort(totalRecordedMs) }}</span>
        </div>
        <q-btn flat dense no-caps label="View" to="/results" icon-right="arrow_forward" />
      </div>

      <!-- Players --------------------------------------------------- -->
      <section class="glass-card panel">
        <div class="panel-head">
          <h2>Players <span class="count-pill">{{ game.players.length }}</span></h2>
          <q-btn
            v-if="game.players.length"
            flat
            dense
            no-caps
            color="grey-5"
            icon="delete_sweep"
            label="Clear"
            @click="confirmClearPlayers"
          />
        </div>

        <form class="add-row" @submit.prevent="submit">
          <q-input
            ref="nameInput"
            v-model="name"
            class="add-input"
            dark
            outlined
            dense
            placeholder="Add a name…"
            maxlength="18"
            :disable="atLimit"
            hide-bottom-space
          />
          <q-btn
            class="add-btn"
            type="submit"
            unelevated
            no-caps
            icon="add"
            label="Add"
            :disable="!canAdd"
          />
        </form>

        <ul v-if="game.players.length" class="player-list">
          <PlayerRow
            v-for="(player, index) in game.players"
            :key="player.id"
            :player="player"
            :index="index"
            :total="game.players.length"
            @move="onMove(player, $event)"
            @remove="onRemove(player)"
            @rename="onRename(player, $event)"
          />
        </ul>

        <div v-else class="empty-state">
          <span class="empty-emoji">👥</span>
          <p>No players yet.<br />Add at least <strong>2</strong> names to start.</p>
        </div>

        <p v-if="atLimit" class="field-note">Player limit reached ({{ MAX_PLAYERS }}).</p>
        <p v-else class="field-note">Tap a name to rename it. Use the arrows to reorder.</p>
      </section>

      <!-- Order ----------------------------------------------------- -->
      <section class="glass-card panel">
        <div class="panel-head">
          <h2>Play order</h2>
          <span class="muted">applies every round</span>
        </div>

        <q-btn-toggle
          v-model="modeModel"
          class="mode-toggle"
          :options="modeOptions"
          spread
          no-caps
          unelevated
          toggle-color="primary"
          color="transparent"
          text-color="grey-5"
        />

        <p class="mode-help">
          <template v-if="game.mode === 'order'">
            Everyone drinks in the exact order below, round after round.
          </template>
          <template v-else>
            A fresh random order every round. Re-roll to preview a new one.
          </template>
        </p>

        <div v-if="game.players.length" class="order-preview">
          <div class="preview-head">
            <span class="preview-label">
              {{ game.mode === 'order' ? 'Starting order' : 'Next round preview' }}
            </span>
            <q-btn
              v-if="game.mode === 'shuffle'"
              flat
              dense
              no-caps
              icon="casino"
              label="Re-roll"
              @click="reroll"
            />
          </div>

          <div class="order-list">
            <div v-for="(player, index) in previewPlayers" :key="player.id" class="order-chip">
              <span class="order-num">{{ index + 1 }}</span>
              <span class="order-dot" :style="{ background: colorFor(player.id, game.players) }" />
              <span class="order-name">{{ player.name }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Start ----------------------------------------------------- -->
      <section class="cta-panel">
        <q-btn
          class="start-btn"
          no-caps
          unelevated
          icon="play_arrow"
          :label="startLabel"
          :disable="!canStart"
          @click="start"
        />
        <p class="cta-note">
          Round 1 starts automatically. Tap <strong>NEXT</strong> when the drink is done —
          the next timer starts instantly.
        </p>
      </section>

      <!-- Saved games ----------------------------------------------- -->
      <section v-if="game.history.length" class="glass-card panel">
        <div class="panel-head">
          <h2>Saved games <span class="count-pill">{{ game.history.length }}</span></h2>
          <q-btn
            flat
            dense
            no-caps
            color="grey-5"
            label="Clear all"
            @click="confirmClearHistory"
          />
        </div>

        <div class="history-list">
          <div v-for="session in game.history" :key="session.id" class="history-item">
            <div class="history-main">
              <span class="history-date">
                {{ formatDateTime(session.finishedAt ?? session.startedAt) }}
              </span>
              <span class="history-meta">
                {{ session.players.length }} players · {{ plural(session.turns.length, 'turn') }}
                · {{ formatShort(session.totalMs) }}
                · {{ session.mode === 'shuffle' ? 'shuffle' : 'in order' }}
              </span>
            </div>
            <q-btn
              flat
              round
              dense
              icon="delete_outline"
              aria-label="Delete saved game"
              @click="deleteHistoryEntry(session.id)"
            />
          </div>
        </div>
      </section>

      <!-- Data ------------------------------------------------------ -->
      <section class="glass-card panel">
        <div class="panel-head">
          <h2>Your data</h2>
          <span class="muted">stays on this device</span>
        </div>
        <p class="mode-help">
          Players, the running game and saved results live in this browser's local storage —
          nothing is sent anywhere. Export a JSON backup to move it to another device.
        </p>
        <div class="data-actions">
          <q-btn
            class="ghost-btn"
            outline
            no-caps
            icon="download"
            label="Export JSON"
            :disable="!game.players.length && !game.history.length"
            @click="exportBackup"
          />
          <q-btn
            class="ghost-btn"
            outline
            no-caps
            icon="upload"
            label="Import JSON"
            @click="fileInput?.click()"
          />
          <input
            ref="fileInput"
            type="file"
            accept=".json,application/json"
            hidden
            @change="onFileChosen"
          />
        </div>
      </section>

      <footer class="page-foot">Saved locally · Drinking Roulette v1.0</footer>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'

import PlayerRow from 'src/components/PlayerRow.vue'
import {
  MAX_PLAYERS,
  addPlayer,
  clearHistory,
  clearPlayers,
  deleteHistoryEntry,
  exportData,
  importData,
  movePlayer,
  newGame,
  removePlayer,
  renamePlayer,
  setMode,
  startGame,
  totalRecordedMs,
  useGame
} from 'src/composables/useGame'
import { colorFor } from 'src/utils/palette'
import { downloadJson } from 'src/utils/download'
import { formatDateTime, formatShort, plural } from 'src/utils/time'
import { shuffleArray } from 'src/utils/shuffle'

const router = useRouter()
const $q = useQuasar()
const { game } = useGame()

const name = ref('')
const nameInput = ref(null)
const fileInput = ref(null)
const shufflePreview = ref([])

const modeOptions = [
  { label: 'In order', value: 'order', icon: 'format_list_numbered' },
  { label: 'Shuffle', value: 'shuffle', icon: 'shuffle' }
]

const atLimit = computed(() => game.players.length >= MAX_PLAYERS)
const canAdd = computed(() => !atLimit.value && name.value.trim().length > 0)
const canStart = computed(() => game.players.length >= 2)
const hasFinishedGame = computed(() => game.phase === 'results' && game.turns.length > 0)
const startLabel = computed(() =>
  canStart.value ? `Start · ${plural(game.players.length, 'player')}` : 'Add 2+ players to start'
)

const modeModel = computed({
  get: () => game.mode,
  set: (value) => setMode(value)
})

const previewPlayers = computed(() => {
  if (game.mode === 'order') return game.players

  return shufflePreview.value
    .map((id) => game.players.find((player) => player.id === id))
    .filter(Boolean)
})

function notify(message, icon = 'info') {
  $q.notify({ message, icon })
}

function focusAddInput() {
  nameInput.value?.focus()
}

/**
 * The last session's results can still be on screen when the app reopens.
 * The first setup edit starts a fresh setup (saved games keep the results).
 */
function ensureSetup() {
  if (game.phase === 'results') newGame()
}

function submit() {
  if (!canAdd.value) {
    if (atLimit.value) notify(`That's the ${MAX_PLAYERS} player limit.`, 'error_outline')
    return
  }

  ensureSetup()
  const result = addPlayer(name.value)
  if (!result.ok) {
    notify(result.message, 'error_outline')
    return
  }

  name.value = ''
  focusAddInput()
}

function onMove(player, offset) {
  ensureSetup()
  movePlayer(player.id, offset)
}

function onRemove(player) {
  ensureSetup()
  removePlayer(player.id)
}

function reroll() {
  shufflePreview.value = shuffleArray(game.players.map((player) => player.id))
}

function onRename(player, nextName) {
  ensureSetup()
  if (!renamePlayer(player.id, nextName)) {
    notify(`"${nextName}" is already taken.`, 'error_outline')
  }
}

function start() {
  if (!canStart.value) {
    notify('Add at least 2 players first.', 'error_outline')
    return
  }

  const firstOrder = game.mode === 'shuffle' ? previewPlayers.value.map((p) => p.id) : null

  if (!startGame(game.mode, firstOrder)) {
    notify('Could not start the game.', 'error_outline')
    return
  }

  router.push('/play')
}

function confirmClearPlayers() {
  $q.dialog({
    title: 'Clear all players?',
    message: 'Names are removed. Saved games and results stay.',
    cancel: true,
    ok: { label: 'Clear', color: 'negative', unelevated: true }
  }).onOk(() => {
    ensureSetup()
    clearPlayers()
    shufflePreview.value = []
    notify('Players cleared', 'delete_sweep')
  })
}

function confirmClearHistory() {
  $q.dialog({
    title: 'Clear saved games?',
    message: 'All stored results will be deleted from this device.',
    cancel: true,
    ok: { label: 'Delete all', color: 'negative', unelevated: true }
  }).onOk(() => {
    clearHistory()
    notify('Saved games cleared', 'delete_sweep')
  })
}

function exportBackup() {
  const stamp = new Date().toISOString().slice(0, 10)
  downloadJson(`drinking-roulette-${stamp}.json`, exportData())
  notify('Backup downloaded', 'download_done')
}

async function onFileChosen(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  try {
    const payload = JSON.parse(await file.text())
    const result = importData(payload)

    if (!result.ok) {
      notify(result.message, 'error_outline')
      return
    }

    reroll()
    notify(result.message, 'check_circle')
  } catch {
    notify('Could not read that JSON file.', 'error_outline')
  }
}

watch(
  () => game.mode,
  (mode) => {
    if (mode === 'shuffle') reroll()
  }
)

watch(
  () => game.players.map((player) => player.id).join('|'),
  () => {
    const ids = game.players.map((player) => player.id)
    const kept = shufflePreview.value.filter((id) => ids.includes(id))
    const added = ids.filter((id) => !kept.includes(id))
    shufflePreview.value = [...kept, ...added]
  },
  { immediate: true }
)

onMounted(() => {
  if (game.phase === 'playing' || game.phase === 'paused') {
    router.replace('/play')
  }
})
</script>
