<template>
  <div
    class="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center transition-colors"
    :class="{ 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/10': dragging }"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="handleDrop"
  >
    <input
      ref="inputRef"
      type="file"
      class="hidden"
      :multiple="multiple"
      @change="handleInput"
    />

    <svg class="w-10 h-10 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
    <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('file.dropHere') }}</p>
    <p class="text-xs text-gray-400 mt-1">{{ $t('common.or') }}</p>
    <button class="btn-secondary !text-xs mt-2" @click="inputRef?.click()">
      {{ $t('file.upload') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

withDefaults(defineProps<{ multiple?: boolean }>(), { multiple: true });

const emit = defineEmits<{ files: [files: File[]] }>();

const dragging = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);

function handleDrop(e: DragEvent): void {
  dragging.value = false;
  if (e.dataTransfer?.files.length) {
    emit('files', Array.from(e.dataTransfer.files));
  }
}

function handleInput(e: Event): void {
  const target = e.target as HTMLInputElement;
  if (target.files?.length) {
    emit('files', Array.from(target.files));
    target.value = '';
  }
}
</script>
