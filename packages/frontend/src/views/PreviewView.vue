<template>
  <div class="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
    <div class="h-14 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center px-4 gap-3 shrink-0">
      <button class="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" @click="$router.back()">
        <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </button>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium">{{ fileName || $t('file.preview') }}</p>
        <p v-if="previewConfig" class="truncate text-xs text-gray-500 dark:text-gray-400">{{ previewConfig.mimeType }}</p>
      </div>
      <button class="btn-secondary !text-xs !py-1" @click="downloadFile">{{ $t('file.download') }}</button>
    </div>

    <main class="flex-1 min-h-0 p-4">
      <LoadingSpinner v-if="loading" class="h-full" />
      <ErrorAlert v-else-if="error" :message="error" class="m-4" />
      <PreviewPanel
        v-else-if="previewConfig"
        :type="previewType"
        :src="previewUrl"
        :name="fileName"
        :content="textContent"
        :reason="previewConfig.reason"
        @download="downloadFile"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { apiClient, BASE_URL } from '@/api/client';
import { useAuthStore } from '@/stores/auth.store';
import PreviewPanel from '@/components/preview/PreviewPanel.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import ErrorAlert from '@/components/common/ErrorAlert.vue';

type PreviewStrategy =
  | 'native-image'
  | 'native-video'
  | 'native-audio'
  | 'pdf-viewer'
  | 'code-viewer'
  | 'office-iframe'
  | 'ebook-viewer'
  | 'text-viewer'
  | 'iframe-external'
  | 'unsupported';

type PreviewType = 'image' | 'video' | 'audio' | 'pdf' | 'code' | 'unsupported';

interface PreviewConfig {
  strategy: PreviewStrategy;
  mimeType: string;
  canPreview: boolean;
  reason?: string;
}

const route = useRoute();
const auth = useAuthStore();
const fileId = route.params.id as string;

const fileName = ref('');
const previewConfig = ref<PreviewConfig | null>(null);
const previewUrl = ref('');
const textContent = ref('');
const loading = ref(true);
const error = ref('');

const previewType = computed<PreviewType>(() => {
  switch (previewConfig.value?.strategy) {
    case 'native-image':
      return 'image';
    case 'native-video':
      return 'video';
    case 'native-audio':
      return 'audio';
    case 'pdf-viewer':
      return 'pdf';
    case 'code-viewer':
    case 'text-viewer':
      return 'code';
    default:
      return 'unsupported';
  }
});

function authHeaders(): HeadersInit | undefined {
  return auth.token ? { Authorization: `Bearer ${auth.token}` } : undefined;
}

async function fetchFileBlob(): Promise<Blob> {
  const response = await fetch(`${BASE_URL}/files/${fileId}/download`, {
    headers: authHeaders(),
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

async function loadBinaryPreview(): Promise<void> {
  const blob = await fetchFileBlob();
  previewUrl.value = URL.createObjectURL(blob);
}

async function loadPreview(): Promise<void> {
  const fileRes = await apiClient<{ success: boolean; data: { name: string; mime_type: string | null } }>(`/files/${fileId}`);
  fileName.value = fileRes.data.name;

  const configRes = await apiClient<{ success: boolean; data: PreviewConfig }>(`/preview/config/${fileId}`);
  previewConfig.value = configRes.data;

  if (!configRes.data.canPreview) return;

  if (configRes.data.strategy === 'code-viewer' || configRes.data.strategy === 'text-viewer') {
    const rawRes = await apiClient<{ success: boolean; data: { content: string } }>(`/preview/raw/${fileId}`);
    textContent.value = rawRes.data.content;
  } else if (previewType.value !== 'unsupported') {
    await loadBinaryPreview();
  }
}

onMounted(async () => {
  try {
    await loadPreview();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
});
</script>
