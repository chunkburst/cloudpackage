<template>
  <div v-if="totalPages > 1" class="flex items-center justify-between gap-4 py-3">
    <span class="text-sm text-gray-500 dark:text-gray-400">
      {{ startItem }}-{{ endItem }} / {{ total }}
    </span>
    <div class="flex items-center gap-1">
      <button
        :disabled="modelValue <= 1"
        class="btn-secondary !px-2 !py-1"
        @click="go(modelValue - 1)"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        v-for="p in visiblePages"
        :key="p"
        :class="[
          'min-w-[2rem] px-2 py-1 text-sm rounded-md font-medium transition-colors',
          p === modelValue
            ? 'bg-primary-600 text-white'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
        ]"
        @click="go(p)"
      >
        {{ p }}
      </button>

      <button
        :disabled="modelValue >= totalPages"
        class="btn-secondary !px-2 !py-1"
        @click="go(modelValue + 1)"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  modelValue: number;
  total: number;
  pageSize?: number;
}>(), { pageSize: 50 });

const emit = defineEmits<{ 'update:modelValue': [value: number] }>();

const totalPages = computed(() => Math.ceil(props.total / props.pageSize));
const startItem = computed(() => (props.modelValue - 1) * props.pageSize + 1);
const endItem = computed(() => Math.min(props.modelValue * props.pageSize, props.total));

const visiblePages = computed(() => {
  const pages: number[] = [];
  const max = 5;
  let start = Math.max(1, props.modelValue - Math.floor(max / 2));
  let end = start + max - 1;
  if (end > totalPages.value) {
    end = totalPages.value;
    start = Math.max(1, end - max + 1);
  }
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
});

function go(p: number): void {
  emit('update:modelValue', p);
}
</script>
