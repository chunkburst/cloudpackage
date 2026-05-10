<template>
  <div class="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
    <span class="text-sm font-medium">Collaboration</span>
    <button
      :class="connected ? 'btn-secondary !text-xs !py-1' : 'btn-primary !text-xs !py-1'"
      @click="handleClick"
    >
      {{ connected ? 'Leave' : 'Join' }}
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ connected: boolean }>();
const emit = defineEmits<{ connect: []; disconnect: [] }>();

function handleClick(): void {
  if (props.connected) {
    emit('disconnect');
  } else {
    emit('connect');
  }
}
</script>
