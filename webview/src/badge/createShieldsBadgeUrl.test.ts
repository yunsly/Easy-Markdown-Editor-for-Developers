import { describe, expect, it } from 'vitest';

import { createShieldsBadgeUrl } from './createShieldsBadgeUrl';

describe('createShieldsBadgeUrl', () => {
  it('creates a labeled brand badge with logo options', () => {
    expect(createShieldsBadgeUrl({
      label: 'language',
      message: 'Swift',
      labelColor: '555555',
      messageColor: 'F05138',
      logo: 'swift',
      logoColor: 'white',
      style: 'flat',
    })).toBe(
      'https://img.shields.io/badge/language-Swift-F05138?logo=swift&logoColor=white&labelColor=555555',
    );
  });

  it('creates a label-free badge and normalizes a hex color', () => {
    expect(createShieldsBadgeUrl({
      label: '',
      message: 'C++ / CLI',
      messageColor: '#24292F',
      style: 'flat-square',
    })).toBe(
      'https://img.shields.io/badge/C%2B%2B%20%2F%20CLI-24292F?style=flat-square',
    );
  });

  it('escapes Shields path separators without changing displayed text', () => {
    expect(createShieldsBadgeUrl({
      label: 'build_status',
      message: 'in-progress_name',
      messageColor: 'blue',
      style: 'for-the-badge',
    })).toBe(
      'https://img.shields.io/badge/build__status-in--progress__name-blue?style=for-the-badge',
    );
  });

  it('rejects empty required values', () => {
    expect(() => createShieldsBadgeUrl({
      message: ' ',
      messageColor: 'blue',
      style: 'flat',
    })).toThrow('Badge message must not be empty.');
    expect(() => createShieldsBadgeUrl({
      message: 'ready',
      messageColor: ' # ',
      style: 'flat',
    })).toThrow('Badge message color must not be empty.');
  });
});
