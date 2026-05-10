<template>
  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
    <FileCard
      v-for="file in files"
      :key="file.id"
      :file="file"
      :selected="selected.has(file.id)"
      @select="$emit('select', file.id)"
      @open="$emit('open', file.id)"
      @contextmenu="$emit('contextmenu', { fileId: file.id, event: $event })"
    />
  </div>
</template>

<script setup lang="ts">
import type { FileRow } from '@cloudpackage/shared/types';
import FileCard from './FileCard.vue';

defineProps<{
  files: FileRow[];
  selected: Set<string>;
}>();

defineEmits<{
  select: [id: string];
  open: [id: string];
  contextmenu: [payload: { fileId: string; event: MouseEvent }];
}>();
</script>
