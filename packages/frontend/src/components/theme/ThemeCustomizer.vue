<template>
  <div class="space-y-4">
    <h3 class="text-sm font-medium">Customize Theme</h3>
    <div class="grid grid-cols-2 gap-3">
      <div v-for="(value, key) in config" :key="key">
        <label class="text-xs text-gray-500 dark:text-gray-400 block mb-1">{{ key }}</label>
        <div class="flex items-center gap-2">
          <input
            :value="value"
            type="color"
            class="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
            @input="$emit('update', { ...config, [key]: ($event.target as HTMLInputElement).value })"
          />
          <input
            :value="value"
            type="text"
            class="input !py-1 text-xs font-mono flex-1"
            @input="$emit('update', { ...config, [key]: ($event.target as HTMLInputElement).value })"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ThemeConfig {
  [key: string]: string;
}

defineProps<{ config: ThemeConfig }>();
defineEmits<{ update: [config: ThemeConfig] }>();
</script>
