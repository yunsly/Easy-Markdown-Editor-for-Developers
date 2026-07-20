import type {
  BadgePalette,
  TechnologyBadgePreset,
} from './badgeTypes';

// Slugs and brand colors are pinned from the Simple Icons data published at
// https://unpkg.com/simple-icons@16.27.0/data/simple-icons.json.
// AWS was removed from current Simple Icons releases; its last published
// metadata is pinned from simple-icons@12.4.0/_data/simple-icons.json.
export const technologyBadgePresets = [
  {
    id: 'swift',
    name: 'Swift',
    category: 'language',
    logoSlug: 'swift',
    brandColor: 'F05138',
    homepage: 'https://www.swift.org/',
    defaultLabel: 'language',
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    category: 'language',
    logoSlug: 'typescript',
    brandColor: '3178C6',
    homepage: 'https://www.typescriptlang.org/',
    defaultLabel: 'language',
  },
  {
    id: 'python',
    name: 'Python',
    category: 'language',
    logoSlug: 'python',
    brandColor: '3776AB',
    homepage: 'https://www.python.org/',
    defaultLabel: 'language',
  },
  {
    id: 'react',
    name: 'React',
    category: 'frontend',
    logoSlug: 'react',
    brandColor: '61DAFB',
    homepage: 'https://react.dev/',
    defaultLabel: 'frontend',
  },
  {
    id: 'aws',
    name: 'AWS',
    category: 'cloud',
    logoSlug: 'amazonwebservices',
    brandColor: '232F3E',
    homepage: 'https://aws.amazon.com/',
    defaultLabel: 'cloud',
  },
] as const satisfies readonly TechnologyBadgePreset[];

export const badgePalettes = [
  {
    id: 'brand',
    name: 'Brand',
    description: '회색 라벨과 기술 브랜드 색상을 사용합니다.',
    showLabel: true,
    labelColor: '555555',
    messageColor: { source: 'brand' },
    logoColor: 'white',
  },
  {
    id: 'brand-solid',
    name: 'Brand Solid',
    description: '라벨 없이 기술 브랜드 색상을 사용합니다.',
    showLabel: false,
    messageColor: { source: 'brand' },
    logoColor: 'white',
  },
  {
    id: 'dark',
    name: 'Dark',
    description: '라벨 없이 통일된 어두운 배경을 사용합니다.',
    showLabel: false,
    messageColor: { source: 'fixed', value: '24292F' },
    logoColor: 'white',
  },
] as const satisfies readonly BadgePalette[];
