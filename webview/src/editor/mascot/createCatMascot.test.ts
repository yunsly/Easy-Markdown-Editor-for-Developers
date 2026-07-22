import { describe, expect, it } from 'vitest';

import { isCatMascotVisible } from './createCatMascot';

describe('isCatMascotVisible', () => {
  it('shows an enabled mascot only in visual mode', () => {
    expect(isCatMascotVisible('visual', true)).toBe(true);
    expect(isCatMascotVisible('source', true)).toBe(false);
  });

  it('keeps a disabled mascot hidden in every editor mode', () => {
    expect(isCatMascotVisible('visual', false)).toBe(false);
    expect(isCatMascotVisible('source', false)).toBe(false);
  });
});
