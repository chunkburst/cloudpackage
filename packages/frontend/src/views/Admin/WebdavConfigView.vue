<template>
  <div>
    <h2 class="text-lg font-semibold mb-4">{{ $t('admin.webdav') }}</h2>

    <ErrorAlert v-if="error" :message="error" @dismiss="error = ''" />

    <WebdavSettings
      :webdav-url="webdavUrl"
      :tokens="tokens"
      @create-token="showTokenForm = true"
      @delete-token="handleDeleteToken"
    />

    <WebdavTokenForm
      :open="showTokenForm"
      @close="showTokenForm = false"
      @create="handleCreateToken"
    />

    <ConfirmDialog
      :open="showDeleteConfirm"
      title="Delete Token"
      message="Are you sure?"
      variant="danger"
      @confirm="confirmDeleteToken"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { apiClient } from '@/api/client';
import { useUiStore } from '@/stores/ui.store';
import WebdavSettings from '@/components/webdav/WebdavSettings.vue';
import WebdavTokenForm from '@/components/webdav/WebdavTokenForm.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import ErrorAlert from '@/components/common/ErrorAlert.vue';

const ui = useUiStore();

interface Token {
  id: string;
  name: string;
  token_prefix: string;
  allowed_paths: string | null;
  read_only: number;
}

const tokens = ref<Token[]>([]);
const webdavUrl = ref(`${location.origin}/webdav`);
const error = ref('');
const showTokenForm = ref(false);
const showDeleteConfirm = ref(false);
const deleteTargetId = ref<string | null>(null);

async function load(): Promise<void> {
  try {
    const res = await apiClient<{ success: boolean; data: Token[] }>('/webdav/tokens');
    tokens.value = res.data;
  } catch (e) {
    error.value = (e as Error).message;
  }
}

async function handleCreateToken(data: { name: string; allowedPaths: string; readOnly: boolean }): Promise<void> {
  try {
    const res = await apiClient<{ success: boolean; data: { id: string; name: string; token: string } }>(
      '/webdav/tokens',
      { method: 'POST', body: JSON.stringify({ name: data.name, allowed_paths: data.allowedPaths, read_only: data.readOnly }) }
    );
    if (res.data.token) {
      prompt('Copy your WebDAV token (it won\'t be shown again):', res.data.token);
    }
    showTokenForm.value = false;
    load();
    ui.addToast('success', 'Token created');
  } catch (e) {
    error.value = (e as Error).message;
  }
}

function handleDeleteToken(id: string): void {
  deleteTargetId.value = id;
  showDeleteConfirm.value = true;
}

async function confirmDeleteToken(): Promise<void> {
  showDeleteConfirm.value = false;
  if (!deleteTargetId.value) return;
  try {
    await apiClient(`/webdav/tokens/${deleteTargetId.value}`, { method: 'DELETE' });
    load();
    ui.addToast('success', 'Token deleted');
  } catch (e) {
    error.value = (e as Error).message;
  }
}

onMounted(load);
</script>
