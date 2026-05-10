<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">API Keys</h3>
      <button class="btn-primary text-xs !py-1.5 !px-3" @click="createKey">+ Create</button>
    </div>

    <ErrorAlert :message="error" @dismiss="error = ''" />

    <div v-if="keys.length === 0" class="text-sm text-gray-400 text-center py-4">
      No API keys yet
    </div>

    <div v-for="key in keys" :key="key.id" class="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div>
        <p class="text-sm font-medium">{{ key.name }}</p>
        <p class="text-xs text-gray-400">{{ key.key_prefix }}... &middot; {{ key.scopes }}</p>
      </div>
      <button class="text-xs text-red-500 hover:text-red-700" @click="revoke(key.id)">Revoke</button>
    </div>

    <Modal v-if="newKey" :open="!!newKey" title="New API Key" size="sm" @close="newKey = null">
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
        Copy this key now &mdash; it won't be shown again.
      </p>
      <pre class="bg-gray-100 dark:bg-gray-900 p-3 rounded text-xs break-all mb-3">{{ newKey.key }}</pre>
      <button class="btn-primary w-full text-sm" @click="copyKey">Copy to Clipboard</button>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import Modal from '@/components/common/Modal.vue';
import ErrorAlert from '@/components/common/ErrorAlert.vue';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string;
  created_at: string;
  expires_at: string | null;
}

const auth = useAuthStore();
const ui = useUiStore();

const keys = ref<ApiKey[]>([]);
const error = ref('');
const newKey = ref<{ name: string; key: string } | null>(null);

async function loadKeys(): Promise<void> {
  try {
    keys.value = await auth.fetchApiKeys();
  } catch (e) {
    error.value = (e as Error).message;
  }
}

async function createKey(): Promise<void> {
  const name = prompt('Key name:') || 'API Key';
  try {
    const result = await auth.createApiKey(name);
    newKey.value = { name, key: result.key };
    loadKeys();
  } catch (e) {
    error.value = (e as Error).message;
  }
}

async function revoke(id: string): Promise<void> {
  try {
    await auth.revokeApiKey(id);
    keys.value = keys.value.filter((k) => k.id !== id);
    ui.addToast('success', 'API key revoked');
  } catch (e) {
    error.value = (e as Error).message;
  }
}

async function copyKey(): Promise<void> {
  if (newKey.value) {
    await navigator.clipboard.writeText(newKey.value.key);
    ui.addToast('success', 'Copied to clipboard');
    newKey.value = null;
  }
}

onMounted(loadKeys);
</script>
