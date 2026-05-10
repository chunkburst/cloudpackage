<template>
  <div class="space-y-2">
    <div
      v-for="result in results"
      :key="result.id"
      class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
      @click="$emit('open', result.id)"
    >
      <FileIcon :mime-type="result.mime_type || ''" :is-directory="!!result.is_directory" size="sm" />
      <div class="flex-1 min-w-0">
        <p class="text-sm truncate" v-html="highlightName(result.name)" />
        <p class="text-xs text-gray-400 truncate">{{ result.path }}</p>
      </div>
    </div>
    <EmptyState v-if="results.length === 0 && !loading" :message="$t('search.noResults')" />
  </div>
</template>

<script setup lang="ts">
import type { FileRow } from '@cloudpackage/shared/types';
import FileIcon from '@/components/common/FileIcon.vue';
import EmptyState from '@/components/common/EmptyState.vue';

const props = defineProps<{
  results: FileRow[];
  query: string;
  loading: boolean;
}>();

defineEmits<{ open: [id: string] }>();

function highlightName(name: string): string {
  if (!props.query) return name;
  const escaped = props.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return name.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded">$1</mark>');
}
</script>
