import { ref } from 'vue';
import { apiClient } from '@/api/client';

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

export function useFileUpload() {
  const uploads = ref<UploadItem[]>([]);

  async function uploadFile(file: File, parentId: string | null): Promise<void> {
    const id = crypto.randomUUID();
    const item: UploadItem = { id, file, progress: 0, status: 'uploading' };
    uploads.value.push(item);

    try {
      const form = new FormData();
      form.append('file', file);
      if (parentId) form.append('parent_id', parentId);

      await apiClient('/files/upload', {
        method: 'POST',
        body: form,
      });

      item.progress = 100;
      item.status = 'done';
    } catch (e) {
      item.status = 'error';
      item.error = (e as Error).message;
    }
  }

  async function uploadFiles(files: File[], parentId: string | null): Promise<void> {
    await Promise.all(files.map((f) => uploadFile(f, parentId)));
  }

  function clearUploads(): void {
    uploads.value = [];
  }

  return { uploads, uploadFile, uploadFiles, clearUploads };
}
