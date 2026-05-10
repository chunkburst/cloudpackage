<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <LoadingSpinner v-if="loading" />
      <ErrorAlert v-else-if="error" :message="error" />
      <template v-else-if="file">
        <FileIcon :mime-type="file.mime_type || ''" size="lg" class="text-center block mb-3" />
        <h2 class="text-lg font-semibold text-center mb-1">{{ file.name }}</h2>
        <p class="text-xs text-gray-400 text-center mb-4">{{ formatSize(file.size) }}</p>
        <div class="flex justify-center gap-3">
          <a :href="`/api/files/${file.id}/download`" class="btn-primary text-sm" download>{{ $t('file.download') }}</a>
          <router-link :to="`/preview/${file.id}`" class="btn-secondary text-sm">{{ $t('file.preview') }}</router-link>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { apiClient } from '@/api/client';
import FileIcon from '@/components/common/FileIcon.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import ErrorAlert from '@/components/common/ErrorAlert.vue';

const route = useRoute();
const token = route.params.token as string;

const file = ref<{ id: string; name: string; mime_type: string; size: number } | null>(null);
const loading = ref(true);
const error = ref('');

function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

onMounted(async () => {
  try {
    const res = await apiClient<{ success: boolean; data: { file: typeof file.value } }>(`/share/${token}`);
    file.value = res.data.file;
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
});
</script>
