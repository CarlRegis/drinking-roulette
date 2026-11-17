<template>
  <div class="leaderboard">
    <div
      v-if="showChampion && champion"
      class="lb-champion"
      :style="{ '--champ-color': champion.color }"
    >
      <span class="lb-crown">🏆</span>
      <div class="lb-champ-copy">
        <span class="lb-champ-label">Champion · fastest average</span>
        <strong class="lb-champ-name" :style="{ color: champion.color }">
          {{ champion.name }}
        </strong>
        <span class="lb-champ-meta">
          {{ plural(champion.turns, 'turn') }} · total {{ formatValue(champion.totalMs) }}
        </span>
      </div>
      <strong class="lb-champ-avg">{{ formatValue(champion.avgMs) }}</strong>
    </div>

    <ol v-if="items.length" class="lb-list">
      <li
        v-for="item in items"
        :key="item.id"
        class="lb-row"
        :class="{
          champion: item.rank === 1,
          current: item.id === currentPlayerId
        }"
      >
        <span class="lb-rank" :class="rankClass(item.rank)">
          {{ rankLabel(item.rank) }}
        </span>

        <span class="lb-main">
          <span class="lb-name" :style="{ color: item.color }">{{ item.name }}</span>
          <span class="lb-sub">
            {{ plural(item.turns, 'turn') }} · total {{ formatValue(item.totalMs) }} · best
            {{ formatPrecise(item.bestMs) }}
          </span>
        </span>

        <span class="lb-avg-wrap">
          <span class="lb-avg">{{ formatValue(item.avgMs) }}</span>
          <span v-if="item.id === currentPlayerId" class="lb-now">on the clock</span>
        </span>
      </li>
    </ol>

    <p v-else class="lb-empty">No turns recorded yet.</p>

    <div v-if="unranked.length" class="lb-unranked">
      <span class="lb-unranked-label">No turns yet</span>
      <span
        v-for="player in unranked"
        :key="player.id"
        class="lb-unranked-chip"
        :style="{ '--dot': player.color }"
      >
        {{ player.name }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatPrecise, formatValue, plural } from 'src/utils/time'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  unranked: {
    type: Array,
    default: () => []
  },
  currentPlayerId: {
    type: String,
    default: ''
  },
  showChampion: {
    type: Boolean,
    default: false
  }
})

const champion = computed(() => (props.showChampion ? props.items[0] ?? null : null))

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' }

function rankLabel(rank) {
  return MEDALS[rank] ?? rank
}

function rankClass(rank) {
  return rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : ''
}
</script>
