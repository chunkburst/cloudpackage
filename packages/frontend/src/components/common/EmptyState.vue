<template>
  <div class="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
    <svg class="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
    <p class="text-sm font-medium">{{ message }}</p>
    <p v-if="description" class="text-xs mt-1">{{ description }}</p>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ message: string; description?: string }>(), {
  message: 'No data',
});
</script>
