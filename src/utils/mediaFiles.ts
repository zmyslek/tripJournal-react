export type MediaKind = 'image' | 'video';

export const IMAGE_EXTENSIONS = new Set([
  'jpeg',
  'jpg',
  'jpe',
  'jfif',
  'png',
  'webp',
  'gif',
  'avif',
  'bmp',
  'svg',
  'ico',
  'heic',
  'heif',
  'tif',
  'tiff'
]);

export const VIDEO_EXTENSIONS = new Set([
  'mp4',
  'mov',
  'webm',
  'm4v',
  'avi',
  'mkv',
  'wmv',
  'flv',
  '3gp',
  'mpeg',
  'mpg',
  'mts',
  'm2ts',
  'qt'
]);

function normalizeExtension(input: string): string {
  const extension = input.split('.').pop()?.trim().toLowerCase() ?? '';
  return extension;
}

export function getExtensionFromPath(path: string): string {
  return normalizeExtension(path);
}

export function inferMediaKindFromMimeType(mimeType: string): MediaKind | null {
  if (mimeType.startsWith('video/')) {
    return 'video';
  }

  if (mimeType.startsWith('image/')) {
    return 'image';
  }

  return null;
}

export function inferMediaKindFromName(fileName: string, mimeType = ''): MediaKind | null {
  const mimeKind = inferMediaKindFromMimeType(mimeType);
  if (mimeKind) {
    return mimeKind;
  }

  const extension = normalizeExtension(fileName);
  if (VIDEO_EXTENSIONS.has(extension)) {
    return 'video';
  }

  if (IMAGE_EXTENSIONS.has(extension)) {
    return 'image';
  }

  return null;
}

export function isSupportedMediaFile(fileName: string, mimeType = ''): boolean {
  return inferMediaKindFromName(fileName, mimeType) !== null;
}
