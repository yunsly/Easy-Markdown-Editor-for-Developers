export type BadgeCategory =
  | 'language'
  | 'frontend'
  | 'backend'
  | 'mobile-xr'
  | 'cloud'
  | 'database'
  | 'tool'
  | 'project';

export type BadgeStyle = 'flat' | 'flat-square' | 'for-the-badge';

export interface TechnologyBadgePreset {
  id: string;
  name: string;
  category: BadgeCategory;
  logoSlug?: string;
  brandColor: string;
  homepage?: string;
  defaultLabel?: string;
}

export type BadgePaletteId = 'brand' | 'brand-solid' | 'dark';

export interface BadgePalette {
  id: BadgePaletteId;
  name: string;
  description: string;
  showLabel: boolean;
  labelColor?: string;
  messageColor:
    | { source: 'brand' }
    | { source: 'fixed'; value: string };
  logoColor: string;
}
