<template>
  <div
    class="relative p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md cursor-pointer transition-shadow"
    :class="{ 'ring-2 ring-primary-500 border-primary-500': selected }"
    @click="$emit('open')"
    @contextmenu.prevent="$emit('contextmenu', $event)"
  >
    <div class="absolute top-2 left-2">
      <input
        type="checkbox"
        :checked="selected"
        class="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 dark:bg-gray-700"
        @click.stop
        @change="$emit('select')"
      />
    </div>

    <div class="flex flex-col items-center pt-4">
      <FileIcon
        :mime-type="file.mime_type || ''"
        :is-directory="!!file.is_directory"
        size="lg"
      />
      <p class="mt-2 text-xs text-center truncate w-full" :title="file.name">
        {{ file.name }}
      </p>
      <p class="text-xs text-gray-400 mt-1">
        {{ formatSize(file.size) }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FileRow } from '@cloudpackage/shared/types';
import FileIcon from '@/components/common/FileIcon.vue';

defineProps<{ file: FileRow; selected: boolean }>();
defineEmits<{ select: []; open: []; contextmenu: [event: MouseEvent] }>();

function formatSize(bytes: number): string {
  if (bytes === 0) return '--';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
</script>
