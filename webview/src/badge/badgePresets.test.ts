import { describe, expect, it } from 'vitest';

import {
  badgeCategoryLabels,
  filterTechnologyBadgePresets,
  technologyBadgePresets,
} from './badgePresets';

describe('technologyBadgePresets', () => {
  it('contains an expanded technology catalog', () => {
    expect(technologyBadgePresets).toHaveLength(164);
    expect(technologyBadgePresets.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        'Swift',
        'Rust',
        'React',
        'Next.js',
        'Spring Boot',
        'Django',
        'Flutter',
        'Kubernetes',
        'PostgreSQL',
        'TensorFlow',
        'Vitest',
        'Visual Studio Code',
      ]),
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
      language: 20,
      frontend: 24,
      backend: 18,
      'mobile-xr': 11,
      cloud: 23,
      database: 15,
      'data-ai': 14,
      testing: 10,
      tool: 29,
    });
  });

  it('provides a label for every populated category', () => {
    for (const { category } of technologyBadgePresets) {
      expect(badgeCategoryLabels[category]).toBeTruthy();
    }
  });

  it('filters by name, metadata, and category using every search term', () => {
    expect(filterTechnologyBadgePresets('  REACT mobile  ').map(
      ({ name }) => name,
    )).toEqual(['React Native']);
    expect(filterTechnologyBadgePresets('dotnet').map(
      ({ name }) => name,
    )).toEqual(['C#', 'ASP.NET Core']);
    expect(filterTechnologyBadgePresets('cloud devops')).toHaveLength(23);
  });

  it('returns the full catalog for a blank query and none for no match', () => {
    expect(filterTechnologyBadgePresets('   ')).toBe(
      technologyBadgePresets,
    );
    expect(filterTechnologyBadgePresets('no-such-technology')).toEqual([]);
  });
});
