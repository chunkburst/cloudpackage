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

    <Modal v-if="showUploader" :open="showUploader" :title="$t('upload.title')" size="lg" @close="closeUploader">
      <div class="space-y-5">
        <FileUploader @files="handleUpload" />
        <FileUploadProgress
          :uploads="uploads"
          @retry="retryUpload"
          @cancel="cancelUpload"
          @remove="removeUpload"
        />
        <div v-if="hasUploads" class="flex justify-end gap-3">
          <button type="button" class="btn-secondary" @click="clearFinished">{{ $t('upload.clearFinished') }}</button>
          <button type="button" class="btn-primary" @click="closeUploader">{{ $t('common.close') }}</button>
        </div>
      </div>
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

    <ShareDialog
      v-if="showShareDialog"
      :open="showShareDialog"
      :links="shareLinks"
      @close="closeShareDialog"
      @create="createShareLink"
      @copy="copyShareLink"
      @revoke="revokeShareLink"
    />

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
import { useFileUpload } from '@/composables/useFileUpload';
import AppHeader from '@/components/layout/AppHeader.vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import AppFooter from '@/components/layout/AppFooter.vue';
import FileBreadcrumb from '@/components/files/FileBreadcrumb.vue';
import FileBrowser from '@/components/files/FileBrowser.vue';
import FileUploader from '@/components/files/FileUploader.vue';
import FileUploadProgress from '@/components/files/FileUploadProgress.vue';
import FileContextMenu from '@/components/files/FileContextMenu.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import FileRenameDialog from '@/components/files/FileRenameDialog.vue';
import Modal from '@/components/common/Modal.vue';
import Toast from '@/components/common/Toast.vue';
import ShareDialog from '@/components/share/ShareDialog.vue';
import type { ShareLinkRow } from '@cloudpackage/shared/types';

type PublicShareLink = Omit<ShareLinkRow, 'password_hash'> & { has_password: boolean };

const router = useRouter();
const store = useFilesStore();
const ui = useUiStore();
const uploader = useFileUpload();
const { uploads, hasUploads, cancelUpload, removeUpload, clearFinished } = uploader;

const showUploader = ref(false);
const showDeleteConfirm = ref(false);
const showNewFolder = ref(false);
const showShareDialog = ref(false);
const newFolderName = ref('');
const renameTargetId = ref<string | null>(null);
const renameTargetName = ref<string | null>(null);
const contextMenuRef = ref<InstanceType<typeof FileContextMenu> | null>(null);
const contextMenuFileId = ref<string | null>(null);
const shareTargetId = ref<string | null>(null);
const shareLinks = ref<PublicShareLink[]>([]);

const contextMenuItems = computed(() => [
  { label: 'Open', action: 'open', handler: () => handleOpen(contextMenuFileId.value!) },
  { label: 'Rename', action: 'rename', handler: () => startRename(contextMenuFileId.value!) },
  { label: 'Share', action: 'share', handler: () => openShareDialog(contextMenuFileId.value!) },
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
  const { completed, failed } = await uploader.uploadFiles(files, store.parentId);
  await store.loadFiles(store.parentId);

  if (completed > 0) ui.addToast('success', `${completed} ${completed === 1 ? 'file' : 'files'} uploaded`);
  if (failed > 0) ui.addToast('error', `${failed} ${failed === 1 ? 'upload' : 'uploads'} failed`);
}

async function retryUpload(id: string): Promise<void> {
  const success = await uploader.retryUpload(id);
  if (success) {
    await store.loadFiles(store.parentId);
    ui.addToast('success', 'Upload completed');
  }
}

function closeUploader(): void {
  showUploader.value = false;
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

async function loadShareLinks(fileId: string): Promise<void> {
  const res = await apiClient<{ success: boolean; data: PublicShareLink[] }>(`/share/file/${fileId}`);
  shareLinks.value = res.data;
}

async function openShareDialog(fileId: string): Promise<void> {
  shareTargetId.value = fileId;
  showShareDialog.value = true;
  await loadShareLinks(fileId);
}

function closeShareDialog(): void {
  showShareDialog.value = false;
  shareTargetId.value = null;
  shareLinks.value = [];
}

async function createShareLink(form: { password: string; expiresAt: string; maxAccesses: number; accessType: 'view' | 'raw' | 'edit' }): Promise<void> {
  if (!shareTargetId.value) return;

  const payload: Record<string, unknown> = {
    file_id: shareTargetId.value,
    access_type: form.accessType,
  };
  if (form.password) payload.password = form.password;
  if (form.maxAccesses > 0) payload.max_accesses = form.maxAccesses;
  if (form.expiresAt) payload.expires_at = new Date(form.expiresAt).toISOString();

  await apiClient('/share', { method: 'POST', body: JSON.stringify(payload) });
  await loadShareLinks(shareTargetId.value);
  ui.addToast('success', 'Share link created');
}

async function copyShareLink(token: string): Promise<void> {
  const url = `${window.location.origin}/share/${token}`;
  await navigator.clipboard.writeText(url);
  ui.addToast('success', 'Share link copied');
}

async function revokeShareLink(token: string): Promise<void> {
  await apiClient(`/share/${token}`, { method: 'DELETE' });
  if (shareTargetId.value) await loadShareLinks(shareTargetId.value);
  ui.addToast('success', 'Share link revoked');
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
