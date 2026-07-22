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
    {
      type: 'cancelAttachment',
      requestId: 'request-1',
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

describe('document resource base message validation', () => {
  it('accepts an optional Webview resource base URI', () => {
    expect(isExtensionToWebviewMessage({
      type: 'initDocument',
      text: '# Document',
      version: 1,
      mascotEnabled: true,
      resourceBaseUri: 'https://file+.vscode-resource.vscode-cdn.net/project',
    })).toBe(true);
  });

  it('rejects a non-string Webview resource base URI', () => {
    expect(isExtensionToWebviewMessage({
      type: 'initDocument',
      text: '# Document',
      version: 1,
      mascotEnabled: true,
      resourceBaseUri: 42,
    })).toBe(false);
  });

  it('requires a Boolean mascot preference in the initial document', () => {
    expect(isExtensionToWebviewMessage({
      type: 'initDocument',
      text: '# Document',
      version: 1,
      mascotEnabled: 'yes',
    })).toBe(false);
  });
});

describe('UI preference message validation', () => {
  it('accepts a Boolean mascot visibility update', () => {
    expect(isExtensionToWebviewMessage({
      type: 'updateUiPreferences',
      mascotEnabled: false,
    })).toBe(true);
  });

  it('rejects a non-Boolean mascot visibility update', () => {
    expect(isExtensionToWebviewMessage({
      type: 'updateUiPreferences',
      mascotEnabled: 'false',
    })).toBe(false);
  });
});
