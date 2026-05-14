<template>
  <div class="space-y-3">
    <div v-if="uploads.length === 0" class="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-5 text-center text-sm text-gray-500 dark:text-gray-400">
      {{ $t('upload.noUploads') }}
    </div>

    <div
      v-for="item in uploads"
      :key="item.id"
      class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3"
    >
      <div class="flex items-start gap-3">
        <FileIcon :mime-type="item.file.type" size="sm" class="mt-0.5" />
        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{{ item.file.name }}</p>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ formatSize(item.file.size) }}</p>
            </div>
            <span
              class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
              :class="statusClass(item.status)"
            >
              {{ statusLabel(item.status) }}
            </span>
          </div>

          <div class="mt-3 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              class="h-full rounded-full transition-all"
              :class="barClass(item.status)"
              :style="{ width: `${item.progress}%` }"
            />
          </div>

          <p v-if="item.error" class="mt-2 text-xs text-red-600 dark:text-red-400">{{ item.error }}</p>

          <div class="mt-3 flex flex-wrap justify-end gap-2">
            <button
              v-if="item.status === 'error'"
              type="button"
              class="btn-secondary !px-2 !py-1 !text-xs"
              @click="$emit('retry', item.id)"
            >
              {{ $t('upload.retry') }}
            </button>
            <button
              v-if="item.status === 'queued'"
              type="button"
              class="btn-secondary !px-2 !py-1 !text-xs"
              @click="$emit('cancel', item.id)"
            >
              {{ $t('common.cancel') }}
            </button>
            <button
              v-if="item.status === 'done' || item.status === 'error' || item.status === 'cancelled'"
              type="button"
              class="btn-secondary !px-2 !py-1 !text-xs"
              @click="$emit('remove', item.id)"
            >
              {{ $t('common.clear') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UploadItem, UploadStatus } from '@/composables/useFileUpload';
import FileIcon from '@/components/common/FileIcon.vue';

defineProps<{ uploads: UploadItem[] }>();
defineEmits<{
  retry: [id: string];
  cancel: [id: string];
  remove: [id: string];
}>();

function formatSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function statusLabel(status: UploadStatus): string {
  return {
    queued: 'Queued',
    uploading: 'Uploading',
    done: 'Done',
    error: 'Failed',
    cancelled: 'Cancelled',
  }[status];
}

function statusClass(status: UploadStatus): string {
  return {
    queued: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    uploading: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    done: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    cancelled: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  }[status];
}

function barClass(status: UploadStatus): string {
  return {
    queued: 'bg-gray-400',
    uploading: 'bg-primary-500',
    done: 'bg-green-500',
    error: 'bg-red-500',
    cancelled: 'bg-yellow-500',
  }[status];
}
</script>
