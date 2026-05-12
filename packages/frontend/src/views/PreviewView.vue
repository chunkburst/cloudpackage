<template>
  <div class="h-screen flex flex-col">
    <div class="h-14 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center px-4 gap-3 shrink-0">
      <button class="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" @click="$router.back()">
        <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </button>
      <span class="text-sm truncate">{{ fileName }}</span>
      <button class="btn-secondary !text-xs !py-1 ml-auto" @click="downloadFile">{{ $t('file.download') }}</button>
    </div>

    <PreviewPanel
      v-if="previewType"
      :type="previewType"
      :src="previewUrl"
      :name="fileName"
      :content="textContent"
    />
    <LoadingSpinner v-else-if="loading" class="h-full" />
    <ErrorAlert v-else :message="error || 'Preview not available'" class="m-4" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { apiClient, BASE_URL } from '@/api/client';
import { useAuthStore } from '@/stores/auth.store';
import PreviewPanel from '@/components/preview/PreviewPanel.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import ErrorAlert from '@/components/common/ErrorAlert.vue';

const route = useRoute();
const auth = useAuthStore();
const fileId = route.params.id as string;

const fileName = ref('');
const previewType = ref<'image' | 'video' | 'audio' | 'pdf' | 'code' | 'office' | 'ebook' | 'unsupported' | null>(null);
const previewUrl = ref('');
const textContent = ref('');
const loading = ref(true);
const error = ref('');

function getPreviewType(mimeType: string): typeof previewType.value {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('xml')) return 'code';
  if (mimeType.includes('word') || mimeType.includes('excel') || mimeType.includes('powerpoint') || mimeType.includes('openxml')) return 'office';
  if (mimeType.includes('epub') || mimeType.includes('mobi')) return 'ebook';
  return 'unsupported';
}

async function fetchFileBlob(): Promise<Blob> {
  const response = await fetch(`${BASE_URL}/files/${fileId}/download`, {
    headers: auth.token ? { Authorization: `Bearer ${auth.token}` } : undefined,
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.blob();
}

async function downloadFile(): Promise<void> {
  const blob = await fetchFileBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.value;
  link.click();
  URL.revokeObjectURL(url);
}

onMounted(async () => {
  try {
    const res = await apiClient<{ success: boolean; data: { name: string; mime_type: string; size: number } }>(`/files/${fileId}`);
    fileName.value = res.data.name;
    previewType.value = getPreviewType(res.data.mime_type || 'application/octet-stream');

    if (previewType.value === 'code') {
      const blob = await fetchFileBlob();
      textContent.value = await blob.text();
    } else if (previewType.value !== 'unsupported') {
      previewUrl.value = URL.createObjectURL(await fetchFileBlob());
    }
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
});
</script>
