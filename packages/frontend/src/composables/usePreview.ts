import { ref } from 'vue';
import { apiClient } from '@/api/client';

export type PreviewType = 'image' | 'video' | 'audio' | 'pdf' | 'code' | 'office' | 'ebook' | 'unsupported';

export function usePreview() {
  const loading = ref(false);
  const error = ref('');
  const previewType = ref<PreviewType | null>(null);
  const previewUrl = ref('');
  const downloadUrl = ref('');
  const fileName = ref('');
  const textContent = ref('');

  function detectType(mimeType: string): PreviewType {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('xml')) return 'code';
    if (mimeType.includes('word') || mimeType.includes('excel') || mimeType.includes('powerpoint') || mimeType.includes('openxml')) return 'office';
    if (mimeType.includes('epub') || mimeType.includes('mobi')) return 'ebook';
    return 'unsupported';
  }

  async function loadPreview(fileId: string): Promise<void> {
    loading.value = true;
    error.value = '';
    try {
      const res = await apiClient<{ success: boolean; data: { name: string; mime_type: string; size: number } }>(
        `/files/${fileId}`
      );
      fileName.value = res.data.name;
      previewType.value = detectType(res.data.mime_type);
      previewUrl.value = `/api/files/${fileId}/download`;
      downloadUrl.value = `/api/files/${fileId}/download`;

      if (previewType.value === 'code') {
        const r = await fetch(previewUrl.value);
        textContent.value = await r.text();
      }
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      loading.value = false;
    }
  }

  return { loading, error, previewType, previewUrl, downloadUrl, fileName, textContent, loadPreview };
}
