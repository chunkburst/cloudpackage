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
      // Step 1: Initialize upload
      const initRes = await apiClient<{ success: boolean; data: { uploadUrl: string; fileId: string; uploadId?: string } }>(
        '/files/upload/init',
        {
          method: 'POST',
          body: JSON.stringify({
            name: file.name,
            size: file.size,
            mime_type: file.type,
            parent_id: parentId,
          }),
        }
      );

      // Step 2: Upload to presigned URL
      const uploadResult = await fetch(initRes.data.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadResult.ok) throw new Error('Upload failed');

      // Step 3: Confirm upload
      await apiClient(`/files/${initRes.data.fileId}/upload/complete`, { method: 'POST' });

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
