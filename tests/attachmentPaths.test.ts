import { describe, expect, it } from 'vitest';

import {
  classifyAttachment,
  resolveAttachmentFileName,
} from '../src/editor/attachment/attachmentPaths';

describe('classifyAttachment', () => {
  it.each([
    'preview.png',
    'photo.jpg',
    'photo.jpeg',
    'animation.gif',
    'diagram.webp',
    'icon.svg',
    'UPPER.PNG',
  ])('classifies %s as an image', (fileName) => {
    expect(classifyAttachment(fileName)).toBe('image');
  });

  it.each([
    'manual.pdf',
    'archive.tar.gz',
    'README',
    '.gitignore',
    'image.png.txt',
  ])('classifies %s as a generic file', (fileName) => {
    expect(classifyAttachment(fileName)).toBe('file');
  });
});

describe('resolveAttachmentFileName', () => {
  it('keeps the requested name when it is available', async () => {
    await expect(resolveAttachmentFileName(
      'preview.png',
      () => false,
    )).resolves.toBe('preview.png');
  });

  it('adds an incrementing suffix without overwriting existing files', async () => {
    const existingNames = new Set([
      'preview.png',
      'preview-2.png',
      'preview-3.png',
    ]);

    await expect(resolveAttachmentFileName(
      'preview.png',
      (candidate) => existingNames.has(candidate),
    )).resolves.toBe('preview-4.png');
  });

  it.each([
    ['README', 'README-2'],
    ['archive.tar.gz', 'archive.tar-2.gz'],
    ['.gitignore', '.gitignore-2'],
    ['한글 문서.pdf', '한글 문서-2.pdf'],
  ])('resolves a collision for %s', async (fileName, expected) => {
    await expect(resolveAttachmentFileName(
      fileName,
      (candidate) => candidate === fileName,
    )).resolves.toBe(expected);
  });
});
