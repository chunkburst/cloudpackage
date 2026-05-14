import { computed, ref } from 'vue';
import { apiClient } from '@/api/client';

export type UploadStatus = 'queued' | 'uploading' | 'done' | 'error' | 'cancelled';

export interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: UploadStatus;
  error?: string;
  parentId: string | null;
}

export function useFileUpload() {
  const uploads = ref<UploadItem[]>([]);

  const activeUploads = computed(() => uploads.value.filter((item) => item.status === 'queued' || item.status === 'uploading'));
  const hasUploads = computed(() => uploads.value.length > 0);

  function createItem(file: File, parentId: string | null): UploadItem {
    return {
      id: crypto.randomUUID(),
      file,
      parentId,
      progress: 0,
      status: 'queued',
    };
  }

  async function runUpload(item: UploadItem): Promise<boolean> {
    if (item.status === 'cancelled') return false;

    item.status = 'uploading';
    item.error = undefined;
    item.progress = 5;

    try {
      const form = new FormData();
      form.append('file', item.file);
      if (item.parentId) form.append('parent_id', item.parentId);

      await apiClient('/files/upload', {
        method: 'POST',
        body: form,
      });

      item.progress = 100;
      item.status = 'done';
      return true;
    } catch (e) {
      item.status = 'error';
      item.progress = 0;
      item.error = (e as Error).message;
      return false;
    }
  }

  async function uploadFile(file: File, parentId: string | null): Promise<boolean> {
    const item = createItem(file, parentId);
    uploads.value.push(item);
    return runUpload(item);
  }

  async function uploadFiles(files: File[], parentId: string | null): Promise<{ completed: number; failed: number }> {
    const items = files.map((file) => createItem(file, parentId));
    uploads.value.push(...items);

    let completed = 0;
    let failed = 0;
    for (const item of items) {
      if (await runUpload(item)) completed += 1;
      else failed += 1;
    }

    return { completed, failed };
  }

  async function retryUpload(id: string): Promise<boolean> {
    const item = uploads.value.find((upload) => upload.id === id);
    if (!item || item.status !== 'error') return false;
    return runUpload(item);
  }

  function cancelUpload(id: string): void {
    const item = uploads.value.find((upload) => upload.id === id);
    if (!item || item.status === 'done') return;
    item.status = 'cancelled';
    item.progress = 0;
  }

  function removeUpload(id: string): void {
    uploads.value = uploads.value.filter((item) => item.id !== id);
  }

  function clearUploads(): void {
    uploads.value = [];
  }

  function clearFinished(): void {
    uploads.value = uploads.value.filter((item) => item.status === 'queued' || item.status === 'uploading');
  }

  return {
    uploads,
    activeUploads,
    hasUploads,
    uploadFile,
    uploadFiles,
    retryUpload,
    cancelUpload,
    removeUpload,
    clearUploads,
    clearFinished,
  };
}
