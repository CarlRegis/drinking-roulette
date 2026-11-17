<template>
  <div class="result-chart">
    <div v-for="item in items" :key="item.id" class="chart-row">
      <span class="chart-label" :title="item.name">{{ item.name }}</span>
      <div class="chart-track">
        <div
          class="chart-fill"
          :style="{ width: widthFor(item), background: item.color }"
        />
      </div>
      <span class="chart-value">{{ formatValue(item.totalMs) }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatValue } from 'src/utils/time'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  }
})

const maxMs = computed(() => Math.max(1, ...props.items.map((item) => item.totalMs)))

function widthFor(item) {
  if (!item.totalMs) return '0%'

  const percent = (item.totalMs / maxMs.value) * 100
  return `${Math.max(4, percent)}%`
}
</script>
