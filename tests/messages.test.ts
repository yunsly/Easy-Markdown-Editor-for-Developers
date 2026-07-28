import { describe, expect, it } from 'vitest';

import {
  isExtensionToWebviewMessage,
  isWebviewToExtensionMessage,
} from '../src/shared/messages';

describe('Webview message validation', () => {
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
    {
      type: 'cancelAttachment',
      requestId: 'request-1',
    },
    {
      type: 'writeClipboardText',
      requestId: 'clipboard-1',
      text: 'const greeting = "안녕하세요";',
    },
    {
      type: 'writeClipboardText',
      requestId: 'clipboard-2',
      text: '',
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
    { type: 'writeClipboardText', requestId: 'clipboard-1', text: 42 },
    { type: 'writeClipboardText', requestId: '', text: 'code' },
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
    {
      type: 'clipboardTextWritten',
      requestId: 'clipboard-1',
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
    { type: 'clipboardTextWritten', requestId: '' },
  ])('rejects an invalid Extension Host message', (message) => {
    expect(isExtensionToWebviewMessage(message)).toBe(false);
  });
});

describe('document resource base message validation', () => {
  it('accepts an optional Webview resource base URI', () => {
    expect(isExtensionToWebviewMessage({
      type: 'initDocument',
      text: '# Document',
      version: 1,
      resourceBaseUri: 'https://file+.vscode-resource.vscode-cdn.net/project',
    })).toBe(true);
  });

  it('rejects a non-string Webview resource base URI', () => {
    expect(isExtensionToWebviewMessage({
      type: 'initDocument',
      text: '# Document',
      version: 1,
      resourceBaseUri: 42,
    })).toBe(false);
  });
});
