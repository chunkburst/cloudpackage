// Preview service: determine preview strategy for files

import type { FileRow } from '@cloudpackage/shared/types';
import { PREVIEW_SUPPORTED_MIME_TYPES, PREVIEW_MAX_FILE_SIZE_BYTES, ValidationError } from '@cloudpackage/shared';
import { FileService } from './file.service.js';
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
  canPreview: boolean;
  reason?: string;
}

const TEXT_PREVIEW_MAX_BYTES = 1024 * 1024;

export class PreviewService {
  constructor(private env: Env) {}

  getPreviewConfig(file: FileRow): PreviewConfig {
    const mimeType = file.mime_type || 'application/octet-stream';
    const mainType = mimeType.split('/')[0];

    if (file.is_directory) {
      return { strategy: 'unsupported', mimeType, canPreview: false, reason: 'Directories cannot be previewed' };
    }

    if (file.size > PREVIEW_MAX_FILE_SIZE_BYTES) {
      return { strategy: 'unsupported', mimeType, canPreview: false, reason: 'File is too large to preview' };
    }

    if (mainType === 'image' && PREVIEW_SUPPORTED_MIME_TYPES.has(mimeType)) {
      return { strategy: 'native-image', mimeType, canPreview: true };
    }

    if (mainType === 'video' && PREVIEW_SUPPORTED_MIME_TYPES.has(mimeType)) {
      return { strategy: 'native-video', mimeType, canPreview: true };
    }

    if (mainType === 'audio' && PREVIEW_SUPPORTED_MIME_TYPES.has(mimeType)) {
      return { strategy: 'native-audio', mimeType, canPreview: true };
    }

    if (mimeType === 'application/pdf') {
      return { strategy: 'pdf-viewer', mimeType, canPreview: true };
    }

    if (this.isTextMimeType(mimeType)) {
      return { strategy: 'code-viewer', mimeType, canPreview: true };
    }

    if (
      mimeType.includes('officedocument') ||
      mimeType === 'application/msword' ||
      mimeType === 'application/vnd.ms-excel' ||
      mimeType === 'application/vnd.ms-powerpoint'
    ) {
      return { strategy: 'unsupported', mimeType, canPreview: false, reason: 'Office preview is not configured yet' };
    }

    if (mimeType === 'application/epub+zip' || mimeType === 'application/x-mobipocket-ebook') {
      return { strategy: 'unsupported', mimeType, canPreview: false, reason: 'Ebook preview is not configured yet' };
    }

    return { strategy: 'unsupported', mimeType, canPreview: false, reason: 'Preview is not available for this file type' };
  }

  async getPreviewUrl(fileId: string, _userId: string): Promise<string> {
    return `/api/files/${fileId}/download`;
  }

  async getRawContent(fileId: string, userId: string): Promise<{ content: string; mimeType: string }> {
    const fileSvc = new FileService(this.env);
    await fileSvc.init();
    const file = await fileSvc.getFile(fileId, userId);
    const config = this.getPreviewConfig(file);

    if (!config.canPreview || config.strategy !== 'code-viewer') {
      throw new ValidationError(config.reason || 'Raw text preview is not available');
    }

    if (file.size > TEXT_PREVIEW_MAX_BYTES) {
      throw new ValidationError('Text preview is limited to 1 MB');
    }

    const { stream, meta } = await fileSvc.getDownloadStream(fileId, userId);
    return { content: await new Response(stream).text(), mimeType: meta.mimeType };
  }

  private isTextMimeType(mimeType: string): boolean {
    return (
      mimeType.startsWith('text/') ||
      mimeType === 'application/json' ||
      mimeType === 'application/xml' ||
      mimeType.includes('javascript') ||
      mimeType.includes('typescript') ||
      mimeType.includes('yaml') ||
      mimeType.includes('markdown')
    );
  }
}
