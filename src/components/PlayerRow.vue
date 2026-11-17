<template>
  <li class="player-row">
    <span class="player-index" :style="{ color, borderColor: color + '66' }">
      {{ index + 1 }}
    </span>

    <div class="player-name-slot">
      <q-input
        v-if="editing"
        ref="editInput"
        v-model="draft"
        dark
        dense
        borderless
        autofocus
        maxlength="18"
        class="edit-input"
        @keydown.enter.prevent="commit"
        @keydown.esc.prevent="cancel"
        @blur="commit"
      />
      <button v-else type="button" class="player-name" @click="startEdit">
        {{ player.name }}
      </button>
    </div>

    <div class="player-actions">
      <q-btn
        flat
        round
        dense
        icon="keyboard_arrow_up"
        aria-label="Move up"
        :disable="index === 0"
        @click="$emit('move', -1)"
      />
      <q-btn
        flat
        round
        dense
        icon="keyboard_arrow_down"
        aria-label="Move down"
        :disable="index === total - 1"
        @click="$emit('move', 1)"
      />
      <q-btn flat round dense icon="edit" aria-label="Rename" @click="startEdit" />
      <q-btn
        flat
        round
        dense
        icon="close"
        class="danger-btn"
        aria-label="Remove player"
        @click="$emit('remove')"
      />
    </div>
  </li>
</template>

<script setup>
import { computed, ref } from 'vue'
import { PLAYER_COLORS } from 'src/utils/palette'

const props = defineProps({
  player: {
    type: Object,
    required: true
  },
  index: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['move', 'remove', 'rename'])

const editing = ref(false)
const draft = ref('')
const editInput = ref(null)

const color = computed(() => PLAYER_COLORS[props.index % PLAYER_COLORS.length])

function startEdit() {
  draft.value = props.player.name
  editing.value = true
}

function commit() {
  if (!editing.value) return

  const nextName = draft.value.trim()
  editing.value = false

  if (nextName && nextName !== props.player.name) {
    emit('rename', nextName)
  }
}

function cancel() {
  editing.value = false
}
</script>
