import { describe, expect, it } from 'vitest';

import { classifyAttachment } from '../src/editor/attachment/attachmentPaths';

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
