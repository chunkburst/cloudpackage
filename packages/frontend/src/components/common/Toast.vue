<template>
  <div class="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
    <div
      v-for="toast in ui.toasts"
      :key="toast.id"
      class="pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-slide-in"
      :class="toastClass(toast.type)"
    >
      <span>{{ toast.message }}</span>
      <button class="ml-2 p-0.5 hover:opacity-70" @click="ui.removeToast(toast.id)">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUiStore } from '@/stores/ui.store';

const ui = useUiStore();

function toastClass(type: string): string {
  switch (type) {
    case 'success': return 'bg-green-600 text-white';
    case 'error': return 'bg-red-600 text-white';
    case 'warning': return 'bg-yellow-500 text-white';
    default: return 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900';
  }
}
</script>

<style scoped>
@keyframes slide-in {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
.animate-slide-in {
  animation: slide-in 0.25s ease-out;
}
</style>
