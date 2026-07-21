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

const normalizePathSeparators = (value: string): string =>
  value.replaceAll('\\', '/');

export function createMarkdownRelativePath(
  documentPath: string,
  attachmentPath: string,
): string {
  const normalizedDocumentPath = normalizePathSeparators(documentPath);
  const normalizedAttachmentPath = normalizePathSeparators(attachmentPath);

  return path.posix.relative(
    path.posix.dirname(normalizedDocumentPath),
    normalizedAttachmentPath,
  );
}

export function escapeMarkdownDestination(destination: string): string {
  return destination.replaceAll('\\', '\\\\').replaceAll('(', '\\(')
    .replaceAll(')', '\\)');
}

export function encodeMarkdownPathForUrl(markdownPath: string): string {
  return markdownPath.split('/').map((segment) =>
    encodeURIComponent(segment).replaceAll('(', '%28').replaceAll(')', '%29')
  ).join('/');
}
