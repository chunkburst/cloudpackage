<template>
  <Modal :open="open" :title="$t('file.move')" @close="$emit('close')">
    <div class="space-y-4">
      <p class="text-sm text-gray-600 dark:text-gray-300">
        Moving: {{ fileName }}
      </p>
      <div class="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2 space-y-1">
        <button
          v-for="folder in folders"
          :key="folder.id"
          class="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          :class="{ 'bg-primary-50 dark:bg-primary-900/20': folder.id === selectedId }"
          @click="selectedId = folder.id"
        >
          {{ folder.path || folder.name }}
        </button>
        <p v-if="folders.length === 0" class="text-sm text-gray-400 p-2">No folders</p>
      </div>
      <div class="flex justify-end gap-3">
        <button class="btn-secondary" @click="$emit('close')">{{ $t('common.cancel') }}</button>
        <button class="btn-primary" :disabled="!selectedId" @click="$emit('move', selectedId!)">{{ $t('file.move') }}</button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Modal from '@/components/common/Modal.vue';
import type { FileRow } from '@cloudpackage/shared/types';

defineProps<{
  open: boolean;
  fileName: string;
  folders: FileRow[];
}>();

defineEmits<{ close: []; move: [targetId: string] }>();

const selectedId = ref<string | null>(null);
</script>
