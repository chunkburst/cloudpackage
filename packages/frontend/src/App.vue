<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useThemeStore } from '@/stores/theme.store';

const theme = useThemeStore();

onMounted(() => {
  theme.restoreTheme();
});
</script>
