import { describe, expect, it } from 'vitest';

import { applyBadgePalette } from './applyBadgePalette';
import {
  badgePalettes,
  technologyBadgePresets,
} from './badgePresets';

describe('applyBadgePalette', () => {
  const swift = technologyBadgePresets[0];

  it('applies the labeled Brand palette', () => {
    expect(applyBadgePalette(swift, badgePalettes[0])).toEqual({
      label: 'language',
      message: 'Swift',
      labelColor: '555555',
      messageColor: 'F05138',
      logo: 'swift',
      logoColor: 'white',
      style: 'flat',
    });
  });

  it('applies the label-free Brand Solid palette', () => {
    expect(applyBadgePalette(swift, badgePalettes[1])).toEqual({
      message: 'Swift',
      messageColor: 'F05138',
      logo: 'swift',
      logoColor: 'white',
      style: 'flat',
    });
  });

  it('applies the fixed Dark palette without mutating its inputs', () => {
    const technologyBefore = structuredClone(swift);
    const paletteBefore = structuredClone(badgePalettes[2]);

    expect(applyBadgePalette(swift, badgePalettes[2])).toEqual({
      message: 'Swift',
      messageColor: '24292F',
      logo: 'swift',
      logoColor: 'white',
      style: 'flat',
    });
    expect(swift).toEqual(technologyBefore);
    expect(badgePalettes[2]).toEqual(paletteBefore);
  });
});
