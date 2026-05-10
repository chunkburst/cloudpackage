<template>
  <nav v-if="items.length > 1" class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 px-1">
    <template v-for="(item, i) in items" :key="item.id || i">
      <svg v-if="i > 0" class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
      <router-link
        v-if="item.to && i < items.length - 1"
        :to="item.to"
        class="hover:text-primary-600 dark:hover:text-primary-400 truncate max-w-[160px]"
      >
        {{ item.name }}
      </router-link>
      <span v-else class="text-gray-900 dark:text-gray-100 font-medium truncate max-w-[200px]">
        {{ item.name }}
      </span>
    </template>
  </nav>
</template>

<script setup lang="ts">
interface BreadcrumbItem {
  name: string;
  to?: string;
  id?: string;
}

defineProps<{ items: BreadcrumbItem[] }>();
</script>
