<template>
  <div class="w-full">
    <!-- Header -->
    <div class="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
      <label class="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
        <input
          type="checkbox"
          :checked="allSelected"
          :indeterminate="someSelected && !allSelected"
          class="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 dark:bg-gray-700"
          @change="$emit('selectAll')"
        />
        <span>{{ $t('file.name') }}</span>
      </label>
      <span class="w-24 text-right hidden sm:block">{{ $t('file.size') }}</span>
      <span class="w-32 text-right hidden md:block">{{ $t('file.modified') }}</span>
    </div>

    <FileRow
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
import { computed } from 'vue';
import type { FileRow as FileRowType } from '@cloudpackage/shared/types';
import FileRow from './FileRow.vue';

const props = defineProps<{
  files: FileRowType[];
  selected: Set<string>;
}>();

defineEmits<{
  select: [id: string];
  selectAll: [];
  open: [id: string];
  contextmenu: [payload: { fileId: string; event: MouseEvent }];
}>();

const allSelected = computed(() => props.files.length > 0 && props.files.every((f) => props.selected.has(f.id)));
const someSelected = computed(() => props.files.some((f) => props.selected.has(f.id)) && !allSelected.value);
</script>
