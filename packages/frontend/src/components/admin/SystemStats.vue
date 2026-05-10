<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <div class="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <p class="text-xs text-gray-400 mb-1">{{ $t('admin.totalUsers') }}</p>
      <p class="text-2xl font-bold">{{ stats.totalUsers }}</p>
    </div>
    <div class="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <p class="text-xs text-gray-400 mb-1">{{ $t('admin.totalFiles') }}</p>
      <p class="text-2xl font-bold">{{ stats.totalFiles }}</p>
    </div>
    <div class="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <p class="text-xs text-gray-400 mb-1">{{ $t('admin.totalStorage') }}</p>
      <p class="text-2xl font-bold">{{ formatSize(stats.totalStorageBytes) }}</p>
    </div>
    <div class="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <p class="text-xs text-gray-400 mb-1">{{ $t('admin.activeSessions') }}</p>
      <p class="text-2xl font-bold">{{ stats.activeSessions }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface SystemStats {
  totalUsers: number;
  totalFiles: number;
  totalStorageBytes: number;
  activeSessions: number;
}

defineProps<{ stats: SystemStats }>();

function formatSize(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
</script>
