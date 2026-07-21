export interface AttachmentFormValues {
  destinationFolder: string;
  fileName: string;
  originalFileName: string;
  text: string;
}

export interface AttachmentFormError {
  field: 'destinationFolder' | 'fileName' | 'text';
  message: string;
}

const WINDOWS_RESERVED_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const INVALID_FILE_NAME_CHARACTERS = /[<>:"/\\|?*]/;

const getSegmentError = (segment: string): string | undefined => {
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
    return 'Use a file or folder name that is valid on Windows, macOS, and Linux.';
  }

  return undefined;
};

const getExtension = (fileName: string): string => {
  const lastDot = fileName.lastIndexOf('.');

  return lastDot > 0 ? fileName.slice(lastDot) : '';
};

export function validateAttachmentForm(
  values: AttachmentFormValues,
): AttachmentFormError | undefined {
  if (values.destinationFolder.length === 0) {
    return {
      field: 'destinationFolder',
      message: 'Destination folder is required.',
    };
  }

  if (
    values.destinationFolder.startsWith('/') ||
    values.destinationFolder.includes('\\')
  ) {
    return {
      field: 'destinationFolder',
      message: 'Use a workspace-relative folder with forward slashes.',
    };
  }

  for (const segment of values.destinationFolder.split('/')) {
    const message = getSegmentError(segment);

    if (message !== undefined) {
      return { field: 'destinationFolder', message };
    }
  }

  if (values.fileName.length === 0) {
    return { field: 'fileName', message: 'File name is required.' };
  }

  const fileNameError = getSegmentError(values.fileName);

  if (fileNameError !== undefined) {
    return { field: 'fileName', message: fileNameError };
  }

  if (
    getExtension(values.originalFileName).length > 0 &&
    getExtension(values.fileName).length === 0
  ) {
    return {
      field: 'fileName',
      message: 'Keep a file extension when renaming this attachment.',
    };
  }

  if (values.text.length === 0) {
    return { field: 'text', message: 'Alt text or link text is required.' };
  }

  return undefined;
}
