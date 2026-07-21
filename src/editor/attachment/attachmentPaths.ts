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

const WINDOWS_RESERVED_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const INVALID_FILE_NAME_CHARACTERS = /[<>:"/\\|?*]/;

const validatePathSegment = (segment: string): string | undefined => {
  if (segment.length === 0) {
    return 'Path segments must not be empty.';
  }

  if (segment === '.' || segment === '..') {
    return 'Relative path traversal is not allowed.';
  }

  if (
    INVALID_FILE_NAME_CHARACTERS.test(segment) ||
    Array.from(segment).some((character) => character.charCodeAt(0) < 32) ||
    segment.endsWith(' ') ||
    segment.endsWith('.') ||
    WINDOWS_RESERVED_NAME.test(segment)
  ) {
    return 'The path contains a name that is not portable across supported platforms.';
  }

  return undefined;
};

export function validateAttachmentDestinationFolder(
  destinationFolder: string,
): string | undefined {
  if (destinationFolder.length === 0) {
    return 'Destination folder must not be empty.';
  }

  if (
    destinationFolder.startsWith('/') ||
    destinationFolder.includes('\\') ||
    path.posix.isAbsolute(destinationFolder)
  ) {
    return 'Destination folder must be a workspace-relative path using forward slashes.';
  }

  for (const segment of destinationFolder.split('/')) {
    const error = validatePathSegment(segment);

    if (error !== undefined) {
      return error;
    }
  }

  return undefined;
}

export function validateAttachmentFileName(
  fileName: string,
): string | undefined {
  if (fileName.length === 0) {
    return 'File name must not be empty.';
  }

  return validatePathSegment(fileName);
}

export function isPathInsideRoot(
  rootPath: string,
  candidatePath: string,
): boolean {
  const relativePath = path.posix.relative(
    normalizePathSeparators(rootPath),
    normalizePathSeparators(candidatePath),
  );

  return relativePath === '' || (
    relativePath !== '..' &&
    !relativePath.startsWith('../') &&
    !path.posix.isAbsolute(relativePath)
  );
}
