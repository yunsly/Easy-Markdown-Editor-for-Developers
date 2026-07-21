import { describe, expect, it } from 'vitest';

import {
  isExtensionToWebviewMessage,
  isWebviewToExtensionMessage,
} from '../src/shared/messages';

describe('attachment message validation', () => {
  it.each([
    {
      type: 'requestAttachmentSource',
      requestId: 'request-1',
    },
    {
      type: 'copyAttachment',
      requestId: 'request-1',
      destinationFolder: 'docs/assets',
      fileName: '편집 화면.png',
    },
  ])('accepts a valid Webview message', (message) => {
    expect(isWebviewToExtensionMessage(message)).toBe(true);
  });

  it.each([
    { type: 'requestAttachmentSource', requestId: '' },
    {
      type: 'copyAttachment',
      requestId: 'request-1',
      destinationFolder: 42,
      fileName: 'preview.png',
    },
  ])('rejects an invalid Webview message', (message) => {
    expect(isWebviewToExtensionMessage(message)).toBe(false);
  });

  it.each([
    {
      type: 'attachmentSourceSelected',
      requestId: 'request-1',
      originalFileName: 'preview.png',
      detectedKind: 'image',
      defaultDestinationFolder: 'docs/assets',
    },
    {
      type: 'attachmentReady',
      requestId: 'request-1',
      markdownPath: 'assets/preview.png',
      finalFileName: 'preview.png',
      detectedKind: 'image',
    },
    { type: 'attachmentCancelled', requestId: 'request-1' },
    {
      type: 'attachmentFailed',
      requestId: 'request-1',
      message: 'Copy failed.',
    },
  ])('accepts a valid Extension Host message', (message) => {
    expect(isExtensionToWebviewMessage(message)).toBe(true);
  });

  it.each([
    {
      type: 'attachmentSourceSelected',
      requestId: 'request-1',
      originalFileName: 'preview.png',
      detectedKind: 'video',
      defaultDestinationFolder: 'assets',
    },
    {
      type: 'attachmentReady',
      requestId: '',
      markdownPath: 'assets/preview.png',
      finalFileName: 'preview.png',
      detectedKind: 'image',
    },
  ])('rejects an invalid Extension Host message', (message) => {
    expect(isExtensionToWebviewMessage(message)).toBe(false);
  });
});
