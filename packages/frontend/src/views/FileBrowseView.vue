<template>
  <div class="h-screen flex flex-col">
    <AppHeader @toggle-sidebar="ui.toggleSidebar()" />
    <div class="flex-1 flex min-h-0">
      <AppSidebar :open="ui.sidebarOpen" @close="ui.sidebarOpen = false" />
      <main class="flex-1 min-w-0 overflow-auto p-4">
        <FileBreadcrumb />
        <FileBrowser
          @upload="showUploader = true"
          @new-folder="showNewFolder = true"
          @delete-selected="deleteSelected"
          @open="handleOpen"
          @context-menu="handleContextMenu"
        />
      </main>
    </div>
    <AppFooter />

    <!-- Uploader modal -->
    <Modal v-if="showUploader" :open="showUploader" title="Upload Files" @close="showUploader = false">
      <FileUploader @files="handleUpload" />
    </Modal>

    <!-- Context menu -->
    <FileContextMenu ref="contextMenuRef" :items="contextMenuItems" />

    <!-- Confirm delete -->
    <ConfirmDialog
      :open="showDeleteConfirm"
      :title="$t('file.delete')"
      :message="$t('file.confirmDelete')"
      variant="danger"
      @confirm="confirmDelete"
      @cancel="showDeleteConfirm = false"
    />

    <!-- Rename dialog -->
    <FileRenameDialog
      v-if="renameTarget"
      :open="!!renameTarget"
      :current-name="renameTarget"
      @close="renameTarget = null"
      @rename="handleRename"
    />

    <!-- Toast -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useFilesStore } from '@/stores/files.store';
import { useUiStore } from '@/stores/ui.store';
import { apiClient } from '@/api/client';
import AppHeader from '@/components/layout/AppHeader.vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import AppFooter from '@/components/layout/AppFooter.vue';
import FileBreadcrumb from '@/components/files/FileBreadcrumb.vue';
import FileBrowser from '@/components/files/FileBrowser.vue';
import FileUploader from '@/components/files/FileUploader.vue';
import FileContextMenu from '@/components/files/FileContextMenu.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import FileRenameDialog from '@/components/files/FileRenameDialog.vue';
import Modal from '@/components/common/Modal.vue';
import Toast from '@/components/common/Toast.vue';

const router = useRouter();
const store = useFilesStore();
const ui = useUiStore();

const showUploader = ref(false);
const showDeleteConfirm = ref(false);
const showNewFolder = ref(false);
const renameTarget = ref<string | null>(null);
const contextMenuRef = ref<InstanceType<typeof FileContextMenu> | null>(null);
const contextMenuFileId = ref<string | null>(null);

const contextMenuItems = computed(() => [
  { label: 'Open', action: 'open', handler: () => handleOpen(contextMenuFileId.value!) },
  { label: 'Rename', action: 'rename', handler: () => { renameTarget.value = store.files.find((f) => f.id === contextMenuFileId.value)?.name || ''; } },
  { label: 'Share', action: 'share', handler: () => router.push(`/share/${contextMenuFileId.value}`) },
  { label: 'Delete', action: 'delete', handler: () => { store.toggleSelect(contextMenuFileId.value!); showDeleteConfirm.value = true; }, danger: true },
]);

function handleContextMenu(e: { fileId: string; event: MouseEvent }): void {
  contextMenuFileId.value = e.fileId;
  contextMenuRef.value?.show(e.event);
}

function handleOpen(id: string): void {
  const file = store.files.find((f) => f.id === id);
  if (!file) return;
  if (file.is_directory) {
    store.loadFiles(id);
  } else if (file.mime_type?.startsWith('text/') || file.mime_type?.includes('markdown')) {
    router.push(`/files/${id}/edit`);
  } else {
    router.push(`/preview/${id}`);
  }
}

async function handleUpload(files: File[]): Promise<void> {
  showUploader.value = false;
  for (const file of files) {
    const form = new FormData();
    form.append('file', file);
    // Simplified — in production use multipart presigned upload
    try {
      const initRes = await apiClient<{ success: boolean; data: { uploadUrl: string; fileId: string } }>(
        `/files/${store.parentId || 'root'}/upload/init`,
        { method: 'POST', body: JSON.stringify({ name: file.name, size: file.size, mime_type: file.type }) }
      );
      await fetch(initRes.data.uploadUrl, { method: 'PUT', body: file });
      await apiClient(`/files/${initRes.data.fileId}/upload/complete`, { method: 'POST' });
      ui.addToast('success', `Uploaded: ${file.name}`);
    } catch {
      ui.addToast('error', `Failed: ${file.name}`);
    }
  }
  store.loadFiles(store.parentId);
}

async function deleteSelected(): Promise<void> {
  showDeleteConfirm.value = true;
}

async function confirmDelete(): Promise<void> {
  showDeleteConfirm.value = false;
  for (const id of store.selectedIds) {
    await apiClient(`/files/${id}`, { method: 'DELETE' });
  }
  store.clearSelection();
  store.loadFiles(store.parentId);
  ui.addToast('success', 'Deleted');
}

async function handleRename(newName: string): Promise<void> {
  if (renameTarget.value) {
    const file = store.files.find((f) => f.name === renameTarget.value);
    if (file) {
      await apiClient(`/files/${file.id}`, { method: 'PUT', body: JSON.stringify({ name: newName }) });
      store.loadFiles(store.parentId);
      ui.addToast('success', 'Renamed');
    }
  }
  renameTarget.value = null;
}

onMounted(() => {
  store.loadFiles(null);
});
</script>
