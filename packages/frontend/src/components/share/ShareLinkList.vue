<template>
  <div class="space-y-2">
    <div
      v-for="link in links"
      :key="link.id"
      class="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
    >
      <div class="flex-1 min-w-0">
        <p class="text-sm font-mono truncate">{{ link.token }}</p>
        <p class="text-xs text-gray-400">
          {{ link.access_count }} / {{ link.max_accesses || '∞' }}
          &middot; {{ link.access_type }}
        </p>
      </div>
      <div class="flex items-center gap-1 ml-2">
        <button
          class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-xs"
          @click="$emit('copy', link.token)"
        >
          {{ $t('share.copyLink') }}
        </button>
        <button
          class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-xs text-red-500"
          @click="$emit('revoke', link.token)"
        >
          {{ $t('common.delete') }}
        </button>
      </div>
    </div>
    <p v-if="links.length === 0" class="text-sm text-gray-400 text-center py-4">
      No share links yet
    </p>
  </div>
</template>

<script setup lang="ts">
interface ShareLink {
  id: string;
  token: string;
  access_type: string;
  max_accesses: number | null;
  access_count: number;
  expires_at: string | null;
}

defineProps<{ links: ShareLink[] }>();
defineEmits<{ copy: [token: string]; revoke: [token: string] }>();
</script>
