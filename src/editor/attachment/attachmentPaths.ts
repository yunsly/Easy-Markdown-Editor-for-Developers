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

export async function resolveAttachmentFileName(
  requestedFileName: string,
  fileExists: (candidate: string) => boolean | Promise<boolean>,
): Promise<string> {
  if (!(await fileExists(requestedFileName))) {
    return requestedFileName;
  }

  const extension = path.posix.extname(requestedFileName);
  const baseName = requestedFileName.slice(
    0,
    requestedFileName.length - extension.length,
  );
  let suffix = 2;

  while (await fileExists(`${baseName}-${suffix}${extension}`)) {
    suffix += 1;
  }

  return `${baseName}-${suffix}${extension}`;
}
