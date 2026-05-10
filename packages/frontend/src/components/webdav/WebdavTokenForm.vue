<template>
  <Modal :open="open" title="New WebDAV Token" size="sm" @close="$emit('close')">
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div>
        <label class="label">Name</label>
        <input v-model="name" type="text" class="input" required />
      </div>
      <div>
        <label class="label">Allowed Paths</label>
        <input v-model="allowedPaths" type="text" class="input" placeholder="/files/*" />
      </div>
      <div>
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input v-model="readOnly" type="checkbox" class="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500" />
          Read-only
        </label>
      </div>
      <div v-if="createdToken" class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <p class="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Token created &mdash; copy it now:</p>
        <pre class="text-xs break-all bg-white dark:bg-gray-900 p-2 rounded">{{ createdToken }}</pre>
      </div>
      <div class="flex justify-end gap-3">
        <button type="button" class="btn-secondary" @click="$emit('close')">{{ $t('common.cancel') }}</button>
        <button v-if="!createdToken" type="submit" class="btn-primary">Create</button>
      </div>
    </form>
  </Modal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Modal from '@/components/common/Modal.vue';

defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; create: [data: { name: string; allowedPaths: string; readOnly: boolean }] }>();

const name = ref('');
const allowedPaths = ref('');
const readOnly = ref(false);
const createdToken = ref('');

function handleSubmit(): void {
  emit('create', { name: name.value, allowedPaths: allowedPaths.value, readOnly: readOnly.value });
}
</script>
