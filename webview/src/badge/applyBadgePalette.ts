import type {
  BadgeDefinition,
  BadgePalette,
  TechnologyBadgePreset,
} from './badgeTypes';

export const applyBadgePalette = (
  technology: TechnologyBadgePreset,
  palette: BadgePalette,
): BadgeDefinition => ({
  message: technology.name,
  messageColor: palette.messageColor.source === 'brand'
    ? technology.brandColor
    : palette.messageColor.value,
  style: 'flat',
  ...(palette.showLabel && technology.defaultLabel !== undefined
    ? { label: technology.defaultLabel }
    : {}),
  ...(palette.showLabel && palette.labelColor !== undefined
    ? { labelColor: palette.labelColor }
    : {}),
  ...(technology.logoSlug === undefined
    ? {}
    : { logo: technology.logoSlug, logoColor: palette.logoColor }),
});
