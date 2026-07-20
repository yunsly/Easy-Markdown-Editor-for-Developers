import { describe, expect, it } from 'vitest';

import { createBadgeMarkdown } from './createBadgeMarkdown';

const SWIFT_BADGE_URL =
  'https://img.shields.io/badge/Swift-F05138?logo=swift&logoColor=white';

describe('createBadgeMarkdown', () => {
  it('creates standard image Markdown', () => {
    expect(createBadgeMarkdown({
      altText: 'Swift',
      imageUrl: SWIFT_BADGE_URL,
    })).toBe(`![Swift](${SWIFT_BADGE_URL})`);
  });

  it('wraps the image in a link when a click URL is provided', () => {
    expect(createBadgeMarkdown({
      altText: 'Swift',
      imageUrl: SWIFT_BADGE_URL,
      linkUrl: 'https://www.swift.org/',
    })).toBe(
      `[![Swift](${SWIFT_BADGE_URL})](https://www.swift.org/)`,
    );
  });

  it('escapes Markdown delimiters in text and destinations', () => {
    expect(createBadgeMarkdown({
      altText: String.raw`C[++] \ tools`,
      imageUrl: 'https://example.com/badge_(dark).svg',
      linkUrl: 'https://example.com/docs_(latest)',
    })).toBe(
      String.raw`[![C\[++\] \\ tools](https://example.com/badge_\(dark\).svg)](https://example.com/docs_\(latest\))`,
    );
  });

  it('rejects empty alt text and image URLs', () => {
    expect(() => createBadgeMarkdown({
      altText: ' ',
      imageUrl: SWIFT_BADGE_URL,
    })).toThrow('Badge alt text must not be empty.');
    expect(() => createBadgeMarkdown({
      altText: 'Swift',
      imageUrl: ' ',
    })).toThrow('Badge image URL must not be empty.');
  });
});
