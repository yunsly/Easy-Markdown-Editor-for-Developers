import { describe, expect, it } from 'vitest';

import { validateAttachmentForm } from './validateAttachmentForm';

const validValues = {
  destinationFolder: 'docs/assets',
  fileName: '편집 화면 (최종) #100%.png',
  originalFileName: 'preview.png',
  text: 'Editor preview',
};

describe('validateAttachmentForm', () => {
  it('accepts safe Unicode form values', () => {
    expect(validateAttachmentForm(validValues)).toBeUndefined();
  });

  it.each([
    ['', 'Destination folder is required.'],
    ['../assets', 'Relative path traversal is not allowed.'],
    ['/assets', 'Use a workspace-relative folder with forward slashes.'],
    [String.raw`docs\assets`, 'Use a workspace-relative folder with forward slashes.'],
    ['docs//assets', 'Path segments must not be empty.'],
  ])('rejects destination folder %s', (destinationFolder, message) => {
    expect(validateAttachmentForm({
      ...validValues,
      destinationFolder,
    })).toEqual({ field: 'destinationFolder', message });
  });

  it('rejects file names containing separators or reserved names', () => {
    expect(validateAttachmentForm({
      ...validValues,
      fileName: 'nested/preview.png',
    })?.field).toBe('fileName');
    expect(validateAttachmentForm({
      ...validValues,
      fileName: 'NUL.txt',
    })?.field).toBe('fileName');
  });

  it('guards against accidentally removing the original extension', () => {
    expect(validateAttachmentForm({
      ...validValues,
      fileName: 'preview',
    })).toEqual({
      field: 'fileName',
      message: 'Keep a file extension when renaming this attachment.',
    });
  });

  it('requires alt text or link text', () => {
    expect(validateAttachmentForm({
      ...validValues,
      text: '',
    })?.field).toBe('text');
  });
});
