import { ref } from 'vue';
import { apiClient } from '@/api/client';
import type { FileRow } from '@cloudpackage/shared/types';

export function useSearch() {
  const query = ref('');
  const results = ref<FileRow[]>([]);
  const loading = ref(false);
  const error = ref('');

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function search(immediate = false): void {
    if (!immediate) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => doSearch(), 300);
      return;
    }
    doSearch();
  }

  async function doSearch(): Promise<void> {
    if (!query.value.trim()) {
      results.value = [];
      return;
    }
    loading.value = true;
    error.value = '';
    try {
      const res = await apiClient<{ success: boolean; data: FileRow[] }>(
        `/search?query=${encodeURIComponent(query.value)}`
      );
      results.value = res.data;
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function suggestions(prefix: string): Promise<string[]> {
    try {
      const res = await apiClient<{ success: boolean; data: string[] }>(
        `/search/suggest?query=${encodeURIComponent(prefix)}`
      );
      return res.data;
    } catch {
      return [];
    }
  }

  return { query, results, loading, error, search, suggestions };
}
