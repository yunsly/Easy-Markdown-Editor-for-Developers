import { describe, expect, it } from 'vitest';

import { resolveWorkspaceImageSource } from './registerWorkspaceImageView';

const RESOURCE_BASE =
  'https://file+.vscode-resource.vscode-cdn.net/project/docs';

describe('resolveWorkspaceImageSource', () => {
  it('resolves nested and parent paths from the Markdown document folder', () => {
    expect(resolveWorkspaceImageSource(
      'assets/preview.png',
      RESOURCE_BASE,
    )).toBe(
      'https://file+.vscode-resource.vscode-cdn.net/project/docs/assets/preview.png',
    );
    expect(resolveWorkspaceImageSource(
      '../assets/preview.png',
      RESOURCE_BASE,
    )).toBe(
      'https://file+.vscode-resource.vscode-cdn.net/project/assets/preview.png',
    );
  });

  it('encodes Unicode, spaces, parentheses, hashes, and percent signs', () => {
    expect(resolveWorkspaceImageSource(
      'assets/편집 화면 (최종) #100%.png',
      RESOURCE_BASE,
    )).toBe(
      'https://file+.vscode-resource.vscode-cdn.net/project/docs/assets/%ED%8E%B8%EC%A7%91%20%ED%99%94%EB%A9%B4%20%28%EC%B5%9C%EC%A2%85%29%20%23100%25.png',
    );
  });

  it('does not double-encode an existing percent-encoded path', () => {
    expect(resolveWorkspaceImageSource(
      'assets/editor%20preview.png',
      RESOURCE_BASE,
    )).toBe(
      'https://file+.vscode-resource.vscode-cdn.net/project/docs/assets/editor%20preview.png',
    );
  });

  it.each([
    'https://example.com/preview.png',
    'data:image/png;base64,abc',
    '/absolute/preview.png',
    '#fragment',
  ])('keeps non-relative source %s unchanged', (source) => {
    expect(resolveWorkspaceImageSource(source, RESOURCE_BASE)).toBe(source);
  });

  it('falls back to the Markdown source for an invalid base URI', () => {
    expect(resolveWorkspaceImageSource('assets/preview.png', 'not a URL'))
      .toBe('assets/preview.png');
  });
});
