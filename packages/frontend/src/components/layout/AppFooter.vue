<template>
  <footer class="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-xs text-gray-400">
    <div class="flex items-center justify-between">
      <span>CloudPackage v1.0.0</span>
      <span>&copy; {{ year }}</span>
    </div>
  </footer>
</template>

<script setup lang="ts">
const year = new Date().getFullYear();
</script>
