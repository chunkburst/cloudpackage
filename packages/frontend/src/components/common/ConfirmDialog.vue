<template>
  <Modal :open="open" :title="title" size="sm" @close="$emit('cancel')">
    <p class="text-sm text-gray-600 dark:text-gray-300 mb-6">{{ message }}</p>
    <div class="flex justify-end gap-3">
      <button class="btn-secondary" @click="$emit('cancel')">{{ cancelText }}</button>
      <button
        :class="variant === 'danger' ? 'btn-danger' : 'btn-primary'"
        @click="$emit('confirm')"
      >
        {{ confirmText }}
      </button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import Modal from './Modal.vue';

withDefaults(defineProps<{
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}>(), {
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'primary',
});

defineEmits<{ confirm: []; cancel: [] }>();
</script>
