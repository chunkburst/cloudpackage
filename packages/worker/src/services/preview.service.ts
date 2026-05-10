// Preview service: determine preview strategy for files

import type { FileRow } from '@cloudpackage/shared/types';
import { PREVIEW_SUPPORTED_MIME_TYPES, PREVIEW_MAX_FILE_SIZE_BYTES } from '@cloudpackage/shared';
import type { Env } from '../env.js';

export type PreviewStrategy =
  | 'native-image'
  | 'native-video'
  | 'native-audio'
  | 'pdf-viewer'
  | 'code-viewer'
  | 'office-iframe'
  | 'ebook-viewer'
  | 'text-viewer'
  | 'iframe-external'
  | 'unsupported';

export interface PreviewConfig {
  strategy: PreviewStrategy;
  mimeType: string;
  url?: string;
  canPreview: boolean;
}

export class PreviewService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_env: Env) {}

  getPreviewConfig(file: FileRow): PreviewConfig {
    const mimeType = file.mime_type || 'application/octet-stream';
    const mainType = mimeType.split('/')[0];

    // Check size limit
    if (file.size > PREVIEW_MAX_FILE_SIZE_BYTES) {
      return { strategy: 'unsupported', mimeType, canPreview: false };
    }

    // Images
    if (mainType === 'image') {
      if (PREVIEW_SUPPORTED_MIME_TYPES.has(mimeType)) {
        return { strategy: 'native-image', mimeType, canPreview: true };
      }
    }

    // Video
    if (mainType === 'video') {
      if (PREVIEW_SUPPORTED_MIME_TYPES.has(mimeType)) {
        return { strategy: 'native-video', mimeType, canPreview: true };
      }
    }

    // Audio
    if (mainType === 'audio') {
      if (PREVIEW_SUPPORTED_MIME_TYPES.has(mimeType)) {
        return { strategy: 'native-audio', mimeType, canPreview: true };
      }
    }

    // PDF
    if (mimeType === 'application/pdf') {
      return { strategy: 'pdf-viewer', mimeType, canPreview: true };
    }

    // Code / text
    if (
      mainType === 'text' ||
      mimeType === 'application/json' ||
      mimeType === 'application/xml' ||
      mimeType === 'text/yaml'
    ) {
      return { strategy: 'code-viewer', mimeType, canPreview: true };
    }

    // Markdown
    if (mimeType === 'text/markdown') {
      return { strategy: 'code-viewer', mimeType, canPreview: true };
    }

    // Office documents (iframe to external viewer)
    if (
      mimeType.includes('officedocument') ||
      mimeType === 'application/msword'
    ) {
      return { strategy: 'office-iframe', mimeType, canPreview: true };
    }

    // Ebooks
    if (
      mimeType === 'application/epub+zip' ||
      mimeType === 'application/x-mobipocket-ebook'
    ) {
      return { strategy: 'ebook-viewer', mimeType, canPreview: true };
    }

    // Archives
    if (
      mimeType === 'application/zip' ||
      mimeType === 'application/x-rar-compressed' ||
      mimeType === 'application/x-7z-compressed' ||
      mimeType === 'application/gzip'
    ) {
      return { strategy: 'iframe-external', mimeType, canPreview: true };
    }

    // Unsupported
    return { strategy: 'unsupported', mimeType, canPreview: false };
  }

  async getPreviewUrl(fileId: string, _userId: string): Promise<string> {
    return `/api/files/${fileId}/download`;
  }

  async getRawContent(
    _fileId: string,
    _userId: string
  ): Promise<{ content: string; mimeType: string }> {
    // For small text files, fetch and return content directly
    // This would stream the file through the worker
    return { content: '', mimeType: 'text/plain' };
  }
}
