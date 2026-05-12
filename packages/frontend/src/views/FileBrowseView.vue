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

    <Modal v-if="showUploader" :open="showUploader" title="Upload Files" @close="showUploader = false">
      <FileUploader @files="handleUpload" />
    </Modal>

    <Modal v-if="showNewFolder" :open="showNewFolder" :title="$t('file.newFolder')" size="sm" @close="showNewFolder = false">
      <form class="space-y-4" @submit.prevent="createFolder">
        <div>
          <label class="label" for="folder-name">{{ $t('file.name') }}</label>
          <input id="folder-name" v-model="newFolderName" type="text" class="input" required />
        </div>
        <div class="flex justify-end gap-3">
          <button type="button" class="btn-secondary" @click="showNewFolder = false">{{ $t('common.cancel') }}</button>
          <button type="submit" class="btn-primary">{{ $t('common.create') }}</button>
        </div>
      </form>
    </Modal>

    <FileContextMenu ref="contextMenuRef" :items="contextMenuItems" />

    <ConfirmDialog
      :open="showDeleteConfirm"
      :title="$t('file.delete')"
      :message="$t('file.confirmDelete')"
      variant="danger"
      @confirm="confirmDelete"
      @cancel="showDeleteConfirm = false"
    />

    <FileRenameDialog
      v-if="renameTargetName"
      :open="!!renameTargetName"
      :current-name="renameTargetName"
      @close="clearRenameTarget"
      @rename="handleRename"
    />

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
const newFolderName = ref('');
const renameTargetId = ref<string | null>(null);
const renameTargetName = ref<string | null>(null);
const contextMenuRef = ref<InstanceType<typeof FileContextMenu> | null>(null);
const contextMenuFileId = ref<string | null>(null);

const contextMenuItems = computed(() => [
  { label: 'Open', action: 'open', handler: () => handleOpen(contextMenuFileId.value!) },
  { label: 'Rename', action: 'rename', handler: () => startRename(contextMenuFileId.value!) },
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
    if (store.parentId) form.append('parent_id', store.parentId);

    try {
      await apiClient('/files/upload', { method: 'POST', body: form });
      ui.addToast('success', `Uploaded: ${file.name}`);
    } catch (e) {
      ui.addToast('error', `Failed: ${file.name}: ${(e as Error).message}`);
    }
  }
  await store.loadFiles(store.parentId);
}

async function createFolder(): Promise<void> {
  const name = newFolderName.value.trim();
  if (!name) return;

  await apiClient('/files', {
    method: 'POST',
    body: JSON.stringify({ name, parent_id: store.parentId, is_directory: true }),
  });

  newFolderName.value = '';
  showNewFolder.value = false;
  await store.loadFiles(store.parentId);
  ui.addToast('success', 'Folder created');
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
  await store.loadFiles(store.parentId);
  ui.addToast('success', 'Deleted');
}

function startRename(fileId: string): void {
  const file = store.files.find((f) => f.id === fileId);
  if (!file) return;
  renameTargetId.value = file.id;
  renameTargetName.value = file.name;
}

function clearRenameTarget(): void {
  renameTargetId.value = null;
  renameTargetName.value = null;
}

async function handleRename(newName: string): Promise<void> {
  if (renameTargetId.value) {
    await apiClient(`/files/${renameTargetId.value}`, { method: 'PUT', body: JSON.stringify({ name: newName }) });
    await store.loadFiles(store.parentId);
    ui.addToast('success', 'Renamed');
  }
  clearRenameTarget();
}

onMounted(() => {
  store.loadFiles(null);
});
</script>
