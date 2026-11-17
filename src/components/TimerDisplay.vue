<template>
  <div class="timer-digits" :class="{ 'is-paused': paused }">
    <span class="timer-main">{{ parts.main }}</span>
    <span class="timer-tenths">.{{ parts.tenths }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { splitTimer } from 'src/utils/time'

const props = defineProps({
  ms: {
    type: Number,
    default: 0
  },
  paused: {
    type: Boolean,
    default: false
  }
})

const parts = computed(() => splitTimer(props.ms))
</script>
