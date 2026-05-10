<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="$emit('close')"
    >
      <div class="fixed inset-0 bg-black/40" />

      <div
        class="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-h-[85vh] overflow-auto"
        :class="sizeClass"
      >
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-lg font-semibold">{{ title }}</h2>
          <button class="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" @click="$emit('close')">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="p-5">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  open: boolean;
  title: string;
  size?: 'sm' | 'md' | 'lg';
}>(), { size: 'md' });

defineEmits<{ close: [] }>();

const sizeClass = computed(() => ({
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}[props.size]));
</script>
