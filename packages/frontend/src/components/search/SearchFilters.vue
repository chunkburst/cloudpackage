<template>
  <div class="flex items-center gap-3 flex-wrap">
    <select v-model="mimeType" class="input w-auto !py-1.5 text-xs" @change="handleMimeType">
      <option value="">All types</option>
      <option value="image/">Images</option>
      <option value="video/">Videos</option>
      <option value="audio/">Audio</option>
      <option value="text/">Documents</option>
      <option value="application/pdf">PDFs</option>
    </select>

    <label class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
      <input
        type="checkbox"
        :checked="includeFolders"
        class="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
        @change="handleFolders"
      />
      Include folders
    </label>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{ filter: [filters: { mimeType?: string; isDirectory?: boolean }] }>();
const mimeType = ref('');
const includeFolders = ref(true);

function handleMimeType(): void {
  emit('filter', { mimeType: mimeType.value || undefined });
}

function handleFolders(): void {
  includeFolders.value = !includeFolders.value;
  emit('filter', { isDirectory: includeFolders.value ? undefined : false });
}
</script>
