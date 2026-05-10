<template>
  <div class="w-full">
    <!-- Toolbar -->
    <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
      <div class="flex items-center gap-2">
        <button class="btn-secondary !px-3 !py-1.5" @click="$emit('upload')">
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {{ $t('file.upload') }}
        </button>
        <button class="btn-secondary !px-3 !py-1.5" @click="$emit('newFolder')">
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          {{ $t('file.newFolder') }}
        </button>
        <button
          v-if="store.selectedIds.size > 0"
          class="btn-secondary !px-3 !py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          @click="$emit('deleteSelected')"
        >
          {{ $t('file.delete') }} ({{ store.selectedIds.size }})
        </button>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="p-1.5 rounded-md"
          :class="store.viewMode === 'list' ? 'bg-gray-200 dark:bg-gray-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700'"
          @click="store.setViewMode('list')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </button>
        <button
          class="p-1.5 rounded-md"
          :class="store.viewMode === 'grid' ? 'bg-gray-200 dark:bg-gray-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700'"
          @click="store.setViewMode('grid')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Content -->
    <LoadingSpinner v-if="store.loading" />

    <template v-else-if="store.files.length === 0">
      <EmptyState
        :message="store.searchQuery ? $t('file.noResults') : $t('file.emptyFolder')"
      />
    </template>

    <template v-else>
      <FileList
        v-if="store.viewMode === 'list'"
        :files="store.files"
        :selected="store.selectedIds"
        @select="store.toggleSelect($event)"
        @open="$emit('open', $event)"
        @contextmenu="$emit('contextMenu', $event)"
      />
      <FileGrid
        v-else
        :files="store.files"
        :selected="store.selectedIds"
        @select="store.toggleSelect($event)"
        @open="$emit('open', $event)"
        @contextmenu="$emit('contextMenu', $event)"
      />
    </template>

    <Pagination
      v-if="store.total > store.pageSize"
      :model-value="store.page"
      :total="store.total"
      :page-size="store.pageSize"
      @update:model-value="(p: number) => { store.page = p; store.loadFiles(store.parentId); }"
    />
  </div>
</template>

<script setup lang="ts">
import { useFilesStore } from '@/stores/files.store';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import Pagination from '@/components/common/Pagination.vue';
import FileList from './FileList.vue';
import FileGrid from './FileGrid.vue';

const store = useFilesStore();

defineEmits<{
  upload: [];
  newFolder: [];
  deleteSelected: [];
  open: [fileId: string];
  contextMenu: [payload: { fileId: string; event: MouseEvent }];
}>();
</script>
