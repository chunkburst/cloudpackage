<template>
  <div class="h-screen flex flex-col">
    <AppHeader @toggle-sidebar="ui.toggleSidebar()" />
    <div class="flex-1 flex min-h-0">
      <AppSidebar :open="ui.sidebarOpen" @close="ui.sidebarOpen = false" />
      <main class="flex-1 min-w-0 overflow-auto p-4">
        <div class="max-w-3xl mx-auto">
          <SearchBar v-model="query" @search="doSearch" />
          <SearchFilters class="mt-3" @filter="handleFilter" />
          <div class="mt-4">
            <h2 class="text-sm font-medium mb-3">{{ $t('search.results') }} ({{ results.length }})</h2>
            <SearchResults :results="results" :query="query" :loading="loading" @open="handleOpen" />
          </div>
        </div>
      </main>
    </div>
    <AppFooter />
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { apiClient } from '@/api/client';
import { useUiStore } from '@/stores/ui.store';
import type { FileRow } from '@cloudpackage/shared/types';
import AppHeader from '@/components/layout/AppHeader.vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import AppFooter from '@/components/layout/AppFooter.vue';
import SearchBar from '@/components/search/SearchBar.vue';
import SearchResults from '@/components/search/SearchResults.vue';
import SearchFilters from '@/components/search/SearchFilters.vue';
import Toast from '@/components/common/Toast.vue';

const router = useRouter();
const ui = useUiStore();

const query = ref('');
const results = ref<FileRow[]>([]);
const loading = ref(false);
const filters = ref<{ mimeType?: string; isDirectory?: boolean }>({});

async function doSearch(): Promise<void> {
  loading.value = true;
  try {
    const params = new URLSearchParams({ query: query.value });
    if (filters.value.mimeType) params.set('mime_type', filters.value.mimeType);
    if (filters.value.isDirectory !== undefined) params.set('is_directory', String(filters.value.isDirectory));
    const res = await apiClient<{ success: boolean; data: FileRow[] }>(`/search?${params}`);
    results.value = res.data;
  } finally {
    loading.value = false;
  }
}

function handleFilter(f: { mimeType?: string; isDirectory?: boolean }): void {
  filters.value = { ...filters.value, ...f };
  doSearch();
}

function handleOpen(id: string): void {
  router.push(`/preview/${id}`);
}
</script>
