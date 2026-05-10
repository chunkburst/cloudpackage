<template>
  <div class="space-y-3">
    <div
      v-for="token in tokens"
      :key="token.id"
      class="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
    >
      <div>
        <p class="text-sm font-medium">{{ token.name }}</p>
        <p class="text-xs text-gray-400">
          {{ token.token_prefix }}... &middot; {{ token.read_only ? 'Read-only' : 'Read/Write' }}
          <span v-if="token.allowed_paths" class="ml-2">Paths: {{ token.allowed_paths }}</span>
        </p>
      </div>
      <button class="btn-secondary !text-xs !py-1 !px-2 text-red-500" @click="$emit('delete', token.id)">{{ $t('common.delete') }}</button>
    </div>
    <p v-if="tokens.length === 0" class="text-sm text-gray-400 text-center py-4">No WebDAV tokens</p>
  </div>
</template>

<script setup lang="ts">
interface WebdavToken {
  id: string;
  name: string;
  token_prefix: string;
  allowed_paths: string | null;
  read_only: number;
}

defineProps<{ tokens: WebdavToken[] }>();
defineEmits<{ delete: [id: string] }>();
</script>
