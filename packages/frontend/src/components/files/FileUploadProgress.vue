<template>
  <div class="space-y-2">
    <div v-for="item in uploads" :key="item.id" class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
      <FileIcon :mime-type="item.file.type" size="sm" />
      <div class="flex-1 min-w-0">
        <p class="text-sm truncate">{{ item.file.name }}</p>
        <div class="mt-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            class="h-full bg-primary-500 rounded-full transition-all"
            :class="{ 'bg-green-500': item.status === 'done', 'bg-red-500': item.status === 'error' }"
            :style="{ width: item.progress + '%' }"
          />
        </div>
      </div>
      <span class="text-xs text-gray-400 w-12 text-right">
        <template v-if="item.status === 'done'">Done</template>
        <template v-else-if="item.status === 'error'">Failed</template>
        <template v-else>{{ item.progress }}%</template>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import FileIcon from '@/components/common/FileIcon.vue';

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'done' | 'error';
}

defineProps<{ uploads: UploadItem[] }>();
</script>
