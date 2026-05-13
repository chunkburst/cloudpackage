<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <LoadingSpinner v-if="loading" />

      <form v-else-if="shareLink?.has_password && !verified" class="space-y-3" @submit.prevent="verifyPassword">
        <ErrorAlert v-if="error" :message="error" @dismiss="error = ''" />
        <div>
          <label class="label">{{ $t('share.password') }}</label>
          <input v-model="password" type="password" class="input" required />
        </div>
        <button type="submit" class="btn-primary w-full">{{ $t('common.confirm') }}</button>
      </form>

      <template v-else-if="file">
        <FileIcon :mime-type="file.mime_type || ''" size="lg" class="text-center block mb-3" />
        <h2 class="text-lg font-semibold text-center mb-1">{{ file.name }}</h2>
        <p class="text-xs text-gray-400 text-center mb-4">{{ formatSize(file.size) }}</p>

        <div class="space-y-3">
          <ErrorAlert v-if="error" :message="error" @dismiss="error = ''" />
          <div class="flex justify-center gap-3">
            <button class="btn-primary text-sm" @click="downloadFile">{{ $t('file.download') }}</button>
            <a
              v-if="shareLink?.access_type === 'raw' || shareLink?.access_type === 'edit'"
              :href="rawUrl"
              class="btn-secondary text-sm"
              target="_blank"
              rel="noopener"
            >Raw</a>
          </div>
        </div>
      </template>
      <ErrorAlert v-else-if="error" :message="error" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { apiClient, BASE_URL } from '@/api/client';
import FileIcon from '@/components/common/FileIcon.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import ErrorAlert from '@/components/common/ErrorAlert.vue';

interface SharedFile {
  id: string;
  name: string;
  mime_type: string | null;
  size: number;
}

interface PublicShareLink {
  token: string;
  access_type: 'view' | 'edit' | 'raw';
  has_password: boolean;
}

const route = useRoute();
const token = route.params.token as string;

const file = ref<SharedFile | null>(null);
const shareLink = ref<PublicShareLink | null>(null);
const loading = ref(true);
const error = ref('');
const password = ref('');
const verified = ref(false);

const encodedPassword = computed(() => encodeURIComponent(password.value));
const downloadUrl = computed(() => `${BASE_URL}/share/${token}/download${password.value ? `?password=${encodedPassword.value}` : ''}`);
const rawUrl = computed(() => `${BASE_URL}/share/${token}/raw${password.value ? `?password=${encodedPassword.value}` : ''}`);

function formatSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function setShareData(data: { file: SharedFile; shareLink: PublicShareLink }): void {
  file.value = data.file;
  shareLink.value = data.shareLink;
  verified.value = !data.shareLink.has_password || !!password.value;
}

async function verifyPassword(): Promise<void> {
  error.value = '';
  try {
    const res = await apiClient<{ success: boolean; data: { file: SharedFile; shareLink: PublicShareLink } }>(`/share/${token}/verify`, {
      method: 'POST',
      body: JSON.stringify({ password: password.value }),
      skipAuth: true,
    });
    setShareData(res.data);
  } catch (e) {
    error.value = (e as Error).message;
  }
}

function downloadFile(): void {
  window.location.href = downloadUrl.value;
}

onMounted(async () => {
  try {
    const res = await apiClient<{ success: boolean; data: { file: SharedFile; shareLink: PublicShareLink } }>(`/share/${token}`, {
      skipAuth: true,
    });
    setShareData(res.data);
  } catch (e) {
    const message = (e as Error).message;
    if (message === 'Unauthorized' || message === 'Password required') {
      shareLink.value = { token, access_type: 'view', has_password: true };
      verified.value = false;
    } else {
      error.value = message;
    }
  } finally {
    loading.value = false;
  }
});
</script>
