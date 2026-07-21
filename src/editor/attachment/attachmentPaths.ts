import path from 'node:path';

export type AttachmentKind = 'file' | 'image';

const IMAGE_EXTENSIONS = new Set([
  '.gif',
  '.jpeg',
  '.jpg',
  '.png',
  '.svg',
  '.webp',
]);

export function classifyAttachment(fileName: string): AttachmentKind {
  const extension = path.posix.extname(fileName).toLowerCase();

  return IMAGE_EXTENSIONS.has(extension) ? 'image' : 'file';
}
