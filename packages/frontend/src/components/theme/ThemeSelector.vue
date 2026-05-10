<template>
  <div class="flex items-center gap-4">
    <div
      v-for="theme in themes"
      :key="theme.id"
      class="relative cursor-pointer group"
      @click="$emit('select', theme.id)"
    >
      <div
        class="w-16 h-10 rounded-lg border-2 transition-colors"
        :class="theme.id === activeId ? 'border-primary-500' : 'border-gray-300 dark:border-gray-600'"
        :style="previewStyle(theme.config_json)"
      />
      <span class="block text-xs text-center mt-1 truncate max-w-[64px]">{{ theme.name }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Theme {
  id: string;
  name: string;
  config_json: string;
}

defineProps<{ themes: Theme[]; activeId: string | null }>();
defineEmits<{ select: [id: string] }>();

function previewStyle(configJson: string): Record<string, string> {
  try {
    const cfg = JSON.parse(configJson);
    return {
      backgroundColor: cfg['--color-bg'] || '#fff',
      color: cfg['--color-text'] || '#111',
    };
  } catch {
    return {};
  }
}
</script>
