<template>
  <div class="space-y-3">
    <div
      v-for="config in configs"
      :key="config.id"
      class="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
    >
      <div>
        <div class="flex items-center gap-2">
          <p class="text-sm font-medium">{{ config.name }}</p>
          <span v-if="config.is_default" class="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-1.5 py-0.5 rounded">Default</span>
          <span class="text-xs text-gray-400">{{ config.driver }}</span>
        </div>
        <p class="text-xs text-gray-400 mt-0.5">{{ config.mount_point }}</p>
      </div>
      <div class="flex items-center gap-1">
        <button class="btn-secondary !text-xs !py-1 !px-2" @click="$emit('test', config.id)">Test</button>
        <button class="btn-secondary !text-xs !py-1 !px-2" @click="$emit('edit', config.id)">{{ $t('common.edit') }}</button>
        <button class="btn-secondary !text-xs !py-1 !px-2 text-red-500" @click="$emit('delete', config.id)">{{ $t('common.delete') }}</button>
      </div>
    </div>
    <p v-if="configs.length === 0" class="text-sm text-gray-400 text-center py-4">No storage configs</p>
  </div>
</template>

<script setup lang="ts">
interface StorageConfig {
  id: string;
  name: string;
  driver: string;
  mount_point: string;
  is_default: number;
  is_active: number;
}

defineProps<{ configs: StorageConfig[] }>();
defineEmits<{ test: [id: string]; edit: [id: string]; delete: [id: string] }>();
</script>
