<template>
  <div
    class="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700/50 cursor-pointer"
    :class="{ 'bg-primary-50 dark:bg-primary-900/10': selected }"
    @click="$emit('open')"
    @contextmenu.prevent="$emit('contextmenu', $event)"
  >
    <input
      type="checkbox"
      :checked="selected"
      class="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 dark:bg-gray-700"
      @click.stop
      @change="$emit('select')"
    />

    <div class="flex items-center gap-2 flex-1 min-w-0">
      <FileIcon
        :mime-type="file.mime_type || ''"
        :is-directory="!!file.is_directory"
        size="sm"
      />
      <span class="text-sm truncate">{{ file.name }}</span>
      <span v-if="file.visibility === 'shared'" class="text-xs text-primary-500 flex-shrink-0">
        {{ $t('file.share') }}
      </span>
    </div>

    <span class="text-xs text-gray-400 w-24 text-right hidden sm:block">
      {{ formatSize(file.size) }}
    </span>
    <span class="text-xs text-gray-400 w-32 text-right hidden md:block">
      {{ formatDate(file.updated_at) }}
    </span>
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString();
}
</script>
