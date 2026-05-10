import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { FileRow } from '@cloudpackage/shared/types';
import { apiClient } from '@/api/client';

export type ViewMode = 'list' | 'grid';
export type SortField = 'name' | 'size' | 'updated_at' | 'created_at';
export type SortOrder = 'asc' | 'desc';

interface FilesResponse {
  success: boolean;
  data: { files: FileRow[]; total: number; page: number; pageSize: number };
}

export const useFilesStore = defineStore('files', () => {
  const files = ref<FileRow[]>([]);
  const currentDir = ref<FileRow | null>(null);
  const parentId = ref<string | null>(null);
  const selectedIds = ref<Set<string>>(new Set());
  const viewMode = ref<ViewMode>('list');
  const sortField = ref<SortField>('name');
  const sortOrder = ref<SortOrder>('asc');
  const loading = ref(false);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(50);
  const searchQuery = ref('');

  const breadcrumb = computed(() => {
    const parts: { name: string; id?: string }[] = [{ name: 'Home' }];
    // Breadcrumb built from currentDir.path
    if (currentDir.value?.path) {
      const segments = currentDir.value.path.split('/').filter(Boolean);
      let accum = '';
      for (const seg of segments) {
        accum += '/' + seg;
        parts.push({ name: seg, id: accum });
      }
    }
    return parts;
  });

  async function loadFiles(parentIdParam?: string | null): Promise<void> {
    loading.value = true;
    const params = new URLSearchParams();
    if (parentIdParam) params.set('parent_id', parentIdParam);
    if (searchQuery.value) params.set('q', searchQuery.value);
    params.set('page', String(page.value));
    params.set('page_size', String(pageSize.value));
    params.set('sort', sortField.value);
    params.set('order', sortOrder.value);

    try {
      const queryStr = params.toString();
      const res = await apiClient<FilesResponse>(`/files${queryStr ? '?' + queryStr : ''}`);
      files.value = res.data.files;
      total.value = res.data.total;
      parentId.value = parentIdParam ?? null;
    } finally {
      loading.value = false;
    }
  }

  function toggleSelect(id: string): void {
    const next = new Set(selectedIds.value);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    selectedIds.value = next;
  }

  function selectAll(): void {
    selectedIds.value = new Set(files.value.map((f) => f.id));
  }

  function clearSelection(): void {
    selectedIds.value = new Set();
  }

  function setViewMode(mode: ViewMode): void {
    viewMode.value = mode;
    localStorage.setItem('viewMode', mode);
  }

  return {
    files,
    currentDir,
    parentId,
    selectedIds,
    viewMode,
    sortField,
    sortOrder,
    loading,
    total,
    page,
    pageSize,
    searchQuery,
    breadcrumb,
    loadFiles,
    toggleSelect,
    selectAll,
    clearSelection,
    setViewMode,
  };
});
