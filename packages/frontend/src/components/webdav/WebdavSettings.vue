<template>
  <div class="space-y-4">
    <div>
      <h3 class="text-sm font-medium mb-2">WebDAV Connection Info</h3>
      <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm space-y-1">
        <p><span class="text-gray-400">URL:</span> <code class="text-xs">{{ webdavUrl }}</code></p>
        <p><span class="text-gray-400">Auth:</span> Bearer token or Basic auth password</p>
      </div>
    </div>
    <WebdavTokenList :tokens="tokens" @delete="$emit('deleteToken', $event)" />
    <button class="btn-primary !text-xs" @click="$emit('createToken')">+ New Token</button>
  </div>
</template>

<script setup lang="ts">
import WebdavTokenList from './WebdavTokenList.vue';

interface WebdavToken {
  id: string;
  name: string;
  token_prefix: string;
  allowed_paths: string | null;
  read_only: number;
}

defineProps<{ webdavUrl: string; tokens: WebdavToken[] }>();
defineEmits<{ createToken: []; deleteToken: [id: string] }>();
</script>
