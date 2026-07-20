import { describe, expect, it } from 'vitest';

import { technologyBadgePresets } from './badgePresets';

const expectedNames = [
  'Swift',
  'TypeScript',
  'JavaScript',
  'Python',
  'Java',
  'Kotlin',
  'C',
  'C++',
  'React',
  'Vue.js',
  'HTML5',
  'CSS3',
  'Vite',
  'Node.js',
  'Spring Boot',
  'Express',
  'FastAPI',
  'iOS',
  'Android',
  'visionOS',
  'SwiftUI',
  'Unity',
  'AWS',
  'Docker',
  'Kubernetes',
  'MySQL',
  'PostgreSQL',
  'MongoDB',
  'Git',
  'GitHub',
  'Visual Studio Code',
  'Xcode',
  'Figma',
] as const;

describe('technologyBadgePresets', () => {
  it('contains the complete recommended technology set', () => {
    expect(technologyBadgePresets.map(({ name }) => name)).toEqual(
      expectedNames,
    );
  });

  it('uses unique stable IDs and valid Shields metadata', () => {
    const ids = technologyBadgePresets.map(({ id }) => id);

    expect(new Set(ids).size).toBe(ids.length);

    for (const preset of technologyBadgePresets) {
      expect(preset.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(preset.logoSlug).toMatch(/^[a-z0-9]+$/);
      expect(preset.brandColor).toMatch(/^[0-9A-F]{6}$/);
      expect(new URL(preset.homepage).protocol).toBe('https:');
    }
  });

  it('covers every recommended category', () => {
    const categoryCounts = Object.fromEntries(
      technologyBadgePresets.map(({ category }) => [
        category,
        technologyBadgePresets.filter(
          (preset) => preset.category === category,
        ).length,
      ]),
    );

    expect(categoryCounts).toEqual({
      language: 8,
      frontend: 5,
      backend: 4,
      'mobile-xr': 5,
      cloud: 3,
      database: 3,
      tool: 5,
    });
  });
});
