import { describe, expect, it } from 'vitest';

import {
  classifyAttachment,
  createMarkdownRelativePath,
  encodeMarkdownPathForUrl,
  escapeMarkdownDestination,
  isPathInsideRoot,
  resolveAttachmentFileName,
  validateAttachmentDestinationFolder,
  validateAttachmentFileName,
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

describe('createMarkdownRelativePath', () => {
  it('creates a path relative to the Markdown document directory', () => {
    expect(createMarkdownRelativePath(
      '/project/docs/guide.md',
      '/project/assets/preview.png',
    )).toBe('../assets/preview.png');
  });

  it('handles attachments in the same directory', () => {
    expect(createMarkdownRelativePath(
      '/project/README.md',
      '/project/manual.pdf',
    )).toBe('manual.pdf');
  });

  it('normalizes Windows path separators', () => {
    expect(createMarkdownRelativePath(
      String.raw`C:\project\docs\guide.md`,
      String.raw`C:\project\assets\preview.png`,
    )).toBe('../assets/preview.png');
  });

  it('preserves readable Unicode and special characters', () => {
    expect(createMarkdownRelativePath(
      '/project/docs/가이드.md',
      '/project/docs/assets/편집 화면 (최종) #100%.png',
    )).toBe('assets/편집 화면 (최종) #100%.png');
  });
});

describe('Markdown attachment path encoding', () => {
  it('escapes Markdown destination delimiters without URL encoding', () => {
    expect(escapeMarkdownDestination(
      String.raw`assets/편집 화면 (최종) #100%\preview.png`,
    )).toBe(
      String.raw`assets/편집 화면 \(최종\) #100%\\preview.png`,
    );
  });

  it('URL-encodes path segments while preserving path separators', () => {
    expect(encodeMarkdownPathForUrl(
      '../assets/편집 화면 (최종) #100%.png',
    )).toBe(
      '../assets/%ED%8E%B8%EC%A7%91%20%ED%99%94%EB%A9%B4%20%28%EC%B5%9C%EC%A2%85%29%20%23100%25.png',
    );
  });
});

describe('attachment destination validation', () => {
  it.each([
    'assets',
    'docs/assets',
    '문서 자료/이미지 파일',
    'release-2026.07/files',
  ])('accepts the safe destination folder %s', (destinationFolder) => {
    expect(
      validateAttachmentDestinationFolder(destinationFolder),
    ).toBeUndefined();
  });

  it.each([
    '',
    '/absolute/assets',
    String.raw`C:\absolute\assets`,
    'docs/../assets',
    'docs//assets',
    'docs/./assets',
    'docs/assets.',
    'docs/NUL',
    'docs/a\0b',
  ])('rejects the unsafe destination folder %s', (destinationFolder) => {
    expect(
      validateAttachmentDestinationFolder(destinationFolder),
    ).toBeTypeOf('string');
  });

  it.each([
    'preview.png',
    '편집 화면 (최종) #100%.png',
    'archive.tar.gz',
  ])('accepts the safe file name %s', (fileName) => {
    expect(validateAttachmentFileName(fileName)).toBeUndefined();
  });

  it.each([
    '',
    '../preview.png',
    'nested/preview.png',
    String.raw`nested\preview.png`,
    'preview?.png',
    'preview.png.',
    'COM1.txt',
    'a\0b.png',
  ])('rejects the unsafe file name %s', (fileName) => {
    expect(validateAttachmentFileName(fileName)).toBeTypeOf('string');
  });

  it('recognizes candidates inside the selected workspace root', () => {
    expect(
      isPathInsideRoot('/workspace', '/workspace/docs/assets'),
    ).toBe(true);
    expect(isPathInsideRoot('/workspace', '/workspace')).toBe(true);
    expect(
      isPathInsideRoot('/workspace', '/workspace-other/assets'),
    ).toBe(false);
    expect(isPathInsideRoot('/workspace', '/outside/assets')).toBe(false);
  });
});
