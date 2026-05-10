<template>
  <Modal :open="open" :title="$t('editor.export')" size="sm" @close="$emit('close')">
    <div class="space-y-3">
      <button
        v-for="fmt in formats"
        :key="fmt"
        class="w-full text-left px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
        @click="$emit('export', fmt); $emit('close')"
      >
        {{ fmt }}
      </button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import Modal from '@/components/common/Modal.vue';

defineProps<{ open: boolean }>();
defineEmits<{ close: []; export: [format: string] }>();

const formats = ['Markdown (.md)', 'HTML (.html)', 'PDF (.pdf)', 'Plain Text (.txt)'];
</script>
