<template>
  <div class="space-y-3">
    <LoadingSpinner v-if="loading" />

    <template v-else>
      <button
        v-for="result in results"
        :key="result.id"
        type="button"
        class="w-full rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-primary-300 hover:bg-primary-50/40 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary-700 dark:hover:bg-primary-900/10"
        @click="$emit('open', result.id)"
      >
      <div class="flex items-start gap-3">
        <FileIcon :mime-type="result.mime_type || ''" :is-directory="!!result.is_directory" size="sm" class="mt-0.5" />
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
              <template v-for="(part, index) in highlightParts(result.name)" :key="index">
                <mark v-if="part.highlight" class="rounded bg-yellow-200 px-0.5 dark:bg-yellow-800">{{ part.text }}</mark>
                <span v-else>{{ part.text }}</span>
              </template>
            </p>
            <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              {{ result.hit_source === 'content' ? $t('search.contentMatch') : $t('search.nameMatch') }}
            </span>
          </div>
          <p class="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{{ result.path }}</p>
          <p v-if="result.snippet" class="mt-2 line-clamp-2 text-xs leading-5 text-gray-600 dark:text-gray-300">
            <template v-for="(part, index) in snippetParts(result.snippet)" :key="index">
              <mark v-if="part.highlight" class="rounded bg-yellow-200 px-0.5 dark:bg-yellow-800">{{ part.text }}</mark>
              <span v-else>{{ part.text }}</span>
            </template>
          </p>
          <div class="mt-3 flex flex-wrap gap-3 text-xs text-gray-400">
            <span>{{ result.mime_type || $t('file.type') }}</span>
            <span>{{ formatSize(result.size) }}</span>
            <span>{{ formatDate(result.updated_at) }}</span>
          </div>
        </div>
      </div>
      </button>
    </template>

    <EmptyState v-if="results.length === 0 && !loading" :message="$t('search.noResults')" />
  </div>
</template>

<script setup lang="ts">
import type { FileRow } from '@cloudpackage/shared/types';
import FileIcon from '@/components/common/FileIcon.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';

interface SearchResult extends FileRow {
  snippet?: string | null;
  hit_source: 'name' | 'content';
}

interface TextPart {
  text: string;
  highlight: boolean;
}

const props = defineProps<{
  results: SearchResult[];
  query: string;
  loading: boolean;
}>();

defineEmits<{ open: [id: string] }>();

function highlightParts(value: string): TextPart[] {
  const terms = props.query.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [{ text: value, highlight: false }];

  const pattern = new RegExp(`(${terms.map((term) => escapeRegExp(term)).join('|')})`, 'gi');
  return value.split(pattern).filter(Boolean).map((part) => ({
    text: part,
    highlight: terms.some((term) => part.toLowerCase() === term.toLowerCase()),
  }));
}

function snippetParts(snippet: string): TextPart[] {
  return snippet.split(/(<mark>|<\/mark>)/).reduce<TextPart[]>((parts, token) => {
    if (!token) return parts;
    if (token === '<mark>') {
      parts.push({ text: '', highlight: true });
      return parts;
    }
    if (token === '</mark>') return parts;

    const last = parts[parts.length - 1];
    if (last?.highlight && last.text === '') {
      last.text = token;
    } else {
      parts.push({ text: token, highlight: false });
    }
    return parts;
  }, []);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}
</script>
